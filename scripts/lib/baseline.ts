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
  /** For legacyRedirects: newFailures bucketed by locale × page-variant. */
  grouped?: Record<string, Record<string, string[]>>;
};

/** Extract a locale prefix from a path like `/fr/…` or return `en-CA` as default. */
export function localeOf(pathOrUrl: string): string {
  try {
    const p = pathOrUrl.startsWith("http") ? new URL(pathOrUrl).pathname : pathOrUrl;
    const m = /^\/([a-z]{2}(?:-[a-z]{2})?)\//i.exec(p);
    if (m && /^(fr|es|de|zh|ja|pa|hi|en)(-[a-z]{2})?$/i.test(m[1])) return m[1].toLowerCase();
  } catch {}
  return "en-CA";
}

/** Classify a plowwow URL/path into a page variant bucket. */
export function pageVariantOf(pathOrUrl: string): string {
  const p = pathOrUrl.startsWith("http") ? new URL(pathOrUrl).pathname : pathOrUrl;
  if (/-strata-commercial-snow-(removal|plowing)\/?$/.test(p)) return "commercial-blog";
  if (/-snow-removal\/?$/.test(p)) return "neighborhood-blog";
  if (/^\/snow-removal-in-/.test(p)) return "legacy-city-slug";
  if (/^\/blog(\/|$)/.test(p)) return "blog";
  if (/^\/locations(\/|$)/.test(p)) return "locations";
  if (/^\/[a-z-]+\/?$/.test(p)) return "city-hub";
  if (p === "/" || p === "") return "home";
  return "other";
}


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

/** Group legacyRedirects newFailures by locale × page variant for at-a-glance triage. */
function groupLegacyByLocaleVariant(newFailures: string[]): Record<string, Record<string, string[]>> {
  const out: Record<string, Record<string, string[]>> = {};
  for (const key of newFailures) {
    // key format: "source→expected"
    const [source, expected] = key.split("→");
    const target = expected ?? source ?? key;
    const locale = localeOf(target);
    const variant = pageVariantOf(target);
    (out[locale] ??= {})[variant] ??= [];
    out[locale][variant].push(key);
  }
  return out;
}

export type BaselineFilter = { locale?: string; variant?: string };

/** Apply a locale/variant filter to a legacy-redirect diff's newFailures + grouped map. */
function applyFilter(diff: CategoryDiff, filter: BaselineFilter): CategoryDiff {
  if (diff.category !== "legacyRedirects" || (!filter.locale && !filter.variant)) return diff;
  const grouped: Record<string, Record<string, string[]>> = {};
  const kept: string[] = [];
  for (const [loc, variants] of Object.entries(diff.grouped ?? {})) {
    if (filter.locale && loc !== filter.locale) continue;
    for (const [variant, keys] of Object.entries(variants)) {
      if (filter.variant && variant !== filter.variant) continue;
      (grouped[loc] ??= {})[variant] = keys;
      kept.push(...keys);
    }
  }
  return { ...diff, newFailures: kept, grouped };
}

export function runBaselineDiff(filter: BaselineFilter = {}): { diffs: CategoryDiff[]; hasBaseline: boolean; filter: BaselineFilter } {
  const hasBaseline = existsSync(BASELINE_DIR) && readdirSync(BASELINE_DIR).length > 0;
  const legacyDiff = diffCategory(
    "legacyRedirects",
    keysLegacy(readJson(BASELINE_DIR, "legacy-redirects.json")),
    keysLegacy(readJson(REPORT_DIR, "legacy-redirects.json")),
  );
  legacyDiff.grouped = groupLegacyByLocaleVariant(legacyDiff.newFailures);
  const diffs: CategoryDiff[] = [
    applyFilter(legacyDiff, filter),
    diffCategory("hydration", keysHydration(readJson(BASELINE_DIR, "hydration.json")), keysHydration(readJson(REPORT_DIR, "hydration.json"))),
    diffCategory("jsonLd", keysJsonLd(readJson(BASELINE_DIR, "jsonld-preflight.json")), keysJsonLd(readJson(REPORT_DIR, "jsonld-preflight.json"))),
    diffCategory("robots", keysRobots(readJson(BASELINE_DIR, "robots-directives.json")), keysRobots(readJson(REPORT_DIR, "robots-directives.json"))),
  ];
  return { diffs, hasBaseline, filter };
}

/** Read locale/variant filter from CLI flags (`--locale=…`, `--variant=…`) or env (SEO_BASELINE_LOCALE / _VARIANT). */
export function parseFilterFromArgv(argv: string[]): BaselineFilter {
  const get = (name: string): string | undefined => {
    const flag = argv.find((a) => a.startsWith(`--${name}=`));
    if (flag) return flag.split("=").slice(1).join("=") || undefined;
    return undefined;
  };
  return {
    locale: get("locale") ?? process.env.SEO_BASELINE_LOCALE ?? undefined,
    variant: get("variant") ?? process.env.SEO_BASELINE_VARIANT ?? undefined,
  };
}


const BASELINE_FILES = [
  "legacy-redirects.json",
  "hydration.json",
  "jsonld-preflight.json",
  "robots-directives.json",
] as const;

