// Composites the REAL Wow mascot PNG (src/assets/wow-mascot.png) onto the
// listed hero images using sharp. Deterministic — no AI redraw, so the mascot
// is pixel-identical to the source asset every time.
//
// Strategy: generate a fresh clean daytime neighborhood background (no mascot)
// via imagegen upstream, save to public/blog-images/<slug>.jpg, then run this
// script to overlay the mascot in the bottom-right at ~28% width.
//
// Run: bun run tsx scripts/apply-real-mascot.ts [slug ...]
// With no args, applies to the DEFAULT_TARGETS list.

import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const MASCOT = resolve("src/assets/wow-mascot.png");
const IMG_DIR = resolve("public/blog-images");

// Recent neighborhood posts whose mascots were AI-drawn — replace with the real one.
const DEFAULT_TARGETS = [
  "queensborough-new-westminster-strata-commercial-snow-removal",
  "fleetwood-surrey-strata-commercial-snow-removal",
  "ladner-delta-strata-commercial-snow-removal",
  "edgemont-village-north-vancouver-strata-commercial-snow-removal",
  "ironwood-richmond-strata-commercial-snow-removal",
  "renfrew-collingwood-vancouver-strata-commercial-snow-removal",
  "big-bend-burnaby-strata-commercial-snow-removal",
  "sperling-duthie-burnaby-strata-commercial-snow-removal",
  "arbutus-ridge-vancouver-strata-commercial-snow-removal",
  "government-road-burnaby-strata-commercial-snow-removal",
  "east-cambie-richmond-strata-commercial-snow-removal",
  "harbour-chines-coquitlam-strata-commercial-snow-removal",
];

async function overlayMascot(imgPath: string) {
  const buf = readFileSync(imgPath);
  const meta = await sharp(buf).metadata();
  const W = meta.width ?? 1600;
  const H = meta.height ?? 900;
  const targetW = Math.round(W * 0.28);
  const mascot = await sharp(MASCOT)
    .resize({ width: targetW })
    .toBuffer();
  const mMeta = await sharp(mascot).metadata();
  const mH = mMeta.height ?? targetW;
  const left = Math.round(W - targetW - W * 0.04);
  const top = Math.round(H - mH - H * 0.05);
  await sharp(buf)
    .composite([{ input: mascot, left, top }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(imgPath + ".tmp");
  // Atomic replace.
  const { renameSync } = await import("node:fs");
  renameSync(imgPath + ".tmp", imgPath);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : DEFAULT_TARGETS;
  let ok = 0, miss = 0;
  for (const slug of targets) {
    const p = resolve(IMG_DIR, `${slug}.jpg`);
    if (!existsSync(p)) {
      console.warn(`✗ missing: ${slug}.jpg`);
      miss++;
      continue;
    }
    await overlayMascot(p);
    console.log(`✓ overlaid real mascot: ${slug}.jpg`);
    ok++;
  }
  console.log(`\n${ok} composited · ${miss} missing`);
}

main().catch((e) => { console.error(e); process.exit(1); });
