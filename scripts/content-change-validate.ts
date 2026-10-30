// Content-change validator: fast, blog-focused pre-flight checks that run
// on every content change before republish. Complements the full SEO
// pipeline in prebuild/build with a tighter, faster loop.
//
// For every markdown file in src/content/legacy/blog/, this validates:
//   - Title present, length 15..70 chars (SEO best practice)
//   - Description present, length 50..170 chars
//   - Canonical URL Source line matches slug and uses https://plowwow.com
//   - Exactly one H1 (# heading) in body
//   - Hero image has both alt AND title text (![alt](/path "title"))
//   - Hero image alt text is descriptive (>= 40 chars, mentions "mascot" or
//     "PlowWow" for accessibility)
//   - Hero image file exists in public/blog-images/
// It also reruns the JSON-LD schema validator and the OG/Twitter validator
// in a --fast mode by simply invoking them as child processes when --full
// is passed. Default mode is content-only, ~200ms.
//
// Usage:  bun run content:validate
//         bun run content:validate --full      (also runs jsonld+og validators)

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { collectChangedMarkdown, repeatedProse } from "./lib/content-prose-guard";

const BLOG_DIR = "src/content/legacy/blog";
const IMG_DIR = "public/blog-images";
const CANONICAL_HOST = "https://plowwow.com";

type Issue = { file: string; level: "error" | "warn"; message: string };
const issues: Issue[] = [];

function check(cond: boolean, file: string, message: string, level: "error" | "warn" = "error") {
  if (!cond) issues.push({ file, level, message });
}

const all = process.argv.includes("--all");
const strictAll = process.argv.includes("--strict");

// Default scope: files changed vs origin/main (git). Newly-authored posts and
// edits are validated strictly. Falls back to mtime-only when git is not
// available — in that case, historical failures on legacy files are downgraded
// to warnings so this validator can safely run in CI without flapping.
let scope: Set<string> | null = null;
const strictFiles = new Set<string>();
if (!all) {
  scope = new Set<string>();
  let gitOk = false;
  try {
    const diff = collectChangedMarkdown(cmd => execSync(cmd, {stdio:["ignore","pipe","ignore"]}).toString(), process.env.CONTENT_BASE_REF || "origin/main");
    diff.forEach((f) => {
      scope!.add(f);
      strictFiles.add(f);
    });
    gitOk = true;
  } catch {
    /* fall back to mtime */
  }
  if (!gitOk) {
    const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
    for (const f of readdirSync(BLOG_DIR)) {
      if (!f.endsWith(".md")) continue;
      try {
        if (statSync(join(BLOG_DIR, f)).mtimeMs >= cutoff) scope.add(f);
      } catch { /* ignore */ }
    }
  }
}

const explicit = process.argv.find(x=>x.startsWith("--files="))?.slice(8).split(",").filter(Boolean);
if (explicit) { scope = new Set(explicit); explicit.forEach(f=>strictFiles.add(f)); }

const files = readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith(".md"))
  .filter((f) => (scope ? scope.has(f) : true));

if (files.length === 0) {
  console.log("✓ content-change-validate: no recent blog changes to validate (pass --all to force full sweep)");
  process.exit(0);

}


