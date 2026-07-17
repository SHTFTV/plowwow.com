// Human-readable HTML validation report.
//
// Reads seo-report/*.json + validation-report.md and emits
// seo-report/validation-report.html — a single self-contained page with:
//   - a top summary (per-category pass/fail counts + build metadata)
//   - collapsible sections for legacy redirects, hydration, JSON-LD, robots,
//     baseline diff, and HTTP cache stats
//   - links to the underlying JSON artifacts
//
// Called by scripts/bundle-repro.ts (staged into the zip) and available
// standalone via `bunx tsx scripts/generate-html-report.ts`.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const REPORT_DIR = resolve("seo-report");
const OUT = resolve(REPORT_DIR, "validation-report.html");

function readJson<T>(name: string): T | null {
  const p = resolve(REPORT_DIR, name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")) as T; } catch { return null; }
}
function readText(name: string): string | null {
  const p = resolve(REPORT_DIR, name);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type LegacyDoc = { total?: number; failed?: number; checks?: { source: string; expected: string; ok: boolean; reason?: string }[] };
type HydrationDoc = { results?: { url: string; issues: string[] }[]; sampledAt?: string; seed?: number };
type JsonLdDoc = { pages?: number; blocks?: number; findings?: { path?: string; url?: string; message: string }[] };
type RobotsDoc = { failures?: string[]; missingSitemaps?: string[]; missingUserAgents?: string[]; blockMisses?: { userAgent: string; missing: string[] }[] };
type BaselineDoc = { hasBaseline: boolean; diffs: { category: string; baselineFailures: number; currentFailures: number; newFailures: string[]; resolved: string[] }[]; filter?: { locale?: string; variant?: string } };

const legacy = readJson<LegacyDoc>("legacy-redirects.json");
const hydration = readJson<HydrationDoc>("hydration.json");
const jsonld = readJson<JsonLdDoc>("jsonld-preflight.json");
const robots = readJson<RobotsDoc>("robots-directives.json");
const baseline = readJson<BaselineDoc>("baseline-diff.json");
const validationMd = readText("validation-report.md");
const meta = readJson<{ git?: { sha?: string; ref?: string }; ci?: { runUrl?: string | null; runId?: string | null }; generatedAt?: string }>("../repro-metadata.json")
  ?? readJson<{ git?: { sha?: string; ref?: string }; ci?: { runUrl?: string | null; runId?: string | null }; generatedAt?: string }>("repro-metadata.json");

const legacyFailed = legacy?.failed ?? (legacy?.checks ?? []).filter((c) => !c.ok).length;
const legacyTotal = legacy?.total ?? (legacy?.checks?.length ?? 0);
const hydrationIssues = hydration?.results?.reduce((n, r) => n + r.issues.length, 0) ?? 0;
const jsonLdFindings = jsonld?.findings?.length ?? 0;
const robotsFailures =
  (robots?.failures?.length ?? 0) +
  (robots?.missingSitemaps?.length ?? 0) +
  (robots?.missingUserAgents?.length ?? 0) +
  (robots?.blockMisses?.reduce((n, b) => n + b.missing.length, 0) ?? 0);

function pill(count: number, okLabel = "passing"): string {
  const cls = count === 0 ? "ok" : "fail";
  const label = count === 0 ? okLabel : `${count} failing`;
  return `<span class="pill ${cls}">${label}</span>`;
}

function tableRows<T>(items: T[], cols: { header: string; get: (t: T) => string }[], limit = 100): string {
  const rows = items.slice(0, limit).map((it) =>
    `<tr>${cols.map((c) => `<td>${esc(c.get(it))}</td>`).join("")}</tr>`,
  ).join("");
  const more = items.length > limit ? `<tr><td colspan="${cols.length}" class="more">…and ${items.length - limit} more</td></tr>` : "";
  return `<table><thead><tr>${cols.map((c) => `<th>${c.header}</th>`).join("")}</tr></thead><tbody>${rows}${more}</tbody></table>`;
}

const legacyFailingChecks = (legacy?.checks ?? []).filter((c) => !c.ok);

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SEO Validation Report</title>
<style>
  :root { color-scheme: light dark; --fg:#0f172a; --muted:#475569; --bg:#f8fafc; --card:#fff; --border:#e2e8f0;
          --ok:#10b981; --fail:#ef4444; --warn:#f59e0b; --link:#2563eb; }
  @media (prefers-color-scheme: dark) {
    :root { --fg:#e2e8f0; --muted:#94a3b8; --bg:#0f172a; --card:#1e293b; --border:#334155; --link:#60a5fa; }
  }
  html,body{background:var(--bg);color:var(--fg);}
  body{font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:0;padding:24px;max-width:1100px;margin-inline:auto;}
  h1{font-size:22px;margin:0 0 4px;} h2{font-size:16px;margin:0 0 12px;}
  .meta{color:var(--muted);font-size:12px;margin-bottom:20px;}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px;}
  .card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px;}
  .card .label{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.04em;}
  .card .value{font-size:22px;font-weight:600;margin-top:4px;}
  details{background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;}
  details > summary{padding:12px 14px;cursor:pointer;font-weight:600;display:flex;justify-content:space-between;align-items:center;gap:8px;list-style:none;}
  details > summary::-webkit-details-marker{display:none;}
  details[open] > summary{border-bottom:1px solid var(--border);}
  details .body{padding:14px;overflow-x:auto;}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;}
  .pill.ok{background:rgba(16,185,129,.15);color:var(--ok);}
  .pill.fail{background:rgba(239,68,68,.15);color:var(--fail);}
  .pill.warn{background:rgba(245,158,11,.15);color:var(--warn);}
  table{border-collapse:collapse;width:100%;font-size:13px;}
  th,td{border-bottom:1px solid var(--border);padding:6px 8px;text-align:left;vertical-align:top;}
  th{background:rgba(148,163,184,.1);font-weight:600;}
  code{background:rgba(148,163,184,.15);padding:1px 6px;border-radius:4px;font-size:12px;}
  .more{color:var(--muted);text-align:center;font-style:italic;}
  a{color:var(--link);}
  pre{background:rgba(148,163,184,.08);padding:12px;border-radius:6px;overflow:auto;font-size:12px;white-space:pre-wrap;}
  .empty{color:var(--muted);font-style:italic;}
</style>
</head>
<body>
<h1>SEO Validation Report</h1>
<div class="meta">
  Generated ${esc(new Date().toISOString())}${meta?.git?.sha ? ` · commit <code>${esc(meta.git.sha.slice(0,7))}</code>` : ""}${meta?.git?.ref ? ` · <code>${esc(meta.git.ref)}</code>` : ""}${meta?.ci?.runUrl ? ` · <a href="${esc(meta.ci.runUrl)}">CI run</a>` : ""}
</div>

<div class="cards">
  <div class="card"><div class="label">Legacy redirects</div><div class="value">${legacyFailed} / ${legacyTotal}</div>${pill(legacyFailed)}</div>
  <div class="card"><div class="label">Hydration issues</div><div class="value">${hydrationIssues}</div>${pill(hydrationIssues)}</div>
  <div class="card"><div class="label">JSON-LD findings</div><div class="value">${jsonLdFindings}</div>${pill(jsonLdFindings)}</div>
  <div class="card"><div class="label">Robots directives</div><div class="value">${robotsFailures}</div>${pill(robotsFailures)}</div>
</div>

<details ${legacyFailingChecks.length ? "open" : ""}>
  <summary>Legacy redirects <span>${pill(legacyFailed)}</span></summary>
  <div class="body">
    ${legacyFailingChecks.length
      ? tableRows(legacyFailingChecks, [
          { header: "Source", get: (c) => c.source },
          { header: "Expected", get: (c) => c.expected },
          { header: "Reason", get: (c) => c.reason ?? "" },
        ])
      : `<p class="empty">All ${legacyTotal} redirects passing.</p>`}
    <p style="margin-top:8px"><a href="./legacy-redirects.json">legacy-redirects.json</a></p>
  </div>
</details>

<details ${hydrationIssues ? "open" : ""}>
  <summary>Hydration <span>${pill(hydrationIssues)}</span></summary>
  <div class="body">
    ${hydration?.seed != null ? `<p class="meta">Seed: <code>${esc(hydration.seed)}</code>${hydration.sampledAt ? ` · sampled ${esc(hydration.sampledAt)}` : ""}</p>` : ""}
    ${hydrationIssues
      ? tableRows(
          (hydration?.results ?? []).flatMap((r) => r.issues.map((issue) => ({ url: r.url, issue }))),
          [
            { header: "URL", get: (r) => r.url },
            { header: "Issue", get: (r) => r.issue },
          ],
        )
      : `<p class="empty">All sampled URLs hydrated cleanly.</p>`}
    <p style="margin-top:8px"><a href="./hydration.json">hydration.json</a> · <a href="./hydration-sample.json">hydration-sample.json</a></p>
  </div>
</details>

<details ${jsonLdFindings ? "open" : ""}>
  <summary>JSON-LD preflight <span>${pill(jsonLdFindings)}</span></summary>
  <div class="body">
    <p class="meta">${esc(jsonld?.pages ?? 0)} page(s), ${esc(jsonld?.blocks ?? 0)} JSON-LD block(s) inspected.</p>
    ${jsonLdFindings
      ? tableRows(jsonld?.findings ?? [], [
          { header: "Route", get: (f) => f.path ?? f.url ?? "?" },
          { header: "Finding", get: (f) => f.message },
        ])
      : `<p class="empty">No structured-data issues.</p>`}
    <p style="margin-top:8px"><a href="./jsonld-preflight.json">jsonld-preflight.json</a></p>
  </div>
</details>

<details ${robotsFailures ? "open" : ""}>
  <summary>Robots directives <span>${pill(robotsFailures)}</span></summary>
  <div class="body">
    ${robotsFailures
      ? `<ul>${[
          ...(robots?.failures ?? []),
          ...(robots?.missingSitemaps ?? []).map((s) => `missing Sitemap: ${s}`),
          ...(robots?.missingUserAgents ?? []).map((s) => `missing User-agent: ${s}`),
          ...(robots?.blockMisses ?? []).flatMap((b) => b.missing.map((m) => `${b.userAgent}: missing "${m}"`)),
        ].map((m) => `<li><code>${esc(m)}</code></li>`).join("")}</ul>`
      : `<p class="empty">robots.txt directives match expected policy.</p>`}
    <p style="margin-top:8px"><a href="./robots-directives.json">robots-directives.json</a></p>
  </div>
</details>

${baseline ? `
<details>
  <summary>Baseline diff <span class="pill ${baseline.diffs.some((d) => d.newFailures.length) ? "fail" : "ok"}">${baseline.hasBaseline ? "vs baseline" : "no baseline"}</span></summary>
  <div class="body">
    ${baseline.filter?.locale || baseline.filter?.variant
      ? `<p class="meta">Filter: locale=<code>${esc(baseline.filter?.locale ?? "*")}</code> · variant=<code>${esc(baseline.filter?.variant ?? "*")}</code></p>`
      : ""}
    ${tableRows(baseline.diffs, [
      { header: "Category", get: (d) => d.category },
      { header: "Baseline", get: (d) => String(d.baselineFailures) },
      { header: "Current", get: (d) => String(d.currentFailures) },
      { header: "New", get: (d) => String(d.newFailures.length) },
      { header: "Resolved", get: (d) => String(d.resolved.length) },
    ])}
    <p style="margin-top:8px"><a href="./baseline-diff.json">baseline-diff.json</a> · <a href="./baseline-diff.md">baseline-diff.md</a></p>
  </div>
</details>` : ""}

${validationMd ? `
<details>
  <summary>Raw validation-report.md</summary>
  <div class="body"><pre>${esc(validationMd)}</pre></div>
</details>` : ""}

</body></html>`;

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(OUT, html);
console.log(`✓ HTML validation report → ${OUT}`);
