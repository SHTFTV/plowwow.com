// Deterministically composites the REAL Wow mascot (src/assets/wow-mascot.png)
// onto every blog hero, theme background, and pre-existing neighborhoods OG
// image at the canonical position (bottom-right, 28% width, 4% right / 5%
// bottom margin).
//
// Incremental: keeps a manifest at .cache/mascot-og.json mapping each output
// path to a fingerprint (mascot mtime + placement + image content hash). On
// re-runs, only images whose fingerprint changed are recomposed. Pass
// `--force` to rebuild all.
//
// Run: bun run tsx scripts/regenerate-blog-og-mascots.ts [--force]

import sharp from "sharp";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const MASCOT = resolve("src/assets/wow-mascot.png");
const ROOT = resolve("public/blog-images");
const NEIGHBORHOODS = join(ROOT, "_neighborhoods");
const CACHE_DIR = resolve(".cache");
const CACHE_FILE = join(CACHE_DIR, "mascot-og.json");

export const MASCOT_PLACEMENT = {
  widthRatio: 0.28,
  rightMarginRatio: 0.04,
  bottomMarginRatio: 0.05,
};

const PLACEMENT_KEY = `w${MASCOT_PLACEMENT.widthRatio}-r${MASCOT_PLACEMENT.rightMarginRatio}-b${MASCOT_PLACEMENT.bottomMarginRatio}`;

type Manifest = Record<string, string>;

function loadManifest(): Manifest {
  try { return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as Manifest; } catch { return {}; }
}
function saveManifest(m: Manifest) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(m, null, 2));
}

function hashFile(p: string): string {
  const buf = readFileSync(p);
  return createHash("sha1").update(buf).digest("hex").slice(0, 16);
}

// Fingerprint = mascot file hash + placement + current image bytes hash.
// A recompose changes the image bytes, so we hash BEFORE composing and store
// that key; next run re-hashes the (already-composited) file. Together with
// the mascot hash + placement key this reliably detects (a) new heroes, (b)
// mascot swap, (c) placement change, (d) an image that was overwritten
// outside this script.
function fingerprint(imgPath: string, mascotHash: string): string {
  return `${mascotHash}|${PLACEMENT_KEY}|${hashFile(imgPath)}`;
}

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
  mkdirSync(dirname(imgPath), { recursive: true });
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
  const force = process.argv.includes("--force");
  const heroes = existsSync(ROOT) ? listJpgs(ROOT) : [];
  const neighborhoods = existsSync(NEIGHBORHOODS) ? listJpgs(NEIGHBORHOODS) : [];
  const targets = [...heroes, ...neighborhoods];

  const mascotHash = hashFile(MASCOT);
  const manifest = force ? {} : loadManifest();
  const next: Manifest = {};

  let changed = 0;
  let skipped = 0;
  for (const p of targets) {
    const fp = fingerprint(p, mascotHash);
    if (!force && manifest[p] === fp) {
      // Already contains the mascot with the current placement; leave alone.
      next[p] = fp;
      skipped++;
      continue;
    }
    await composeMascot(p);
    // Recompute fingerprint over the newly-composited bytes so subsequent
    // runs recognize this file as up-to-date.
    next[p] = fingerprint(p, mascotHash);
    changed++;
  }
  saveManifest(next);
  console.log(`✓ mascot composited: ${changed} regenerated, ${skipped} cached (${targets.length} total)${force ? " [--force]" : ""}`);
}

const invokedDirectly = import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
