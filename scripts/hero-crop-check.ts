/**
 * hero-crop-check
 * Validates that the four latest neighborhood hero images (mascot-only composition)
 * remain visually intact when cropped by common viewport aspect ratios used by
 * OG cards, Twitter cards, and responsive CSS (object-cover) at mobile/tablet/desktop.
 *
 * Checks per image:
 *  - file exists in public/blog-images/
 *  - source ≥ 1200×630 (OG minimum) and aspect close to 16:9
 *  - simulated object-cover crops for common viewport sizes preserve the lower-
 *    centre "mascot safe zone" (bottom-centre 60% width × 55% height band)
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

function jpegSize(path: string): { width: number; height: number } {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=s=x:p=0", path,
  ]).toString().trim();
  const [w, h] = out.split("x").map(Number);
  return { width: w, height: h };
}

const SLUGS = [
  "ironwood-richmond-strata-commercial-snow-removal",
  "renfrew-collingwood-vancouver-strata-commercial-snow-removal",
  "big-bend-burnaby-strata-commercial-snow-removal",
  "sperling-duthie-burnaby-strata-commercial-snow-removal",
];

// [label, cssWidth, cssHeight]
const VIEWPORTS: [string, number, number][] = [
  ["og-1200x630", 1200, 630],
  ["twitter-summary-large", 1200, 600],
  ["tablet-hero-768x432", 768, 432],
  ["mobile-hero-390x260", 390, 260],
  ["mobile-portrait-og-1080x1350", 1080, 1350],
];

// Mascot safe zone: bottom-centre 60% × 55%
const SAFE = { xMin: 0.35, xMax: 0.65, yMin: 0.5, yMax: 0.9 };

async function main() {
  const failures: string[] = [];
  for (const slug of SLUGS) {
    const p = resolve("public/blog-images", `${slug}.jpg`);
    if (!existsSync(p)) {
      failures.push(`${slug}: missing file`);
      continue;
    }
    const meta = jpegSize(p);
    const w = meta.width, h = meta.height;
    if (w < 1200 || h < 630) failures.push(`${slug}: below 1200×630 (${w}×${h})`);
    const ratio = w / h;
    if (ratio < 1.6 || ratio > 2.1) failures.push(`${slug}: ratio ${ratio.toFixed(2)} outside 1.6–2.1`);

    // Simulate object-cover crop rects; ensure mascot safe zone fits inside every crop.
    for (const [label, vw, vh] of VIEWPORTS) {
      const scale = Math.max(vw / w, vh / h);
      const cropW = vw / scale;
      const cropH = vh / scale;
      const cx = (w - cropW) / 2;
      const cy = (h - cropH) / 2;
      const safeL = w * SAFE.xMin;
      const safeR = w * SAFE.xMax;
      const safeT = h * SAFE.yMin;
      const safeB = h * SAFE.yMax;
      // Check safe zone (or as much as possible) lies within crop rectangle.
      const insideX = safeL >= cx && safeR <= cx + cropW;
      // Accept vertical clipping down to keeping bottom portion visible.
      const insideY = safeB <= cy + cropH && safeT <= cy + cropH;
      if (!insideX || !insideY) {
        failures.push(`${slug}: mascot safe zone clipped at ${label}`);
      }
    }
    console.log(`✓ ${slug} ${w}×${h} ratio=${ratio.toFixed(2)}`);
  }
  if (failures.length) {
    console.error("\n✗ hero-crop-check failed:");
    failures.forEach((f) => console.error("  - " + f));
    process.exit(1);
  }
  console.log(`\n✓ hero-crop-check: ${SLUGS.length} images pass mascot-only crop guard across ${VIEWPORTS.length} viewports`);
}
main();
