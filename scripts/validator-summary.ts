// Compact cross-validator summary for CI.
//
// Reads every seo-report/*.json validator output and emits:
//   1. A short Markdown block on stdout suitable for $GITHUB_STEP_SUMMARY.
//   2. seo-report/pr-comment.md — the PR-comment body that highlights the top
//      failing legacy redirects, JSON-LD schema blocks, robots directives, and
//      hydration OG/Twitter issues, plus a link to the latest full report
//      artifact (GITHUB_SERVER_URL/GITHUB_REPOSITORY/actions/runs/<id>).
//
// Zero deps — safe to run even when validators bailed early.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadThresholds, evaluate, type CategoryOutcome } from "./lib/thresholds";
import { runBaselineDiff, parseFilterFromArgv } from "./lib/baseline";

const REPORT_DIR = resolve("seo-report");
mkdirSync(REPORT_DIR, { recursive: true });
const thresholds = loadThresholds();

function readJson<T>(name: string): T | null {
  const p = resolve(REPORT_DIR, name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")) as T; } catch { return null; }
}

type LegacyDoc = { failed?: number; total?: number; skipped?: boolean; checks?: { source: string; expected: string; ok: boolean; reason?: string }[] };
type HydrationDoc = { failed?: number; sampleSize?: number; seed?: number; seedSource?: string; results?: { url: string; issues: string[] }[] };
type JsonLdDoc = { findings?: { path?: string; url?: string; message: string }[]; pages?: number; blocks?: number };
type RobotsDoc = { failures?: string[]; missingSitemaps?: string[]; missingUserAgents?: string[]; blockMisses?: { userAgent: string; missing: string[] }[] };
type ValidationDoc = { totalIssues?: number; totalRoutes?: number; sections?: { title: string; count: number }[] };

const legacy = readJson<LegacyDoc>("legacy-redirects.json");
const hydration = readJson<HydrationDoc>("hydration.json");
const jsonld = readJson<JsonLdDoc>("../../mnt/documents/jsonld-preflight.json") ?? readJson<JsonLdDoc>("jsonld-preflight.json");
const robots = readJson<RobotsDoc>("robots-directives.json");
const validation = readJson<ValidationDoc>("validation-report.json");

const TOP_N = 5;

function bullet(items: string[]): string {
  return items.length ? items.map((s) => `  - ${s}`).join("\n") : "  - _none_";
}

const legacyFailing = (legacy?.checks ?? []).filter((c) => !c.ok);
const hydrationFailing = (hydration?.results ?? []).filter((r) => r.issues.length);
const jsonldFindings = jsonld?.findings ?? [];
const robotsFailures: string[] = [
  ...(robots?.failures ?? []),
  ...(robots?.missingSitemaps ?? []).map((s) => `missing Sitemap: ${s}`),
  ...(robots?.missingUserAgents ?? []).map((s) => `missing User-agent: ${s}`),
  ...(robots?.blockMisses ?? []).flatMap((b) => b.missing.map((m) => `${b.userAgent}: missing "${m}"`)),
];

const totalFailures =
  (legacy?.failed ?? 0) +
  (hydration?.failed ?? 0) +
  jsonldFindings.length +
  robotsFailures.length +
  (validation?.totalIssues ?? 0);

const runUrl =
  process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
const artifactUrl = runUrl ? `${runUrl}#artifacts` : null;

const md: string[] = [];
md.push(`<!-- validator-summary -->`);
md.push(`## SEO validator summary`);
md.push("");
md.push(
  `- Validation report: ${validation?.totalIssues ?? "?"} issue(s) across **${validation?.totalRoutes ?? "?"}** routes`,
);
md.push(
  `- Legacy redirects: ${legacy?.skipped ? "_skipped_" : `${legacy?.failed ?? 0}/${legacy?.total ?? 0} failing`}`,
);
md.push(
  `- Hydration: ${hydration?.failed ?? 0}/${hydration?.sampleSize ?? 0} failing (seed \`${hydration?.seed ?? "?"}\` / \`${hydration?.seedSource ?? "?"}\`)`,
);
md.push(`- JSON-LD preflight: ${jsonldFindings.length} finding(s) across ${jsonld?.pages ?? "?"} pages / ${jsonld?.blocks ?? "?"} blocks`);
md.push(`- robots.txt directives: ${robotsFailures.length} failure(s)`);
md.push("");
md.push(`**Total failures: ${totalFailures}**`);
md.push("");

// Threshold gating — categories map to counters above.
const outcomes: CategoryOutcome[] = [
  evaluate("legacyRedirects", legacyFailing.length, thresholds),
  evaluate("hydration", hydrationFailing.length, thresholds),
  evaluate("jsonLd", jsonldFindings.length, thresholds),
  evaluate("robots", robotsFailures.length, thresholds),
  evaluate("validation", validation?.totalIssues ?? 0, thresholds),
];
const icon = (s: string) => (s === "fail" ? "❌" : s === "warn" ? "⚠️" : "✅");
md.push(`### Threshold gates`);
for (const o of outcomes) {
  md.push(`- ${icon(o.status)} \`${o.category}\` — ${o.failures} failure(s), threshold ${o.threshold.max} (${o.threshold.severity})`);
}
md.push("");

// Baseline regression — new failures only (baseline suppresses acknowledged issues).
// Filter by --locale=…/--variant=… (or SEO_BASELINE_LOCALE / _VARIANT env vars).
const filter = parseFilterFromArgv(process.argv.slice(2));
const { diffs: baselineDiffs, hasBaseline } = runBaselineDiff(filter);
const totalNewSinceBaseline = baselineDiffs.reduce((n, d) => n + d.newFailures.length, 0);
if (filter.locale || filter.variant) {
  md.push(`_Baseline filter: locale=\`${filter.locale ?? "*"}\` · variant=\`${filter.variant ?? "*"}\`_`, "");
}
md.push(`### Baseline regression`);
if (!hasBaseline) {
  md.push(`- _No baseline present. Run \`bun run seo:baseline-accept -- --yes\` after a clean run._`);
} else {
  md.push(`- **${totalNewSinceBaseline}** new failure(s) since last accepted baseline.`);
  for (const d of baselineDiffs) {
    if (!d.newFailures.length) continue;
    md.push(`  - \`${d.category}\`: ${d.newFailures.length} new`);
    // For legacyRedirects, surface the locale × page-variant grouping so we
    // can immediately see which city/blog URLs regressed.
    if (d.category === "legacyRedirects" && d.grouped) {
      for (const [locale, variants] of Object.entries(d.grouped)) {
        const counts = Object.entries(variants)
          .map(([v, keys]) => `${v}=${keys.length}`)
          .join(", ");
        md.push(`    - _${locale}_: ${counts}`);
        for (const [variant, keys] of Object.entries(variants)) {
          for (const k of keys.slice(0, 3)) md.push(`      - \`${variant}\` · \`${k}\``);
        }
      }
    } else {
      for (const k of d.newFailures.slice(0, 3)) md.push(`    - \`${k}\``);
    }
  }
}
md.push("");

// Plan-regression detail — surface per-category deltas + threshold when
// --fail-on-plan-regression fired (gh-annotations.ts writes this artifact
// unconditionally when the flag is set so the PR comment can render it even
// on a non-zero exit).
type RegressionDoc = {
  labels?: { a: string; b: string };
  triggered?: boolean;
  before?: number;
  after?: number;
  delta?: number;
  deltaPercent?: number;
  threshold?: { kind: "absolute" | "percent"; value: number };
  perCategory?: {
    category: string;
    before: number;
    after: number;
    delta: number;
    deltaPercent: number;
    exceeds: boolean;
  }[];
};
const regression = readJson<RegressionDoc>("annotation-plan-regression.json");
if (regression) {
  const t = regression.threshold;
  const tDesc = t ? (t.kind === "percent" ? `${t.value}%` : `${t.value}`) : "?";
  const pct = typeof regression.deltaPercent === "number" && Number.isFinite(regression.deltaPercent)
    ? `${regression.deltaPercent.toFixed(1)}%`
    : "∞%";
  md.push(`### Plan regression ${regression.triggered ? "❌ triggered" : "✅ within threshold"}`);
  if (regression.labels) md.push(`- Selections: A=\`${regression.labels.a}\` vs B=\`${regression.labels.b}\``);
  md.push(`- Threshold: **${tDesc}** (${t?.kind ?? "absolute"})`);
  md.push(`- totalSkipped: ${regression.before ?? 0} → ${regression.after ?? 0} (Δ ${(regression.delta ?? 0) >= 0 ? "+" : ""}${regression.delta ?? 0}, ${pct})`);
  if (regression.perCategory?.length) {
    md.push(``);
    md.push(`| Category | Before | After | Δ | Δ% | Exceeds |`);
    md.push(`|---|---:|---:|---:|---:|:---:|`);
    // Sort by absolute skipped delta (desc), tie-break by absolute deltaPercent
    // (desc) so the most impactful regressions surface first. Infinity ranks
    // above any finite percentage.
    const sorted = [...regression.perCategory].sort((a, b) => {
      const da = Math.abs(b.delta) - Math.abs(a.delta);
      if (da !== 0) return da;
      const ap = Number.isFinite(a.deltaPercent) ? Math.abs(a.deltaPercent) : Number.POSITIVE_INFINITY;
      const bp = Number.isFinite(b.deltaPercent) ? Math.abs(b.deltaPercent) : Number.POSITIVE_INFINITY;
      return bp - ap;
    });
    for (const c of sorted) {
      const cPct = Number.isFinite(c.deltaPercent) ? `${c.deltaPercent.toFixed(1)}%` : "∞%";
      md.push(`| \`${c.category}\` | ${c.before} | ${c.after} | ${c.delta >= 0 ? "+" : ""}${c.delta} | ${cPct} | ${c.exceeds ? "❌" : "—"} |`);
    }
  }
  md.push("");
}

// Direct artifact links — GitHub Actions serves the run's artifact index at
// #artifacts and individual files are accessible under checks/annotations only
// via download, but linking each report by name still gives reviewers a
// one-click destination for the underlying JSON/MD once the artifact is
// downloaded.
if (artifactUrl) {
  md.push(`### 📎 Artifacts`);
  md.push(`- 🔗 [Full workflow run + artifact index](${artifactUrl})`);
  // Direct links to the two most-requested artifacts. GitHub's artifact index
  // links each uploaded artifact by name — clicking these downloads the zip
  // for the artifact and opens `validation-report.html` / `repro-bundle.zip`
  // without needing to expand the artifact list manually.
  md.push(`- 📄 [validation-report.html](${runUrl}/artifacts) — download the \`validation-report-html\` artifact`);
  md.push(`- 📦 [repro-bundle.zip](${runUrl}/artifacts) — download the \`repro-bundle\` artifact`);
  md.push(`- 📊 [annotation-skipped.json](${runUrl}/artifacts) — download the \`annotation-skipped\` artifact (per-category cap counts)`);
  md.push(`- 🧭 [annotation-plan.json](${runUrl}/artifacts) — download the \`annotation-plan\` artifact (planned vs skipped details + top reasons per category)`);
  md.push(`- 📑 [annotation-plan.csv](${runUrl}/artifacts) — spreadsheet-friendly per-category plan (from \`--plan-format=csv\`)`);
  md.push(`- 🔀 [annotation-plan-diff.json](${runUrl}/artifacts) — plan diff between two locale/variant selections`);
  md.push(`- 📝 [annotation-plan-diff.md](${runUrl}/artifacts) — human-readable plan diff table`);
  md.push(`- 📈 [annotation-plan-diff.csv](${runUrl}/artifacts) — spreadsheet-friendly plan diff (from \`--compare-locale/--compare-variant\`)`);
  md.push(`- 📇 [annotation-plan-summary.json](${runUrl}/artifacts) — compact totals + per-category skipped-reason breakdown`);
  md.push(`- 📊 [annotation-plan-summary.csv](${runUrl}/artifacts) — spreadsheet-friendly plan summary (from \`--plan-summary-format=csv\`)`);
  md.push(`- 🚨 [annotation-plan-regression.json](${runUrl}/artifacts) — per-category regression deltas + threshold (when \`--fail-on-plan-regression\` runs)`);
  md.push(`- 📉 [annotation-plan-regression.csv](${runUrl}/artifacts) — spreadsheet-friendly regression deltas (from \`--plan-regression-format=csv\`)`);
  md.push(`- 🧪 [schema-drift-errors.json](${runUrl}/artifacts) — sample-config schema drift details (from \`--schema-error-report\`)`);
  md.push(`- 🧪 [schema-drift-errors.csv](${runUrl}/artifacts) — spreadsheet-friendly schema drift (from \`--schema-error-report-format=csv\`)`);
  // regression-thresholds.{csv,json} are only written when
  // --print-regression-thresholds-format is enabled; add the links
  // conditionally by consulting the manifest gh-annotations.ts writes.
  try {
    const manifestPath = join("seo-report", "regression-thresholds-artifacts.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        csv?: string; json?: string;
      };
      if (manifest.csv) {
        md.push(`- 🎚️ [regression-thresholds.csv](${runUrl}/artifacts) — per-category minor/major/critical bands (from \`--print-regression-thresholds-format=csv\`)`);
      }
      if (manifest.json) {
        md.push(`- 🎚️ [regression-thresholds.json](${runUrl}/artifacts) — per-category bands + source (from \`--print-regression-thresholds-format=json\`)`);
      }
    }
  } catch { /* non-fatal */ }

  const files: [string, string][] = [
    ["Validation report (MD)", "seo-report/validation-report.md"],
    ["Validation report (JSON)", "seo-report/validation-report.json"],
    ["Legacy redirects", "seo-report/legacy-redirects.md"],
    ["Hydration check", "seo-report/hydration.md"],
    ["Hydration sample (reproducer)", "seo-report/hydration-sample.json"],
    ["JSON-LD preflight", "seo-report/jsonld-preflight.json"],
    ["Robots directives", "seo-report/robots-directives.md"],
    ["Baseline diff", "seo-report/baseline-diff.md"],
    ["Baseline accept preview", "seo-report/baseline-accept-preview.md"],
    ["Threshold outcomes", "seo-report/threshold-outcomes.json"],
    ["HTTP cache stats", "seo-report/http-cache-stats.json"],
  ];
  for (const [label, path] of files) {
    md.push(`- \`${path}\` — ${label}`);
  }
  md.push("");
}


