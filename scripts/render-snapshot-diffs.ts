// Render before / after / side-by-side diff PNGs for every LocalBusiness +
// FAQPage snapshot dumped by scripts/seo-report.ts.
//
// Reads:   seo-report/structured-data-snapshots/<sanitized-path>/{before,after}.json
// Writes:  same dir + before.png, after.png, diff.png, plus index.html
// Also refreshes: seo-report/structured-data-snapshots/index.json manifest.
//
// Safe to run when no snapshots exist — exits 0 with a note. Playwright is
// optional; missing @playwright/test only warns.
import { mkdirSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";

const ROOT = process.cwd();
const SNAP_DIR = resolve(ROOT, "seo-report", "structured-data-snapshots");

if (!existsSync(SNAP_DIR)) {
  console.log(`ℹ ${relative(ROOT, SNAP_DIR)} does not exist — nothing to render.`);
  process.exit(0);
}

const routeDirs = readdirSync(SNAP_DIR)
  .map((n) => resolve(SNAP_DIR, n))
  .filter((p) => {
    try {
      return statSync(p).isDirectory() && existsSync(resolve(p, "before.json")) && existsSync(resolve(p, "after.json"));
    } catch {
      return false;
    }
  });

if (routeDirs.length === 0) {
  console.log(`ℹ no before/after snapshot pairs under ${relative(ROOT, SNAP_DIR)} — nothing to render.`);
  process.exit(0);
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Rudimentary line-level diff. Adds `+` / `-` / ` ` prefixes so the diff PNG
// visually mirrors a `diff -u` block — good enough for reviewers to spot the
// exact field or FAQ entry that changed without spinning up a JSON differ.
function lineDiff(a: string, b: string): string {
  const A = a.split("\n");
  const B = b.split("\n");
  const setB = new Set(B);
  const setA = new Set(A);
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) {
      out.push(`  ${A[i]}`);
      i++;
      j++;
    } else if (j < B.length && !setA.has(B[j])) {
      out.push(`+ ${B[j]}`);
      j++;
    } else if (i < A.length && !setB.has(A[i])) {
      out.push(`- ${A[i]}`);
      i++;
    } else if (i < A.length) {
      out.push(`- ${A[i]}`);
      i++;
    } else {
      out.push(`+ ${B[j]}`);
      j++;
    }
  }
  return out.join("\n");
}

const pageStyle = `
  body { font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; background:#0f172a; color:#e2e8f0; margin:0; padding:20px; }
  h1 { font: 600 18px system-ui; margin:0 0 12px; color:#38bdf8; }
  .meta { color:#94a3b8; font:12px system-ui; margin-bottom:16px; }
  pre { background:#020617; border:1px solid #1e293b; border-radius:8px; padding:14px; white-space:pre-wrap; word-break:break-word; margin:0; }
`;

function payloadHtml(title: string, subtitle: string, json: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title>
<style>${pageStyle}</style></head><body>
<h1>${escape(title)}</h1><div class="meta">${escape(subtitle)}</div>
<pre>${escape(json)}</pre></body></html>`;
}

function diffHtml(path: string, diff: string) {
  const style = `${pageStyle}
    .add  { color:#4ade80; background:rgba(74,222,128,0.08); display:block; }
    .del  { color:#f87171; background:rgba(248,113,113,0.08); display:block; }
    .ctx  { color:#94a3b8; display:block; }
    .legend { color:#94a3b8; font:12px system-ui; margin-bottom:8px; }
  `;
  const body = diff
    .split("\n")
    .map((l) => {
      const cls = l.startsWith("+ ") ? "add" : l.startsWith("- ") ? "del" : "ctx";
      return `<span class="${cls}">${escape(l || " ")}</span>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>diff ${escape(path)}</title>
<style>${style}</style></head><body>
<h1>Structured-data diff · ${escape(path)}</h1>
<div class="legend">Green = added in current baseline · Red = present in previous baseline · Grey = unchanged</div>
<pre>${body}</pre></body></html>`;
}

const manifest: Array<{ path: string; dir: string; before: string; after: string; diff: string }> = [];

(async () => {
  let chromium: any;
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch {
    console.warn("⚠ @playwright/test unavailable — writing HTML diffs only, skipping PNG rendering.");
  }

  const browser = chromium ? await chromium.launch() : null;
  const context = browser
    ? await browser.newContext({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 })
    : null;
  const page = context ? await context.newPage() : null;

  for (const dir of routeDirs) {
    const routePath = "/" + relative(SNAP_DIR, dir).replace(/__/g, "/").replace(/^root$/, "");
    const before = JSON.stringify(JSON.parse(readFileSync(resolve(dir, "before.json"), "utf8")), null, 2);
    const after = JSON.stringify(JSON.parse(readFileSync(resolve(dir, "after.json"), "utf8")), null, 2);
    const diff = lineDiff(before, after);

    const beforeHtmlPath = resolve(dir, "before.html");
    const afterHtmlPath = resolve(dir, "after.html");
    const diffHtmlPath = resolve(dir, "diff.html");
    const beforePng = resolve(dir, "before.png");
    const afterPng = resolve(dir, "after.png");
    const diffPng = resolve(dir, "diff.png");

    writeFileSync(beforeHtmlPath, payloadHtml(`before · ${routePath}`, "Previous baseline structured-data payload", before));
    writeFileSync(afterHtmlPath, payloadHtml(`after · ${routePath}`, "Current structured-data payload", after));
    writeFileSync(diffHtmlPath, diffHtml(routePath, diff));

    if (page) {
      await page.setContent(readFileSync(beforeHtmlPath, "utf8"), { waitUntil: "domcontentloaded" });
      await page.screenshot({ path: beforePng, fullPage: true });
      await page.setContent(readFileSync(afterHtmlPath, "utf8"), { waitUntil: "domcontentloaded" });
      await page.screenshot({ path: afterPng, fullPage: true });
      await page.setContent(readFileSync(diffHtmlPath, "utf8"), { waitUntil: "domcontentloaded" });
      await page.screenshot({ path: diffPng, fullPage: true });
    }

    manifest.push({
      path: routePath,
      dir: relative(ROOT, dir),
      before: relative(ROOT, page ? beforePng : beforeHtmlPath),
      after: relative(ROOT, page ? afterPng : afterHtmlPath),
      diff: relative(ROOT, page ? diffPng : diffHtmlPath),
    });
    console.log(`  · ${routePath} → ${relative(ROOT, dir)}/`);
  }

  if (browser) await browser.close();

  writeFileSync(
    resolve(SNAP_DIR, "index.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: manifest.length, entries: manifest }, null, 2),
  );

  console.log(
    `✓ rendered ${manifest.length} structured-data diff${manifest.length === 1 ? "" : "s"} → ${relative(ROOT, SNAP_DIR)}/`,
  );
})().catch((e) => {
  console.error("✗ render-snapshot-diffs failed:", e);
  process.exit(1);
});
