// Bundles the seo-report/ directory into /mnt/documents/ so the user can
// download the full SEO validation artifacts and prints a compact summary
// of the top-level pass/fail counts to the build log.
//
// Outputs:
//   /mnt/documents/seo-report/            — raw copy of every report file
//   /mnt/documents/seo-report.zip         — zipped bundle for one-click download

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, rmSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { execSync } from "node:child_process";

const SRC = resolve("seo-report");
const DEST_DIR = "/mnt/documents/seo-report";
const DEST_ZIP = "/mnt/documents/seo-report.zip";

if (!existsSync(SRC)) {
  console.warn(`(publish-seo-report) ${SRC} does not exist — nothing to publish.`);
  process.exit(0);
}

// DEST_DIR/DEST_ZIP live under /mnt/documents, a path that only exists in
// certain interactive sandboxes (where a human can browse to it and download
// the bundle) — it is absent on CI runners and on Vercel's build image. This
// step is explicitly documented below as "never fail the build here", so a
// missing/unwritable /mnt/documents is treated the same as a missing `zip`
// binary: warn and skip publishing rather than crashing the build.
let published = false;
try {
  // Ensure clean destination.
  if (existsSync(DEST_DIR)) rmSync(DEST_DIR, { recursive: true, force: true });
  mkdirSync(DEST_DIR, { recursive: true });

  function copyTree(src: string, dst: string) {
    mkdirSync(dst, { recursive: true });
    for (const name of readdirSync(src)) {
      const s = join(src, name);
      const d = join(dst, name);
      const st = statSync(s);
      if (st.isDirectory()) copyTree(s, d);
      else copyFileSync(s, d);
    }
  }
  copyTree(SRC, DEST_DIR);

  // Build zip via system `zip` if available; else fall back to Node.
  try {
    if (existsSync(DEST_ZIP)) rmSync(DEST_ZIP);
    execSync(`cd ${resolve(".")} && zip -qr ${DEST_ZIP} seo-report`, { stdio: "inherit" });
  } catch {
    console.warn("(publish-seo-report) zip binary unavailable — skipping .zip bundle");
  }
  published = true;
} catch (err) {
  console.warn(
    `(publish-seo-report) ${DEST_DIR} is unavailable in this environment (${(err as Error).message}) — skipping downloadable bundle. The full report still lives in ${SRC}.`,
  );
}

// Compact pass/fail table for the build log.
function readJson<T>(p: string): T | null {
  try { return JSON.parse(readFileSync(p, "utf8")) as T; } catch { return null; }
}

type Row = { name: string; total: number; failed: number; note: string };
const rows: Row[] = [];

const og = readJson<{ total: number; failed: number; critical: number; dimension: number; bySource: { default: number } }>(join(SRC, "blog-og-images.json"));
if (og) rows.push({
  name: "Blog OG images",
  total: og.total,
  failed: og.failed + og.critical,
  note: `dim-warn ${og.dimension}, default-fallback ${og.bySource.default}`,
});

const a11y = readJson<{ scenarios: number; criticalOrSeriousAxe: number; ariaFailures: number }>(join(SRC, "a11y-blog-neighborhoods.json"));
if (a11y) rows.push({
  name: "a11y /blog/neighborhoods",
  total: a11y.scenarios,
  failed: a11y.criticalOrSeriousAxe + a11y.ariaFailures,
  note: `axe ${a11y.criticalOrSeriousAxe} · aria ${a11y.ariaFailures}`,
});

// Best-effort pickup for any other summary JSONs in seo-report/.
for (const name of readdirSync(SRC)) {
  if (!name.endsWith(".json")) continue;
  if (name === "blog-og-images.json" || name === "a11y-blog-neighborhoods.json") continue;
  const j = readJson<Record<string, unknown>>(join(SRC, name));
  if (!j) continue;
  const failed = Number(
    (j as { failed?: number; violations?: number; errors?: number }).failed ??
    (j as { violations?: number }).violations ??
    (j as { errors?: number }).errors ?? 0,
  );
  const total = Number((j as { total?: number; checked?: number; count?: number }).total ??
    (j as { checked?: number }).checked ?? (j as { count?: number }).count ?? 0);
  if (Number.isFinite(total) && total > 0) rows.push({ name: name.replace(/\.json$/, ""), total, failed, note: "" });
}

const bar = "─".repeat(72);
console.log(`\n${bar}`);
console.log(`SEO validation report${published ? ` — bundled to ${DEST_DIR}` : ""}`);
console.log(bar);
console.log(`  ${"Report".padEnd(34)}  ${"total".padStart(6)}  ${"failed".padStart(6)}   note`);
console.log(`  ${"".padEnd(34, "-")}  ${"".padStart(6, "-")}  ${"".padStart(6, "-")}   ----`);
for (const r of rows) {
  const marker = r.failed === 0 ? "✓" : "✗";
  console.log(`  ${marker} ${r.name.padEnd(32)}  ${String(r.total).padStart(6)}  ${String(r.failed).padStart(6)}   ${r.note}`);
}
console.log(bar);
if (published) {
  console.log(`  Downloadable bundle : ${DEST_ZIP}`);
  console.log(`  Full directory      : ${DEST_DIR}`);
  console.log(`  File count          : ${countFiles(DEST_DIR)}`);
} else {
  console.log(`  Full report         : ${SRC}`);
}
console.log(bar + "\n");

function countFiles(dir: string): number {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

// Never fail the build here — this is a publish step, not a gate.
void relative;
