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
import { runBaselineDiff } from "./lib/baseline";

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
if (artifactUrl) {
  md.push(`📎 [Full validation report + artifacts](${artifactUrl})`);
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

const body = md.join("\n");
writeFileSync(resolve(REPORT_DIR, "pr-comment.md"), body);
process.stdout.write(body + "\n");
