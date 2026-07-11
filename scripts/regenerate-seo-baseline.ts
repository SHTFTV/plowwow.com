// CLI: regenerate the structured-data baseline and render PNG screenshots
// of every route's LocalBusiness + FAQPage payload so intentional diffs are
// easy to review.
//
// Usage:
//   bun run seo:baseline               # writes seo-baseline/seo-report.json
//                                      # + seo-baseline/screenshots/*.png
//   bun run seo:baseline -- --no-shots # JSON only, skip Playwright screenshots
//
// After running, commit the updated seo-baseline/ files (and, if the changes
// were expected, add the affected paths to seo-baseline-allow.json so CI
// stops flagging them).

import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const REPORT_DIR = resolve(ROOT, "seo-report");
const BASELINE_DIR = resolve(ROOT, "seo-baseline");
const SNAP_DIR = resolve(REPORT_DIR, "structured-data-snapshots");
const SHOTS_DIR = resolve(BASELINE_DIR, "screenshots");

const skipShots = process.argv.includes("--no-shots");

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
}

// 1. Regenerate the current report (no diff — we're establishing a new baseline).
rmSync(REPORT_DIR, { recursive: true, force: true });
run("bunx", ["tsx", "scripts/seo-report.ts"], {
  // Explicitly clear baseline + violation flags — this run defines the baseline.
  SEO_REPORT_BASELINE: "",
  SEO_STRUCTURED_ALLOWLIST: "",
  SEO_FAIL_ON_STRUCTURED_DIFF: "0",
});

// 2. Promote the fresh report into seo-baseline/.
mkdirSync(BASELINE_DIR, { recursive: true });
const src = resolve(REPORT_DIR, "seo-report.json");
if (!existsSync(src)) {
  console.error(`✗ seo-report.json missing at ${src} — cannot promote baseline.`);
  process.exit(2);
}
copyFileSync(src, resolve(BASELINE_DIR, "seo-report.json"));
console.log(`✓ baseline JSON → seo-baseline/seo-report.json`);

// 3. Render PNG screenshots of every LocalBusiness + FAQPage payload.
if (skipShots) {
  console.log("ℹ --no-shots — skipping Playwright screenshots.");
  process.exit(0);
}

type Row = {
  path: string;
  kind: string;
  structuredData?: {
    localBusiness?: Record<string, unknown>;
    faqPage?: { questionCount: number; entries: Array<{ q: string; a: string }> };
  };
};

const report = JSON.parse(readFileSync(src, "utf8")) as { rows: Row[] };
const cityRows = report.rows.filter(
  (r) => r.kind === "city" && r.structuredData && (r.structuredData.localBusiness || r.structuredData.faqPage),
);

if (cityRows.length === 0) {
  console.log("ℹ no city rows with structured data — nothing to screenshot.");
  process.exit(0);
}

mkdirSync(SHOTS_DIR, { recursive: true });

const sanitize = (p: string) => (p === "/" ? "root" : p.replace(/^\//, "").replace(/\//g, "__"));

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderHtml(row: Row) {
  const lb = row.structuredData?.localBusiness ?? null;
  const faq = row.structuredData?.faqPage ?? null;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escape(row.path)}</title>
<style>
  body { font: 14px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; background:#0f172a; color:#e2e8f0; margin:0; padding:24px; }
  h1 { font: 600 20px system-ui; margin:0 0 4px; color:#38bdf8; }
  h2 { font: 600 14px system-ui; margin:20px 0 8px; color:#a5b4fc; text-transform:uppercase; letter-spacing:.05em; }
  pre { background:#020617; border:1px solid #1e293b; border-radius:8px; padding:16px; white-space:pre-wrap; word-break:break-word; }
  .meta { color:#94a3b8; font: 12px system-ui; margin-bottom:16px; }
</style></head>
<body>
  <h1>${escape(row.path)}</h1>
  <div class="meta">Structured data baseline · ${new Date().toISOString()}</div>
  ${lb ? `<h2>LocalBusiness</h2><pre>${escape(JSON.stringify(lb, null, 2))}</pre>` : ""}
  ${faq ? `<h2>FAQPage (${faq.questionCount} Q&amp;A)</h2><pre>${escape(JSON.stringify(faq.entries, null, 2))}</pre>` : ""}
</body></html>`;
}

(async () => {
  let chromium: any;
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch {
    console.warn("⚠ @playwright/test unavailable — skipping screenshots. Install it or pass --no-shots.");
    process.exit(0);
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  for (const row of cityRows) {
    const html = renderHtml(row);
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const out = resolve(SHOTS_DIR, `${sanitize(row.path)}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`  · ${row.path} → ${out.replace(ROOT + "/", "")}`);
  }

  await browser.close();

  // Manifest so reviewers can quickly see what got shot.
  writeFileSync(
    resolve(SHOTS_DIR, "index.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), count: cityRows.length, paths: cityRows.map((r) => r.path) },
      null,
      2,
    ),
  );

  console.log(`✓ ${cityRows.length} screenshot(s) → seo-baseline/screenshots/`);
  console.log(`✓ snapshots (before/after/changes) live under seo-report/structured-data-snapshots/`);
  // Keep the snapshots dir around for reviewer inspection.
  if (existsSync(SNAP_DIR)) console.log(`  (see ${SNAP_DIR.replace(ROOT + "/", "")}/)`);
})();
