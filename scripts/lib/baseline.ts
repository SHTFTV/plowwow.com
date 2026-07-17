// Baseline regression mode.
//
// Loads the last successful seo-report snapshot from `seo-report/baseline/` and
// diffs it against the current run. Surfaces ONLY newly failing legacy
// redirects, robots directives, JSON-LD schema blocks, or hydration OG/Twitter
// checks — issues already present in the baseline are considered acknowledged.
//
// Refresh baseline by copying seo-report/*.json into seo-report/baseline/ from
// a known-good main-branch run (or `bun run seo:baseline:accept`).

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const BASELINE_DIR = resolve("seo-report/baseline");
const REPORT_DIR = resolve("seo-report");

export type CategoryDiff = {
  category: string;
  baselineFailures: number;
  currentFailures: number;
  newFailures: string[]; // stable keys unique to current run
  resolved: string[];     // keys present in baseline but no longer failing
};

function readJson<T>(dir: string, name: string): T | null {
  const p = resolve(dir, name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")) as T; } catch { return null; }
}

type LegacyDoc = { checks?: { source: string; expected: string; ok: boolean; reason?: string }[] };
type HydrationDoc = { results?: { url: string; issues: string[] }[] };
type JsonLdDoc = { findings?: { path?: string; url?: string; message: string }[] };
type RobotsDoc = {
  failures?: string[];
  missingSitemaps?: string[];
  missingUserAgents?: string[];
  blockMisses?: { userAgent: string; missing: string[] }[];
};

function keysLegacy(d: LegacyDoc | null): string[] {
  return (d?.checks ?? []).filter((c) => !c.ok).map((c) => `${c.source}→${c.expected}`);
}
function keysHydration(d: HydrationDoc | null): string[] {
  return (d?.results ?? []).flatMap((r) => r.issues.map((i) => `${r.url}::${i}`));
}
function keysJsonLd(d: JsonLdDoc | null): string[] {
  return (d?.findings ?? []).map((f) => `${f.path ?? f.url ?? "?"}::${f.message}`);
}
function keysRobots(d: RobotsDoc | null): string[] {
  return [
    ...(d?.failures ?? []),
    ...(d?.missingSitemaps ?? []).map((s) => `sitemap:${s}`),
    ...(d?.missingUserAgents ?? []).map((s) => `ua:${s}`),
    ...(d?.blockMisses ?? []).flatMap((b) => b.missing.map((m) => `${b.userAgent}:${m}`)),
  ];
}

function diffCategory(category: string, base: string[], curr: string[]): CategoryDiff {
  const baseSet = new Set(base);
  const currSet = new Set(curr);
  return {
    category,
    baselineFailures: base.length,
    currentFailures: curr.length,
    newFailures: curr.filter((k) => !baseSet.has(k)),
    resolved: base.filter((k) => !currSet.has(k)),
  };
}

export function runBaselineDiff(): { diffs: CategoryDiff[]; hasBaseline: boolean } {
  const hasBaseline = existsSync(BASELINE_DIR) && readdirSync(BASELINE_DIR).length > 0;
  const diffs: CategoryDiff[] = [
    diffCategory("legacyRedirects", keysLegacy(readJson(BASELINE_DIR, "legacy-redirects.json")), keysLegacy(readJson(REPORT_DIR, "legacy-redirects.json"))),
    diffCategory("hydration", keysHydration(readJson(BASELINE_DIR, "hydration.json")), keysHydration(readJson(REPORT_DIR, "hydration.json"))),
    diffCategory("jsonLd", keysJsonLd(readJson(BASELINE_DIR, "jsonld-preflight.json")), keysJsonLd(readJson(REPORT_DIR, "jsonld-preflight.json"))),
    diffCategory("robots", keysRobots(readJson(BASELINE_DIR, "robots-directives.json")), keysRobots(readJson(REPORT_DIR, "robots-directives.json"))),
  ];
  return { diffs, hasBaseline };
}

// CLI: `bun scripts/lib/baseline.ts diff` | `accept`
async function main() {
  const cmd = process.argv[2] ?? "diff";
  if (cmd === "accept") {
    mkdirSync(BASELINE_DIR, { recursive: true });
    for (const f of ["legacy-redirects.json", "hydration.json", "jsonld-preflight.json", "robots-directives.json"]) {
      const src = resolve(REPORT_DIR, f);
      if (existsSync(src)) copyFileSync(src, resolve(BASELINE_DIR, f));
    }
    console.log(`✓ baseline updated at ${BASELINE_DIR}`);
    return;
  }
  const { diffs, hasBaseline } = runBaselineDiff();
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(resolve(REPORT_DIR, "baseline-diff.json"), JSON.stringify({ hasBaseline, diffs, generatedAt: new Date().toISOString() }, null, 2));

  const md: string[] = [`# SEO Baseline Diff`, ``];
  if (!hasBaseline) md.push(`⚠️ No baseline present — run \`bun scripts/lib/baseline.ts accept\` after a clean run.`, ``);
  for (const d of diffs) {
    md.push(`## ${d.category}`);
    md.push(`- baseline: **${d.baselineFailures}**, current: **${d.currentFailures}**, new: **${d.newFailures.length}**, resolved: **${d.resolved.length}**`);
    if (d.newFailures.length) {
      md.push(`- New failures:`);
      for (const k of d.newFailures.slice(0, 10)) md.push(`  - \`${k}\``);
    }
    md.push("");
  }
  writeFileSync(resolve(REPORT_DIR, "baseline-diff.md"), md.join("\n"));
  const totalNew = diffs.reduce((n, d) => n + d.newFailures.length, 0);
  console.log(`baseline-diff: ${totalNew} new failure(s) across ${diffs.length} categories → seo-report/baseline-diff.{json,md}`);
}

if (import.meta.main) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
