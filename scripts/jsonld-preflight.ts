// JSON-LD preflight — parses every prerendered HTML file in dist/, extracts
// <script type="application/ld+json"> blocks, validates JSON syntax and required
// schema.org fields for the types we ship (LocalBusiness/SnowRemovalService,
// BlogPosting, FAQPage, BreadcrumbList, Organization, WebSite).
//
// Exits with code 1 if any page has invalid or incomplete structured data, so
// this can gate a Netlify deploy.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const DIST = resolve(process.cwd(), "dist");
const OUT_DIR = "/mnt/documents";

type Finding = { file: string; type: string; issue: string };

const REQUIRED: Record<string, string[]> = {
  LocalBusiness: ["name", "url", "telephone"],
  SnowRemovalService: ["name", "url", "provider"],
  BlogPosting: ["headline", "datePublished", "author", "publisher", "mainEntityOfPage"],
  Article: ["headline", "author"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  Organization: ["name", "url"],
  WebSite: ["name", "url"],
};

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}

function extractLdBlocks(html: string): string[] {
  const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) out.push(m[1]);
  return out;
}

function typeOf(node: any): string[] {
  const t = node?.["@type"];
  if (!t) return [];
  return Array.isArray(t) ? t.map(String) : [String(t)];
}

function validateNode(node: any, file: string, findings: Finding[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => validateNode(n, file, findings));
    return;
  }
  if (node["@graph"]) {
    (node["@graph"] as any[]).forEach((n) => validateNode(n, file, findings));
  }
  const types = typeOf(node);
  for (const t of types) {
    const required = REQUIRED[t];
    if (!required) continue;
    for (const key of required) {
      if (node[key] === undefined || node[key] === null || node[key] === "") {
        findings.push({ file, type: t, issue: `missing required "${key}"` });
      }
    }
  }
}

function main() {
  if (!existsSync(DIST)) {
    console.error(`[preflight] dist/ not found — run \`bun run build\` first.`);
    process.exit(2);
  }
  const files = walk(DIST);
  const findings: Finding[] = [];
  let blocks = 0;

  for (const file of files) {
    const rel = file.replace(DIST + "/", "");
    const html = readFileSync(file, "utf8");
    const raws = extractLdBlocks(html);
    for (const raw of raws) {
      blocks++;
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        findings.push({ file: rel, type: "?", issue: `invalid JSON: ${(err as Error).message}` });
        continue;
      }
      validateNode(parsed, rel, findings);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    resolve(OUT_DIR, "jsonld-preflight.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), pages: files.length, blocks, findings }, null, 2),
  );

  console.log(
    `[preflight] scanned ${files.length} pages · ${blocks} JSON-LD blocks · ${findings.length} findings`,
  );
  for (const f of findings.slice(0, 25)) {
    console.log(`  · ${f.file} [${f.type}] ${f.issue}`);
  }
  if (findings.length > 25) console.log(`  · …and ${findings.length - 25} more (see report).`);
  process.exit(findings.length > 0 ? 1 : 0);
}

main();