/** Compute what `accept` would change without touching disk. */
export function acceptPreview(): {
  files: { name: string; action: "add" | "replace" | "unchanged" | "missing"; baselineFailures?: number; currentFailures?: number }[];
  diffs: CategoryDiff[];
  hasBaseline: boolean;
} {
  const { diffs, hasBaseline } = runBaselineDiff();
  const files = BASELINE_FILES.map((name) => {
    const src = resolve(REPORT_DIR, name);
    const dst = resolve(BASELINE_DIR, name);
    if (!existsSync(src)) return { name, action: "missing" as const };
    if (!existsSync(dst)) return { name, action: "add" as const };
    const same = readFileSync(src, "utf8") === readFileSync(dst, "utf8");
    return { name, action: same ? ("unchanged" as const) : ("replace" as const) };
  });
  return { files, diffs, hasBaseline };
}

function writePreview(): { totalNew: number; totalResolved: number } {
  const { files, diffs, hasBaseline } = acceptPreview();
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    resolve(REPORT_DIR, "baseline-accept-preview.json"),
    JSON.stringify({ hasBaseline, files, diffs, generatedAt: new Date().toISOString() }, null, 2),
  );
  const md: string[] = [`# Baseline Accept — Preview`, ``];
  md.push(hasBaseline ? `_Existing baseline found — this preview shows what \`accept\` would overwrite._` : `⚠️ No baseline yet — \`accept\` would create one.`);
  md.push(``, `## Files`, ``);
  for (const f of files) md.push(`- \`${f.name}\` → **${f.action}**`);
  md.push(``, `## Category deltas`, ``);
  let totalNew = 0, totalResolved = 0;
  for (const d of diffs) {
    totalNew += d.newFailures.length;
    totalResolved += d.resolved.length;
    md.push(`### ${d.category}`);
    md.push(`- baseline: **${d.baselineFailures}** → current: **${d.currentFailures}** (new: **${d.newFailures.length}**, resolved: **${d.resolved.length}**)`);
    if (d.newFailures.length) {
      md.push(`- Would newly accept:`);
      for (const k of d.newFailures.slice(0, 15)) md.push(`  - \`${k}\``);
    }
    if (d.resolved.length) {
      md.push(`- Would drop from baseline:`);
      for (const k of d.resolved.slice(0, 15)) md.push(`  - \`${k}\``);
    }
    md.push("");
  }
  md.push(`> To apply, run: \`bun run seo:baseline-accept -- --yes\``);
  writeFileSync(resolve(REPORT_DIR, "baseline-accept-preview.md"), md.join("\n"));
  return { totalNew, totalResolved };
}

// CLI: `bun scripts/lib/baseline.ts diff | accept-preview | accept [--yes]`
async function main() {
  const cmd = process.argv[2] ?? "diff";
  const flags = new Set(process.argv.slice(3));

  if (cmd === "accept-preview") {
    const { totalNew, totalResolved } = writePreview();
    console.log(`baseline-accept-preview: ${totalNew} new, ${totalResolved} resolved → seo-report/baseline-accept-preview.{json,md}`);
    return;
  }

  if (cmd === "accept") {
    // Always write the preview so CI/humans see what changed.
    const { totalNew, totalResolved } = writePreview();
    const confirmed = flags.has("--yes") || flags.has("-y") || process.env.SEO_BASELINE_CONFIRM === "1";
    if (!confirmed) {
      console.log(`\nbaseline-accept: preview written (${totalNew} new, ${totalResolved} resolved).`);
      console.log(`Nothing changed on disk. Re-run with \`--yes\` (or SEO_BASELINE_CONFIRM=1) to apply.`);
      console.log(`See: seo-report/baseline-accept-preview.md`);
      return;
    }
    mkdirSync(BASELINE_DIR, { recursive: true });
    let updated = 0;
    for (const f of BASELINE_FILES) {
      const src = resolve(REPORT_DIR, f);
      if (existsSync(src)) { copyFileSync(src, resolve(BASELINE_DIR, f)); updated++; }
    }
    console.log(`✓ baseline updated (${updated} files) at ${BASELINE_DIR}`);
    console.log(`  Preview snapshot kept at seo-report/baseline-accept-preview.md for audit.`);
    return;
  }

  const filter = parseFilterFromArgv(process.argv.slice(3));
  const { diffs, hasBaseline } = runBaselineDiff(filter);
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(resolve(REPORT_DIR, "baseline-diff.json"), JSON.stringify({ hasBaseline, filter, diffs, generatedAt: new Date().toISOString() }, null, 2));

  const md: string[] = [`# SEO Baseline Diff`, ``];
  if (filter.locale || filter.variant) {
    md.push(`_Filter: locale=\`${filter.locale ?? "*"}\` · variant=\`${filter.variant ?? "*"}\`_`, ``);
  }
  if (!hasBaseline) md.push(`⚠️ No baseline present — run \`bun run seo:baseline-accept -- --yes\` after a clean run.`, ``);
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
  console.log(`baseline-diff: ${totalNew} new failure(s) across ${diffs.length} categories${filter.locale || filter.variant ? ` (filtered)` : ""} → seo-report/baseline-diff.{json,md}`);
}

if (import.meta.main) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

