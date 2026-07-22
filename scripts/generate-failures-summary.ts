// Combined HTML summary for share-card + mascot verifier failures.
//
// Reads:
//   seo-report/share-cards-report.json         (from verify-share-cards)
//   seo-report/share-card-failures/*/meta.json (per-card artifacts)
//   seo-report/mascot-report.json              (from verify-mascot-presence,
//                                               if the verifier emits it)
//   seo-report/mascot-failures/*                (per-image debug artifacts)
//
// Emits:
//   seo-report/failures-summary.html    single inspectable page for CI
//
// Safe to run when there are no failures — produces a "clean" report.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const REPORT_DIR = resolve("seo-report");
const OUT = join(REPORT_DIR, "failures-summary.html");
const SHARE_DIR = join(REPORT_DIR, "share-card-failures");
const MASCOT_DIR = join(REPORT_DIR, "mascot-failures");
const SHARE_JSON = join(REPORT_DIR, "share-cards-report.json");
const MASCOT_JSON = join(REPORT_DIR, "mascot-report.json");

type Row = { slug: string; kind: "share" | "mascot"; reasons: string[]; images: string[]; meta: Record<string, unknown> };

function readJson(p: string): Record<string, unknown> | null {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function collectDir(kind: "share" | "mascot", dir: string): Row[] {
  if (!existsSync(dir)) return [];
  const rows: Row[] = [];
  for (const slug of readdirSync(dir)) {
    const sub = join(dir, slug);
    if (!statSync(sub).isDirectory()) continue;
    const meta = readJson(join(sub, "meta.json")) || {};
    const images = readdirSync(sub)
      .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
      .map((f) => relative(REPORT_DIR, join(sub, f)));
    const reasons = Array.isArray(meta.reasons) ? (meta.reasons as string[]) : [];
    rows.push({ slug, kind, reasons, images, meta });
  }
  return rows;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderRow(r: Row): string {
  const imgs = r.images.map((src) => `<a href="${esc(src)}" target="_blank"><img loading="lazy" src="${esc(src)}" alt="${esc(r.slug)} debug"/></a>`).join("");
  const reasons = r.reasons.length
    ? `<ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
    : `<p class="muted">No reasons recorded.</p>`;
  return `<article class="row ${r.kind}">
    <header><span class="pill">${r.kind}</span><h3>${esc(r.slug)}</h3></header>
    ${reasons}
    <div class="images">${imgs || `<p class="muted">No debug images.</p>`}</div>
    <details><summary>meta.json</summary><pre>${esc(JSON.stringify(r.meta, null, 2))}</pre></details>
  </article>`;
}

function main() {
  mkdirSync(REPORT_DIR, { recursive: true });
  const shareReport = readJson(SHARE_JSON) || {};
  const mascotReport = readJson(MASCOT_JSON) || {};
  const shareRows = collectDir("share", SHARE_DIR);
  const mascotRows = collectDir("mascot", MASCOT_DIR);
  const total = shareRows.length + mascotRows.length;

  const header = `
    <section class="summary">
      <div class="card"><h2>${shareRows.length}</h2><p>share-card failures</p></div>
      <div class="card"><h2>${mascotRows.length}</h2><p>mascot failures</p></div>
      <div class="card"><h2>${(shareReport.total as number | undefined) ?? "—"}</h2><p>share cards checked</p></div>
      <div class="card"><h2>${(mascotReport.total as number | undefined) ?? "—"}</h2><p>mascot images checked</p></div>
    </section>`;

  const rows = [...shareRows, ...mascotRows].map(renderRow).join("") ||
    `<p class="clean">✓ No failures — all share cards and mascot renders match baseline.</p>`;

  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/><title>PlowWow — share-card &amp; mascot failures</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.5 system-ui, sans-serif; margin: 0; padding: 24px; background: #0b1220; color: #e6edf3; }
  h1 { margin: 0 0 12px; font-size: 22px; }
  .muted { color: #8b98ab; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 12px; margin: 16px 0 24px; }
  .card { background: #111a2c; border: 1px solid #22304a; border-radius: 10px; padding: 12px 14px; }
  .card h2 { margin: 0; font-size: 26px; }
  .card p { margin: 4px 0 0; color: #8b98ab; }
  .row { background: #111a2c; border: 1px solid #22304a; border-radius: 12px; padding: 14px 16px; margin: 12px 0; }
  .row header { display: flex; align-items: center; gap: 10px; }
  .row h3 { margin: 0; font-size: 15px; font-family: ui-monospace, monospace; }
  .pill { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; background: #22304a; padding: 2px 8px; border-radius: 999px; }
  .row.share .pill { background:#3b2f1a; color:#f2c06a; }
  .row.mascot .pill { background:#1a2f3b; color:#6ac6f2; }
  .reasons { margin: 8px 0; padding-left: 18px; }
  .reasons li { color:#f2b6b6; }
  .images { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .images img { max-width: 240px; max-height: 160px; border: 1px solid #22304a; border-radius: 6px; background:#000; }
  details { margin-top: 10px; }
  pre { max-height: 260px; overflow: auto; background:#0b1220; padding: 10px; border-radius: 6px; border:1px solid #22304a; }
  .clean { padding: 24px; background:#0e2116; border:1px solid #1c4a30; color:#b6f2c6; border-radius: 10px; font-size: 16px; }
  .generated { color:#8b98ab; font-size: 12px; margin-top: 24px; }
</style></head><body>
<h1>Share-card &amp; mascot failures</h1>
<p class="muted">${total} failing artifact${total === 1 ? "" : "s"} across share cards and mascot renders. Click a thumbnail to open at full size.</p>
${header}
${rows}
<p class="generated">generated ${new Date().toISOString()} · sources: <code>seo-report/share-cards-report.json</code>, <code>seo-report/mascot-report.json</code></p>
</body></html>`;

  writeFileSync(OUT, html);
  console.log(`✓ failures-summary: ${relative(process.cwd(), OUT)} (${total} failing rows)`);
}

main();
