// Bundles the seo-report/ directory into /mnt/documents/ when that writable
// ChatGPT-style export mount is available. In CI/other environments the
// report remains in seo-report/ and is uploaded by the workflow artifact step.

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, rmSync, accessSync, constants } from "node:fs";
import { resolve, join, relative } from "node:path";
import { execSync } from "node:child_process";

const SRC = resolve("seo-report");
const EXPORT_ROOT = "/mnt/documents";
const DEST_DIR = join(EXPORT_ROOT, "seo-report");
const DEST_ZIP = join(EXPORT_ROOT, "seo-report.zip");

if (!existsSync(SRC)) {
  console.warn(`(publish-seo-report) ${SRC} does not exist — nothing to publish.`);
  process.exit(0);
}

function exportRootWritable(): boolean {
  try {
    accessSync(EXPORT_ROOT, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

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

let published = false;
if (exportRootWritable()) {
  try {
    if (existsSync(DEST_DIR)) rmSync(DEST_DIR, { recursive: true, force: true });
    copyTree(SRC, DEST_DIR);
    published = true;

    try {
      if (existsSync(DEST_ZIP)) rmSync(DEST_ZIP);
      execSync(`cd ${resolve(".")} && zip -qr ${DEST_ZIP} seo-report`, { stdio: "inherit" });
    } catch {
      console.warn("(publish-seo-report) zip unavailable/unwritable — skipping .zip bundle");
    }
  } catch (error) {
    console.warn(`(publish-seo-report) export mount unavailable — keeping reports in ${SRC}.`, error);
    published = false;
  }
} else {
  console.log(`(publish-seo-report) ${EXPORT_ROOT} is not writable — CI will publish ${SRC} as workflow artifacts.`);
}

function readJson<T>(p: string): T | null {
  try { return JSON.parse(readFileSync(p, "utf8")) as T; } catch { return null; }
}

type Row = { name: string; total: number; failed: number; note: string };
const rows: Row[] = [];

const og = readJson<{ total: number; failed: number; critical: number; dimension: number; bySource: { default: number } }>(join(SRC, "blog-og-images.json"));
if (og) rows.push({ name: "Blog OG images", total: og.total, failed: og.failed + og.critical, note: `dim-warn ${og.dimension}, default-fallback ${og.bySource.default}` });

const a11y = readJson<{ scenarios: number; criticalOrSeriousAxe: number; ariaFailures: number }>(join(SRC, "a11y-blog-neighborhoods.json"));
if (a11y) rows.push({ name: "a11y /blog/neighborhoods", total: a11y.scenarios, failed: a11y.criticalOrSeriousAxe + a11y.ariaFailures, note: `axe ${a11y.criticalOrSeriousAxe} · aria ${a11y.ariaFailures}` });

for (const name of readdirSync(SRC)) {
  if (!name.endsWith(".json")) continue;
  if (name === "blog-og-images.json" || name === "a11y-blog-neighborhoods.json") continue;
  const j = readJson<Record<string, unknown>>(join(SRC, name));
  if (!j) continue;
  const failed = Number((j as { failed?: number; violations?: number; errors?: number }).failed ?? (j as { violations?: number }).violations ?? (j as { errors?: number }).errors ?? 0);
  const total = Number((j as { total?: number; checked?: number; count?: number }).total ?? (j as { checked?: number }).checked ?? (j as { count?: number }).count ?? 0);
  if (Number.isFinite(total) && total > 0) rows.push({ name: name.replace(/\.json$/, ""), total, failed, note: "" });
}

const bar = "─".repeat(72);
console.log(`\n${bar}`);
console.log(`SEO validation report — ${published ? `bundled to ${DEST_DIR}` : `available in ${SRC}`}`);
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
  console.log(`  CI artifact source  : ${SRC}`);
  console.log(`  File count          : ${countFiles(SRC)}`);
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

void relative;