md.push(`### Top failing legacy redirects`);
md.push(
  bullet(
    legacyFailing.slice(0, TOP_N).map((c) => `\`${c.source}\` → expected \`${c.expected}\` — ${c.reason ?? "unknown"}`),
  ),
);
md.push("");
md.push(`### Top failing JSON-LD blocks`);
md.push(
  bullet(
    jsonldFindings.slice(0, TOP_N).map((f) => `\`${f.path ?? f.url ?? "?"}\` — ${f.message}`),
  ),
);
md.push("");
md.push(`### Top failing robots.txt directives`);
md.push(bullet(robotsFailures.slice(0, TOP_N)));
md.push("");
md.push(`### Top failing hydration OG/Twitter issues`);
md.push(
  bullet(
    hydrationFailing.slice(0, TOP_N).flatMap((r) =>
      r.issues.slice(0, 2).map((i) => `\`${new URL(r.url).pathname}\` — ${i}`),
    ).slice(0, TOP_N),
  ),
);
md.push("");

// HTTP cache hit/miss + timing — read from seo-report/http-cache-stats.json
// written by verify-legacy-redirects.ts and other cached validators.
type CacheStatsDoc = { enabled?: boolean; hits?: number; misses?: number; totalMs?: number; savedMs?: number; networkMs?: number; ttlMs?: number };
const cacheStats = readJson<CacheStatsDoc>("http-cache-stats.json");
// Per-validator timing (populated by build-validate.ts when it wraps steps).
type TimingDoc = { steps?: { name: string; ms: number }[]; totalMs?: number };
const timing = readJson<TimingDoc>("timing.json");
md.push(`### HTTP cache & timing`);
if (cacheStats && (cacheStats.hits ?? 0) + (cacheStats.misses ?? 0) > 0) {
  const total = (cacheStats.hits ?? 0) + (cacheStats.misses ?? 0);
  const rate = total ? Math.round(((cacheStats.hits ?? 0) / total) * 100) : 0;
  md.push(`- Cache: **${cacheStats.hits ?? 0}** hit(s) / **${cacheStats.misses ?? 0}** miss(es) — **${rate}%** hit rate${cacheStats.enabled === false ? " _(disabled)_" : ""}`);
  md.push(`- Network: **${cacheStats.networkMs ?? 0}ms** across misses · saved ≈ **${Math.round(cacheStats.savedMs ?? 0)}ms** via hits · total inside cachedFetch: **${cacheStats.totalMs ?? 0}ms**`);
} else {
  md.push(`- Cache: _no cached fetches recorded_ (enable with \`SEO_HTTP_CACHE=1\`)`);
}
if (timing?.steps?.length) {
  md.push(`- Validator step timing:`);
  for (const s of timing.steps.slice(0, 10)) md.push(`  - \`${s.name}\` — ${s.ms}ms`);
  if (typeof timing.totalMs === "number") md.push(`  - **total**: ${timing.totalMs}ms`);
}
md.push("");

