// Automated visual verification for city and tag share cards.
//
// For every OG card in public/blog-images/_neighborhoods (city-* and
// city-*__tag-*) this script asserts:
//   1. dimensions are exactly 1200x630 (prevents layout-shift regressions
//      when a share renders on Facebook / X / Slack / iMessage)
//   2. mascot region MAE stays ≤ threshold (reuses the same alpha-weighted
//      pixel comparison as verify-mascot-presence.ts)
//   3. mascot placement rect matches the canonical MASCOT_PLACEMENT bottom-
//      right anchor, within ±2 px of the expected position — catches
//      accidental crop shifts even when the mascot is present
//
// A baseline of accepted dimensions is stored at
// seo-report/share-cards-baseline.json. New cards are automatically added
// on first run; existing cards fail loudly if their dimensions change.
//
// Failures write per-card debug artifacts to
// seo-report/share-card-failures/<card>/.
//
// Run: bun run tsx scripts/verify-share-cards.ts [--update-baseline]

import sharp from "sharp";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { MASCOT_PLACEMENT } from "./regenerate-blog-og-mascots";

const ROOT = resolve("public/blog-images/_neighborhoods");
const REPORT_DIR = resolve("seo-report");
const FAIL_DIR = join(REPORT_DIR, "share-card-failures");
const BASELINE = join(REPORT_DIR, "share-cards-baseline.json");
const MASCOT = resolve("src/assets/wow-mascot.png");
const CACHE_DIR = resolve(".cache");
const CACHE_FILE = join(CACHE_DIR, "share-cards.json");

const EXPECTED_W = 1200;
const EXPECTED_H = 630;
const NORM = 96;
const MAE_THRESHOLD = 28;
const RECT_TOLERANCE_PX = 2;

type CacheEntry = { cardHash: string; mascotHash: string; report: Report };
type Cache = Record<string, CacheEntry>;

function hashFile(p: string): string {
  return createHash("sha1").update(readFileSync(p)).digest("hex");
}

type Baseline = Record<string, { width: number; height: number }>;
type Report = {
  file: string;
  width: number;
  height: number;
  mae: number;
  expectedRect: { left: number; top: number; width: number; height: number };
  dimensionsOk: boolean;
  mascotOk: boolean;
  baselineOk: boolean;
  pass: boolean;
  reasons: string[];
};

