// Assert every prerendered page's <html lang="…"> matches the primary locale
// (X_DEFAULT_LOCALE) and appears in the hreflang alternate set. Runs against
// dist/ after the build; writes seo-report/html-lang.{json,md}; exits non-zero
// on any mismatch.
//
// Why: search engines derive page language from the <html lang> attribute and
// cross-check it with hreflang. A drift (e.g. lang="en" vs hreflang="en-CA")
// silently downgrades the locale signal even though every other tag is right.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { SUPPORTED_LOCALES, X_DEFAULT_LOCALE } from "./lib/locales";

const DIST = resolve("dist");
const REPORT_DIR = resolve("seo-report");
const SITEMAP = resolve(DIST, "sitemap.xml");
const EXPECTED_LANG = X_DEFAULT_LOCALE;
const ALLOWED_HREFLANG = new Set<string>([...SUPPORTED_LOCALES, "x-default"]);

function locsFrom(file: string): string[] {
  if (!existsSync(file)) return [];
  const xml = readFileSync(file, "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function collectUrls(): string[] {
  const top = locsFrom(SITEMAP);
  const out: string[] = [];
  for (const u of top) {
    if (u.endsWith(".xml")) {
      const rel = new URL(u).pathname.replace(/^\//, "");
      out.push(...locsFrom(resolve(DIST, rel)));
    } else {
      out.push(u);
    }
  }
  return [...new Set(out)];
}

function urlToFile(url: string): string {
  const pathname = new URL(url).pathname;
  const clean = pathname.replace(/\/+$/, "") || "";
  return clean ? join(DIST, clean, "index.html") : join(DIST, "index.html");
}

type Result = { url: string; lang: string | null; hreflangs: string[]; issues: string[] };

const results: Result[] = [];
for (const url of collectUrls()) {
  const file = urlToFile(url);
  const issues: string[] = [];
  let lang: string | null = null;
  let hreflangs: string[] = [];
  if (!existsSync(file)) {
    issues.push(`missing prerendered file: ${file}`);
  } else {
    const html = readFileSync(file, "utf8");
    const m = html.match(/<html[^>]*\blang="([^"]+)"/i);
    lang = m ? m[1] : null;
    hreflangs = [...html.matchAll(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"/g)].map(
      (x) => x[1],
    );
    if (!lang) issues.push("missing <html lang>");
    else if (lang !== EXPECTED_LANG)
      issues.push(`html lang="${lang}" ≠ expected "${EXPECTED_LANG}"`);
    if (lang && !hreflangs.includes(lang) && lang !== "x-default")
      issues.push(`lang="${lang}" not present in hreflang set (${hreflangs.join(", ")})`);
    for (const h of hreflangs) {
      if (!ALLOWED_HREFLANG.has(h)) issues.push(`unexpected hreflang="${h}"`);
    }
  }
  results.push({ url, lang, hreflangs, issues });
}

const failed = results.filter((r) => r.issues.length);
mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(
  join(REPORT_DIR, "html-lang.json"),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), expectedLang: EXPECTED_LANG, total: results.length, failed: failed.length, results },
    null,
    2,
  ),
);

const md = [
  `# <html lang> ↔ hreflang consistency`,
  ``,
  `_Generated ${new Date().toISOString()}_`,
  ``,
  `- Expected \`<html lang="${EXPECTED_LANG}">\``,
  `- Allowed hreflang: \`${[...ALLOWED_HREFLANG].join(", ")}\``,
  `- URLs checked: **${results.length}**`,
  `- Failed: **${failed.length}**`,
  ``,
];
if (failed.length) {
  md.push(`## Failing routes`, ``);
  for (const r of failed) {
    md.push(`### ${r.url}`);
    for (const i of r.issues) md.push(`- ${i}`);
    md.push(``);
  }
} else md.push(`✅ Every route sets \`<html lang="${EXPECTED_LANG}">\` and it is present in its hreflang set.`);
writeFileSync(join(REPORT_DIR, "html-lang.md"), md.join("\n"));

if (failed.length) {
  console.error(`\n✗ html-lang-validate: ${failed.length}/${results.length} URLs failed`);
  for (const r of failed.slice(0, 20)) console.error(`  · ${r.url}\n      ${r.issues.join("\n      ")}`);
  process.exit(1);
}
console.log(`✓ html-lang-validate: ${results.length}/${results.length} pages match lang="${EXPECTED_LANG}" and hreflang set`);
