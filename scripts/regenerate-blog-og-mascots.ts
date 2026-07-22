// Deterministically composites the REAL Wow mascot (src/assets/wow-mascot.png)
// onto every blog hero, theme background, and pre-existing neighborhoods OG
// image. Idempotent: re-running overlays the mascot again at the same
// canonical position (bottom-right, 28% width, 4% right / 5% bottom margin).
// This ensures every share card and hero uses the real mascot even if a
// previous generation had an AI-drawn mascot elsewhere in the frame.
//
// Run: bun run tsx scripts/regenerate-blog-og-mascots.ts

import sharp from "sharp";
import { readdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const MASCOT = resolve("src/assets/wow-mascot.png");
const ROOT = resolve("public/blog-images");
const NEIGHBORHOODS = join(ROOT, "_neighborhoods");

// Canonical placement — kept in sync with scripts/apply-real-mascot.ts and
// exported so the verifier uses the exact same rule.
export const MASCOT_PLACEMENT = {
  widthRatio: 0.28,
  rightMarginRatio: 0.04,
  bottomMarginRatio: 0.05,
};

export async function composeMascot(imgPath: string) {
  const buf = readFileSync(imgPath);
  const meta = await sharp(buf).metadata();
  const W = meta.width ?? 1600;
  const H = meta.height ?? 900;
  const targetW = Math.round(W * MASCOT_PLACEMENT.widthRatio);
  const mascot = await sharp(MASCOT).resize({ width: targetW }).toBuffer();
  const mMeta = await sharp(mascot).metadata();
  const mH = mMeta.height ?? targetW;
  const left = Math.round(W - targetW - W * MASCOT_PLACEMENT.rightMarginRatio);
  const top = Math.round(H - mH - H * MASCOT_PLACEMENT.bottomMarginRatio);
  await sharp(buf)
    .composite([{ input: mascot, left, top }])
    .jpeg({ quality: 84, progressive: true, mozjpeg: true })
    .toFile(imgPath + ".tmp");
  renameSync(imgPath + ".tmp", imgPath);
  return { left, top, width: targetW, height: mH, imgW: W, imgH: H };
}

function listJpgs(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".jpg"))
    .map((f) => join(dir, f))
    .filter((p) => statSync(p).isFile());
}

async function main() {
  const heroes = listJpgs(ROOT);
  let neighborhoods: string[] = [];
  try { neighborhoods = listJpgs(NEIGHBORHOODS); } catch { /* dir may not exist yet */ }

  const targets = [...heroes, ...neighborhoods];
  let ok = 0;
  for (const p of targets) {
    await composeMascot(p);
    ok++;
  }
  console.log(`✓ real mascot composited on ${ok} images (${heroes.length} heroes/themes + ${neighborhoods.length} neighborhoods OG)`);
}

// Only run when invoked directly, not when imported by the verifier.
const invokedDirectly = import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