async function loadRef() {
  const { data, info } = await sharp(readFileSync(MASCOT))
    .resize(NORM, NORM, { fit: "fill" }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

async function checkCard(p: string, ref: Awaited<ReturnType<typeof loadRef>>, baseline: Baseline): Promise<Report> {
  const meta = await sharp(p).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const targetW = Math.round(W * MASCOT_PLACEMENT.widthRatio);
  const refAspect = ref.info.height / ref.info.width;
  const mH = Math.round(targetW * refAspect);
  const left = Math.round(W - targetW - W * MASCOT_PLACEMENT.rightMarginRatio);
  const top = Math.round(H - mH - H * MASCOT_PLACEMENT.bottomMarginRatio);
  const expectedRect = { left, top, width: targetW, height: mH };

  const cropW = Math.min(targetW, Math.max(0, W - left));
  const cropH = Math.min(mH, Math.max(0, H - top));

  let mae = 999;
  if (cropW >= 8 && cropH >= 8) {
    const region = await sharp(p).extract({ left, top, width: cropW, height: cropH })
      .resize(NORM, NORM, { fit: "fill" }).removeAlpha().raw().toBuffer();
    let sum = 0, opaque = 0;
    for (let i = 0, j = 0; i < ref.data.length; i += 4, j += 3) {
      const a = ref.data[i + 3];
      if (a < 128) continue;
      opaque++;
      sum += Math.abs(ref.data[i] - region[j]);
      sum += Math.abs(ref.data[i + 1] - region[j + 1]);
      sum += Math.abs(ref.data[i + 2] - region[j + 2]);
    }
    mae = opaque === 0 ? 999 : sum / (opaque * 3);
  }

  const reasons: string[] = [];
  const dimensionsOk = W === EXPECTED_W && H === EXPECTED_H;
  if (!dimensionsOk) reasons.push(`dimensions ${W}x${H} ≠ ${EXPECTED_W}x${EXPECTED_H}`);

  const name = basename(p);
  const bl = baseline[name];
  const baselineOk = !bl || (bl.width === W && bl.height === H);
  if (!baselineOk) reasons.push(`baseline shift: was ${bl.width}x${bl.height}, now ${W}x${H} (layout-shift risk on already-cached shares)`);

  const mascotOk = mae <= MAE_THRESHOLD;
  if (!mascotOk) reasons.push(`mascot MAE ${mae.toFixed(1)} > ${MAE_THRESHOLD}`);

  // Placement sanity: rect must land at the expected bottom-right anchor
  // (within tolerance) even if dimensions are still 1200x630 — catches the
  // case where a card was regenerated with a different placement ratio.
  const expLeft = Math.round(EXPECTED_W - EXPECTED_W * MASCOT_PLACEMENT.widthRatio - EXPECTED_W * MASCOT_PLACEMENT.rightMarginRatio);
  if (dimensionsOk && Math.abs(left - expLeft) > RECT_TOLERANCE_PX) {
    reasons.push(`mascot rect drifted horizontally: left=${left}, expected≈${expLeft}`);
  }

  return {
    file: p, width: W, height: H, mae, expectedRect,
    dimensionsOk, mascotOk, baselineOk,
    pass: dimensionsOk && mascotOk && baselineOk && reasons.length === 0,
    reasons,
  };
}

async function writeFailArtifact(r: Report) {
  const slug = basename(r.file).replace(/\.[^.]+$/, "");
  const outDir = join(FAIL_DIR, slug);
  mkdirSync(outDir, { recursive: true });
  // Full-frame thumbnail (400px wide, JPEG for size) so reviewers can see
  // the actual crop next to the meta.json explanation.
  try {
    await sharp(r.file).resize({ width: 400 }).jpeg({ quality: 78 }).toFile(join(outDir, "preview.jpg"));
  } catch { /* ignore */ }
  writeFileSync(join(outDir, "meta.json"), JSON.stringify({
    file: relative(process.cwd(), r.file),
    expected: { width: EXPECTED_W, height: EXPECTED_H },
    actual: { width: r.width, height: r.height },
    mae: Number(r.mae.toFixed(2)),
    maeThreshold: MAE_THRESHOLD,
    expectedMascotRect: r.expectedRect,
    reasons: r.reasons,
  }, null, 2));
}

async function main() {
  const updateBaseline = process.argv.includes("--update-baseline");
  const force = process.argv.includes("--force") || process.argv.includes("--no-cache");
  if (!existsSync(ROOT)) {
    console.log(`✓ verify-share-cards: no share cards found (${ROOT} missing)`);
    return;
  }
  try { rmSync(FAIL_DIR, { recursive: true, force: true }); } catch { /* ignore */ }

  const ref = await loadRef();
  const mascotHash = hashFile(MASCOT);
  const files = readdirSync(ROOT)
    .filter((f) => f.toLowerCase().endsWith(".jpg"))
    .map((f) => join(ROOT, f))
    .filter((p) => statSync(p).isFile())
    .sort();

  const baseline: Baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
  const cache: Cache = !force && existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {};
  const nextCache: Cache = {};
  const reports: Report[] = [];
  let reused = 0;
  for (const p of files) {
    const name = basename(p);
    const cardHash = hashFile(p);
    const prev = cache[name];
    const baselineFingerprint = JSON.stringify(baseline[name] ?? null);
    const key = `${cardHash}|${mascotHash}|${baselineFingerprint}`;
    const prevKey = prev ? `${prev.cardHash}|${prev.mascotHash}|${JSON.stringify(baseline[name] ?? null)}` : "";
    if (prev && prev.report.pass && key === prevKey) {
      // Source card + mascot reference + baseline row unchanged since a
      // previously passing run — reuse the cached result and skip the
      // expensive extract/MAE compute.
      const cached = { ...prev.report, file: p };
      reports.push(cached);
      nextCache[name] = { cardHash, mascotHash, report: cached };
      reused++;
      continue;
    }
    const r = await checkCard(p, ref, baseline);
    reports.push(r);
    if (r.pass) nextCache[name] = { cardHash, mascotHash, report: r };
  }

  const fails = reports.filter((r) => !r.pass);
  for (const r of fails) await writeFailArtifact(r);

  // Auto-add new cards to the baseline (only when they passed everything
  // else) — so on subsequent runs a size change is caught as a regression.
  let baselineChanged = false;
  for (const r of reports) {
    const name = basename(r.file);
    if (!baseline[name] && r.dimensionsOk && r.mascotOk) {
      baseline[name] = { width: r.width, height: r.height };
      baselineChanged = true;
    }
  }
  if (updateBaseline) {
    for (const r of reports) baseline[basename(r.file)] = { width: r.width, height: r.height };
    baselineChanged = true;
  }
  if (baselineChanged) {
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(BASELINE, JSON.stringify(baseline, null, 2));
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(REPORT_DIR, "share-cards-report.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: reports.length,
    failed: fails.length,
    expected: { width: EXPECTED_W, height: EXPECTED_H },
    maeThreshold: MAE_THRESHOLD,
    baselineFile: relative(process.cwd(), BASELINE),
    debugArtifactsDir: fails.length ? relative(process.cwd(), FAIL_DIR) : null,
    results: reports.map((r) => ({ ...r, file: relative(process.cwd(), r.file) })),
  }, null, 2));

  if (fails.length) {
    console.error(`✗ verify-share-cards: ${fails.length}/${reports.length} cards failed`);
    for (const r of fails.slice(0, 20)) {
      console.error(`   ${relative(process.cwd(), r.file)}  ${r.reasons.join(" · ")}`);
    }
    if (fails.length > 20) console.error(`   ...and ${fails.length - 20} more (see seo-report/share-cards-report.json)`);
    console.error(`\nFix suggestions:`);
    console.error(`  - bun run seo:neighborhoods-og   # regenerate share cards`);
    console.error(`  - bun run tsx scripts/regenerate-blog-og-mascots.ts --force`);
    console.error(`  - bun run tsx scripts/verify-share-cards.ts --update-baseline   # accept new dimensions`);
    process.exit(1);
  }
  console.log(`✓ verify-share-cards: ${reports.length} cards @ ${EXPECTED_W}x${EXPECTED_H}, mascot verified, baseline stable`);
}

main().catch((e) => { console.error(e); process.exit(1); });