// Annotation caps — surface counts of failures that were omitted from the
// GitHub Checks UI so reviewers know when output was trimmed.
type SkipDoc = {
  caps?: { legacy: number; hydration: number; robots: number; jsonLd: number };
  totals?: { legacy: number; hydration: number; robots: number; jsonLd: number };
  skipped?: { legacy: number; hydration: number; robots: number; jsonLd: number };
  emitted?: number;
  failOnSkipped?: { legacy?: number; hydration?: number; robots?: number; jsonLd?: number; total?: number };
  failOnSkippedEnabled?: boolean;
  violations?: { category: string; skipped: number; limit: number }[];
};
const skipDoc = readJson<SkipDoc>("annotation-skipped.json");
if (skipDoc?.skipped) {
  const s = skipDoc.skipped;
  const t = skipDoc.totals ?? { legacy: 0, hydration: 0, robots: 0, jsonLd: 0 };
  const c = skipDoc.caps ?? { legacy: 0, hydration: 0, robots: 0, jsonLd: 0 };
  const totalSkipped = s.legacy + s.hydration + s.robots + s.jsonLd;
  md.push(`### Annotation caps`);
  md.push(`- Emitted **${skipDoc.emitted ?? 0}** annotation(s); **${totalSkipped}** skipped due to per-category caps.`);
  md.push(`  - \`legacy\` — ${t.legacy - s.legacy}/${t.legacy} shown (cap ${c.legacy}, **${s.legacy}** skipped)`);
  md.push(`  - \`hydration\` — ${t.hydration - s.hydration}/${t.hydration} shown (cap ${c.hydration}, **${s.hydration}** skipped)`);
  md.push(`  - \`jsonLd\` — ${t.jsonLd - s.jsonLd}/${t.jsonLd} shown (cap ${c.jsonLd}, **${s.jsonLd}** skipped)`);
  md.push(`  - \`robots\` — ${t.robots - s.robots}/${t.robots} shown (cap ${c.robots}, **${s.robots}** skipped)`);
  if (skipDoc.violations?.length) {
    md.push(`- ❌ **fail-on-skipped** limits exceeded${skipDoc.failOnSkippedEnabled ? "" : " _(reporting only — enable with `--fail-on-skipped`)_"}:`);
    for (const v of skipDoc.violations) {
      md.push(`  - \`${v.category}\` — skipped ${v.skipped} > limit ${v.limit}`);
    }
  }
  md.push("");
}

const body = md.join("\n");
writeFileSync(resolve(REPORT_DIR, "pr-comment.md"), body);
process.stdout.write(body + "\n");

// Persist outcomes so downstream jobs can react without re-parsing markdown.
writeFileSync(
  resolve(REPORT_DIR, "threshold-outcomes.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      outcomes,
      baseline: { hasBaseline, filter, totalNewSinceBaseline, diffs: baselineDiffs },
      cache: cacheStats ?? null,
      timing: timing ?? null,
    },
    null,
    2,
  ),
);

// In baseline-diff mode (SEO_BASELINE_MODE=1), only NEW failures fail the run.
// Otherwise, any category with status="fail" fails the run.
const baselineMode = process.env.SEO_BASELINE_MODE === "1";
const criticalFail = baselineMode
  ? totalNewSinceBaseline > 0
  : outcomes.some((o) => o.status === "fail");
if (criticalFail) {
  console.error(`\n✗ validator-summary: critical thresholds exceeded${baselineMode ? " (baseline-diff mode)" : ""}`);
  process.exit(1);
}

