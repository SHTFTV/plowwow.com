// Verifies every rendered blog hero and OG/Twitter share image contains the
// real Wow mascot. On failure, writes debug artifacts to
// seo-report/mascot-failures/<basename>/ containing:
//   - region.png      the extracted bottom-right region from the image
//   - reference.png   the reference mascot at the same normalized size
//   - diff.png        heatmap of per-pixel MAE (red = high deviation)
//   - meta.json       computed MAE, opaque-pixel count, placement rect
//
// Run: bun run tsx scripts/verify-mascot-presence.ts

import sharp from "sharp";
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { MASCOT_PLACEMENT } from "./regenerate-blog-og-mascots";

const MASCOT = resolve("src/assets/wow-mascot.png");
const ROOT = resolve("public/blog-images");
const NEIGHBORHOODS = join(ROOT, "_neighborhoods");
const REPORT_DIR = resolve("seo-report");
const FAIL_DIR = join(REPORT_DIR, "mascot-failures");

const NORM = 96;
const MAE_THRESHOLD = 28;

type Result = {
  file: string;
  mae: number;
  opaquePixels: number;
  pass: boolean;
  rect?: { left: number; top: number; width: number; height: number };
};

async function loadReference() {
  const mascotPng = readFileSync(MASCOT);
  const { data, info } = await sharp(mascotPng)
    .resize(NORM, NORM, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

async function writeDebugArtifacts(
  imgPath: string,
  rect: NonNullable<Result["rect"]>,
  regionRgb: Buffer,
  ref: Awaited<ReturnType<typeof loadReference>>,
  mae: number,
  opaquePixels: number,
) {
  const slug = basename(imgPath).replace(/\.[^.]+$/, "");
  const outDir = join(FAIL_DIR, slug);
  mkdirSync(outDir, { recursive: true });

  // region.png — the extracted rect, upscaled for readability.
  await sharp(regionRgb, { raw: { width: NORM, height: NORM, channels: 3 } })
    .resize(384, 384, { fit: "fill", kernel: "nearest" })
    .png()
    .toFile(join(outDir, "region.png"));

  // reference.png — reference mascot flattened onto white.
  await sharp(ref.data, { raw: { width: NORM, height: NORM, channels: 4 } })
    .flatten({ background: "#ffffff" })
    .resize(384, 384, { fit: "fill", kernel: "nearest" })
    .png()
    .toFile(join(outDir, "reference.png"));

  // diff.png — heatmap; opaque pixels colored by per-pixel MAE
  // (0=green → 255=red), transparent-in-reference pixels rendered dark grey.
  const diff = Buffer.alloc(NORM * NORM * 3);
  for (let i = 0, j = 0, k = 0; i < ref.data.length; i += 4, j += 3, k += 3) {
    const a = ref.data[i + 3];
    if (a < 128) {
      diff[k] = 30; diff[k + 1] = 30; diff[k + 2] = 30;
      continue;
    }
    const d = (
      Math.abs(ref.data[i] - regionRgb[j]) +
      Math.abs(ref.data[i + 1] - regionRgb[j + 1]) +
      Math.abs(ref.data[i + 2] - regionRgb[j + 2])
    ) / 3;
    const t = Math.min(1, d / 96); // saturate at MAE 96 per channel
    diff[k] = Math.round(255 * t);
    diff[k + 1] = Math.round(180 * (1 - t));
    diff[k + 2] = 0;
  }
  await sharp(diff, { raw: { width: NORM, height: NORM, channels: 3 } })
    .resize(384, 384, { fit: "fill", kernel: "nearest" })
    .png()
    .toFile(join(outDir, "diff.png"));

  writeFileSync(
    join(outDir, "meta.json"),
    JSON.stringify({
      file: relative(process.cwd(), imgPath),
      mae: Number(mae.toFixed(2)),
      threshold: MAE_THRESHOLD,
      opaquePixels,
      normalizedSize: NORM,
      extractedRect: rect,
      placement: MASCOT_PLACEMENT,
    }, null, 2),
  );
}

async function checkImage(imgPath: string, ref: Awaited<ReturnType<typeof loadReference>>): Promise<Result> {
  const meta = await sharp(imgPath).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const targetW = Math.round(W * MASCOT_PLACEMENT.widthRatio);
  const refAspect = ref.info.height / ref.info.width;
  const mH = Math.round(targetW * refAspect);
  const left = Math.round(W - targetW - W * MASCOT_PLACEMENT.rightMarginRatio);
  const top = Math.round(H - mH - H * MASCOT_PLACEMENT.bottomMarginRatio);

  const cropW = Math.min(targetW, W - left);
  const cropH = Math.min(mH, H - top);
  if (cropW < 8 || cropH < 8) {
    return { file: imgPath, mae: 999, opaquePixels: 0, pass: false };
  }

  const region = await sharp(imgPath)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(NORM, NORM, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  const refData = ref.data;
  let sum = 0;
  let opaque = 0;
  for (let i = 0, j = 0; i < refData.length; i += 4, j += 3) {
    const a = refData[i + 3];
    if (a < 128) continue;
    opaque++;
    sum += Math.abs(refData[i] - region[j]);
    sum += Math.abs(refData[i + 1] - region[j + 1]);
    sum += Math.abs(refData[i + 2] - region[j + 2]);
  }
  const mae = opaque === 0 ? 999 : sum / (opaque * 3);
  const rect = { left, top, width: cropW, height: cropH };
  const pass = mae <= MAE_THRESHOLD;

  if (!pass) {
    await writeDebugArtifacts(imgPath, rect, region, ref, mae, opaque);
  }
  return { file: imgPath, mae, opaquePixels: opaque, pass, rect };
}

function listJpgs(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".jpg"))
      .map((f) => join(dir, f))
      .filter((p) => statSync(p).isFile());
  } catch { return []; }
}

async function main() {
  // Clear stale per-image debug output from prior runs so the folder only
  // reflects the current failure set.
  try { rmSync(FAIL_DIR, { recursive: true, force: true }); } catch { /* ignore */ }

  const ref = await loadReference();
  const files = [...listJpgs(ROOT), ...listJpgs(NEIGHBORHOODS)];
  const results: Result[] = [];
  for (const f of files) results.push(await checkImage(f, ref));

  const fails = results.filter((r) => !r.pass);
  results.sort((a, b) => b.mae - a.mae);

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "mascot-presence.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      threshold: MAE_THRESHOLD,
      normalizedSize: NORM,
      total: results.length,
      failed: fails.length,
      debugArtifactsDir: fails.length > 0 ? relative(process.cwd(), FAIL_DIR) : null,
      results: results.map((r) => ({ ...r, file: relative(process.cwd(), r.file) })),
    }, null, 2),
  );

  if (fails.length > 0) {
    console.error(`✗ mascot verification failed on ${fails.length}/${results.length} images (threshold MAE ≤ ${MAE_THRESHOLD}):`);
    for (const r of fails.slice(0, 20)) {
      const slug = basename(r.file).replace(/\.[^.]+$/, "");
      console.error(`   ${relative(process.cwd(), r.file)}  MAE=${r.mae.toFixed(1)}  → seo-report/mascot-failures/${slug}/`);
    }
    if (fails.length > 20) console.error(`   ...and ${fails.length - 20} more (see seo-report/mascot-presence.json)`);
    console.error(`\nFix: bun run tsx scripts/regenerate-blog-og-mascots.ts --force`);
    process.exit(1);
  }

  console.log(`✓ real mascot verified on ${results.length} images (max MAE ${results[0]?.mae.toFixed(1) ?? 0} ≤ ${MAE_THRESHOLD})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
