// Verifies every rendered blog hero and OG/Twitter share image contains the
// real Wow mascot (src/assets/wow-mascot.png) composited at the canonical
// bottom-right position used by regenerate-blog-og-mascots.ts.
//
// Approach: extract the exact rectangle where the mascot should sit, resize
// both the extracted region and the reference mascot to a normalized size,
// then compute an alpha-weighted mean absolute error over opaque pixels. This
// is robust to JPEG quantization but fails hard when the region is a random
// AI-drawn character, blank sky, or the wrong mascot pose.
//
// Run: bun run tsx scripts/verify-mascot-presence.ts

import sharp from "sharp";
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { MASCOT_PLACEMENT } from "./regenerate-blog-og-mascots";

const MASCOT = resolve("src/assets/wow-mascot.png");
const ROOT = resolve("public/blog-images");
const NEIGHBORHOODS = join(ROOT, "_neighborhoods");
const REPORT_DIR = resolve("seo-report");

// Normalized comparison size. Larger = stricter but slower. 96px keeps this
// fast across ~250 images while still catching pose/color mismatches.
const NORM = 96;
// Alpha-weighted MAE (0-255). Real mascot on any background stays well under
// this even after JPEG re-encoding; AI mascots or missing mascots blow past.
const MAE_THRESHOLD = 28;

type Result = { file: string; mae: number; opaquePixels: number; pass: boolean };

async function loadReference() {
  // Rasterize the mascot at the exact size composited onto a "typical" 1600px
  // hero, then extract RGBA at NORM×NORM. We only need the RGBA values at the
  // normalized grid — the actual mascot geometry (aspect ratio, transparent
  // margins) will match extracted regions because we resize both to the same
  // box using the same fit rules.
  const mascotPng = readFileSync(MASCOT);
  const { data, info } = await sharp(mascotPng)
    .resize(NORM, NORM, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

async function checkImage(imgPath: string, ref: Awaited<ReturnType<typeof loadReference>>): Promise<Result> {
  const meta = await sharp(imgPath).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const targetW = Math.round(W * MASCOT_PLACEMENT.widthRatio);
  // Compute mascot render height using the reference aspect ratio.
  const refAspect = ref.info.height / ref.info.width;
  const mH = Math.round(targetW * refAspect);
  const left = Math.round(W - targetW - W * MASCOT_PLACEMENT.rightMarginRatio);
  const top = Math.round(H - mH - H * MASCOT_PLACEMENT.bottomMarginRatio);

  // Clamp to image bounds (some legacy heroes have odd aspect ratios).
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
  // Reference is RGBA; region is RGB.
  let sum = 0;
  let opaque = 0;
  for (let i = 0, j = 0; i < refData.length; i += 4, j += 3) {
    const a = refData[i + 3];
    if (a < 128) continue; // Only compare opaque mascot pixels.
    opaque++;
    sum += Math.abs(refData[i] - region[j]);
    sum += Math.abs(refData[i + 1] - region[j + 1]);
    sum += Math.abs(refData[i + 2] - region[j + 2]);
  }
  const mae = opaque === 0 ? 999 : sum / (opaque * 3);
  return { file: imgPath, mae, opaquePixels: opaque, pass: mae <= MAE_THRESHOLD };
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
      results: results.map((r) => ({ ...r, file: relative(process.cwd(), r.file) })),
    }, null, 2),
  );

  if (fails.length > 0) {
    console.error(`✗ mascot verification failed on ${fails.length}/${results.length} images (threshold MAE ≤ ${MAE_THRESHOLD}):`);
    for (const r of fails.slice(0, 20)) {
      console.error(`   ${relative(process.cwd(), r.file)}  MAE=${r.mae.toFixed(1)}`);
    }
    if (fails.length > 20) console.error(`   ...and ${fails.length - 20} more (see seo-report/mascot-presence.json)`);
    console.error(`\nFix: bun run tsx scripts/regenerate-blog-og-mascots.ts`);
    process.exit(1);
  }

  console.log(`✓ real mascot verified on ${results.length} images (max MAE ${results[0]?.mae.toFixed(1) ?? 0} ≤ ${MAE_THRESHOLD})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
