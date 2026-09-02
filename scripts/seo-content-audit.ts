// SEO content audit — scans every neighborhood/city blog markdown file and
// flags thin content, missing property_types coverage, missing "nearby"
// landmarks, and missing/short FAQ sections. Outputs JSON + CSV to
// seo-report/, matching every other validator script's convention.
//
// Run: bun run scripts/seo-content-audit.ts

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const CONTENT_DIR = resolve(process.cwd(), "src/content/legacy/blog");
const OUT_DIR = resolve(process.cwd(), "seo-report");
const MIN_WORDS = 800;
const MIN_FAQS = 3;

type Row = {
  slug: string;
  title: string;
  words: number;
  faqCount: number;
  hasPropertyTypes: boolean;
  hasNearby: boolean;
  hasTerrainNote: boolean;
  issues: string[];
};

const PROPERTY_KEYWORDS = /(strata|townhome|condo|duplex|apartment|retail|commercial|industrial|residential|complex)/i;
const NEARBY_KEYWORDS = /(landmark|corridor|nearby|adjacent|park|school|avenue|street|centre|center)/i;
const TERRAIN_KEYWORDS = /(microclimate|elevation|slope|ridge|hill|shaded|north-facing|freezing[- ]rain|terrain)/i;
const FAQ_HEADING = /^##+\s*(?:faqs?|frequently asked)/im;
const H3 = /^###\s+/gm;

function auditFile(slug: string, raw: string): Row {
  const titleMatch = raw.match(/^Title:\s*(.+)$/m);
  const body = raw.match(/Markdown Content:\s*\n([\s\S]*)$/)?.[1] ?? raw;
  const plain = body.replace(/[#>*_`\[\]()!]/g, " ");
  const words = plain.trim().split(/\s+/).filter(Boolean).length;

  const faqSection = raw.split(FAQ_HEADING)[1] || "";
  const faqCount = (faqSection.match(H3) || []).length;

  const hasPropertyTypes = PROPERTY_KEYWORDS.test(body);
  const hasNearby = NEARBY_KEYWORDS.test(body);
  const hasTerrainNote = TERRAIN_KEYWORDS.test(body);

  const issues: string[] = [];
  if (words < MIN_WORDS) issues.push(`thin content (${words} words)`);
  if (faqCount < MIN_FAQS) issues.push(`only ${faqCount} FAQ entries`);
  if (!hasPropertyTypes) issues.push("missing property_types coverage");
  if (!hasNearby) issues.push("missing nearby landmarks");
  if (!hasTerrainNote) issues.push("missing terrain/microclimate note");

  return {
    slug,
    title: titleMatch?.[1]?.trim() ?? slug,
    words,
    faqCount,
    hasPropertyTypes,
    hasNearby,
    hasTerrainNote,
    issues,
  };
}

function csvEscape(v: string | number | boolean): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  const rows: Row[] = files.map((f) =>
    auditFile(f.replace(/\.md$/, ""), readFileSync(resolve(CONTENT_DIR, f), "utf8")),
  );

  rows.sort((a, b) => b.issues.length - a.issues.length || a.words - b.words);

  const failing = rows.filter((r) => r.issues.length > 0);
  const summary = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    failing: failing.length,
    passing: rows.length - failing.length,
    thresholds: { minWords: MIN_WORDS, minFaqs: MIN_FAQS },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    resolve(OUT_DIR, "seo-content-audit.json"),
    JSON.stringify({ summary, rows }, null, 2),
  );

  const header = [
    "slug",
    "title",
    "words",
    "faqCount",
    "hasPropertyTypes",
    "hasNearby",
    "hasTerrainNote",
    "issues",
  ];
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.slug,
        r.title,
        r.words,
        r.faqCount,
        r.hasPropertyTypes,
        r.hasNearby,
        r.hasTerrainNote,
        r.issues.join("; "),
      ]
        .map(csvEscape)
        .join(","),
    ),
  ].join("\n");
  writeFileSync(resolve(OUT_DIR, "seo-content-audit.csv"), csv);

  console.log(
    `[audit] ${summary.passing}/${summary.total} passing · ${summary.failing} flagged`,
  );
  console.log(`[audit] JSON → seo-report/seo-content-audit.json`);
  console.log(`[audit] CSV  → seo-report/seo-content-audit.csv`);
  if (failing.length) {
    for (const r of failing.slice(0, 10)) {
      console.log(`  · ${r.slug} — ${r.issues.join("; ")}`);
    }
  }
}

main();