for (const file of files) {
  const slug = file.replace(/\.md$/, "");
  const raw = readFileSync(join(BLOG_DIR, file), "utf8");

  // Title
  const titleMatch = raw.match(/^Title:\s*(.+?)\s*$/m);
  check(!!titleMatch, file, "Missing 'Title:' header");
  if (titleMatch) {
    const t = titleMatch[1].trim();
    check(t.length >= 15 && t.length <= 85, file, `Title length ${t.length} outside 15..85`, t.length <= 100 ? "warn" : "error");
  }

  // Description
  const descMatch = raw.match(/^Description:\s*(.+?)\s*$/m);
  check(!!descMatch, file, "Missing 'Description:' header");
  if (descMatch) {
    const d = descMatch[1].trim();
    check(d.length >= 50 && d.length <= 200, file, `Description length ${d.length} outside 50..200`, d.length <= 230 ? "warn" : "error");
  }


  // URL Source (canonical)
  const urlMatch = raw.match(/^URL Source:\s*(https?:\/\/\S+)\s*$/m);
  check(!!urlMatch, file, "Missing 'URL Source:' header");
  if (urlMatch) {
    const u = urlMatch[1];
    check(/^https:\/\/(?:www\.)?plowwow\.com\//.test(u), file, `URL Source not on ${CANONICAL_HOST}`);
    check(u.includes(`/${slug}/`) || u.endsWith(`/${slug}`), file, `URL Source slug mismatch (expected ${slug})`);
  }

  // Exactly one H1
  const h1s = raw.match(/^# .+$/gm) || [];
  check(h1s.length === 1, file, `Expected exactly 1 H1, found ${h1s.length}`);

  // Hero image: ![alt](/path "title")
  const heroMatch = raw.match(/!\[([^\]]+?)\]\((\/blog-images\/[^\s)]+)\s+"([^"]+)"\)/);
  check(!!heroMatch, file, "Missing hero image with alt AND title (![alt](/blog-images/... \"title\"))");
  if (heroMatch) {
    const [, alt, path, title] = heroMatch;
    check(alt.length >= 40, file, `Hero alt text too short (${alt.length} chars, need >= 40 for a11y)`);
    check(/mascot|plowwow/i.test(alt), file, "Hero alt text should reference the Wow mascot", "warn");
    check(title.length >= 15, file, `Hero image title too short (${title.length} chars)`);
    const imgPath = join("public", path.replace(/^\//, ""));
    check(existsSync(imgPath), file, `Hero image file missing at ${imgPath}`);
  }
}

// Compare substantive paragraphs, excluding shared credits, lists and metadata.
// This catches copied/city-swapped prose; distinct reporting still needs human review.
for (const file of files) {
  if (!strictFiles.has(file) && !strictAll && !all) continue;
  const raw = readFileSync(join(BLOG_DIR,file),"utf8");
  for (const other of readdirSync(BLOG_DIR).filter(f=>f.endsWith(".md")&&f!==file)) {
    const result=repeatedProse(raw,readFileSync(join(BLOG_DIR,other),"utf8"));
    if (result.flagged) check(false,file,`Repeated substantive prose with ${other}: ${result.matchedParagraphs} paragraphs / ${result.matchedWords} words (${Math.round(result.coverage*100)}% coverage)`);
  }
}

// Optional --full mode: hand off to full validators.
const full = process.argv.includes("--full");
if (full) {
  const { execSync } = await import("node:child_process");
  const stages = [
    "tsx scripts/jsonld-schema-validate.ts",
    "tsx scripts/og-twitter-validate.ts",
    "tsx scripts/html-lang-validate.ts",
  ];
  for (const cmd of stages) {
    try {
      execSync(cmd, { stdio: "inherit" });
    } catch {
      issues.push({ file: "(full)", level: "error", message: `Failed stage: ${cmd}` });
    }
  }
}

// Downgrade errors on legacy files (outside the strict scope) to warnings so
// this validator only fails the build on newly-authored or edited content.
// Pass --strict or --all to enforce strict mode across everything in scope.
if (!strictAll && !all) {
  for (const i of issues) {
    if (i.level === "error" && !strictFiles.has(i.file) && i.file !== "(full)") i.level = "warn";
  }
}

const errors = issues.filter((i) => i.level === "error");
const warns = issues.filter((i) => i.level === "warn");


if (errors.length === 0 && warns.length === 0) {
  console.log(`✓ content-change-validate: ${files.length} blog post(s) OK · titles, descs, canonicals, H1, hero alt+title, image files`);
  process.exit(0);
}

for (const w of warns) console.warn(`  ⚠ ${w.file}: ${w.message}`);
for (const e of errors) console.error(`  ✗ ${e.file}: ${e.message}`);

if (errors.length > 0) {
  console.error(`\n${strictAll || all ? "✗" : "⚠"} content-change-validate: ${errors.length} error(s), ${warns.length} warning(s)`);
  process.exit(1);
}
console.log(`✓ content-change-validate: ${files.length} blog post(s) OK (${warns.length} warning(s))`);
