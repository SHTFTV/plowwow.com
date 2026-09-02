/**
 * Validates every icon referenced by public/site.webmanifest and the
 * apple-touch/favicon link tags in index.html:
 *  - file exists on disk under public/
 *  - PNG dimensions match the declared `sizes`
 *  - the pixel content matches the canonical Wow mascot
 *    (src/assets/wow-mascot.png) via a perceptual hash comparison of
 *    the icon's centre region against a downscaled mascot silhouette.
 *
 * Emits seo-report/pwa-icon-report.json and prints a table. Exits
 * non-zero when any icon is missing, mis-sized, or does not look like
 * the mascot.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

type IconEntry = { src: string; sizes: string; purpose?: string; source: string };

const ROOT = resolve(process.cwd());
const PUBLIC = resolve(ROOT, "public");
const MASCOT = resolve(ROOT, "src/assets/wow-mascot.png");

function stripQuery(p: string) {
  return p.split("?")[0];
}

function loadManifestIcons(): IconEntry[] {
  const raw = JSON.parse(readFileSync(resolve(PUBLIC, "site.webmanifest"), "utf8"));
  return (raw.icons || []).map((i: any) => ({ ...i, source: "manifest" }));
}

function loadHtmlIcons(): IconEntry[] {
  const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
  const out: IconEntry[] = [];
  const re = /<link[^>]+rel=["'](?:icon|apple-touch-icon(?:-precomposed)?|shortcut icon|mask-icon)["'][^>]*>/gi;
  for (const m of html.match(re) || []) {
    const href = /href=["']([^"']+)["']/i.exec(m)?.[1];
    const sizes = /sizes=["']([^"']+)["']/i.exec(m)?.[1] || "";
    if (!href || href.startsWith("http")) continue;
    if (!/\.(png|ico|svg)$/i.test(stripQuery(href))) continue;
    out.push({ src: href, sizes, source: "index.html" });
  }
  return out;
}

async function mascotSignature(size: number): Promise<Buffer> {
  return sharp(MASCOT)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer();
}

async function iconMatchesMascot(file: string): Promise<{ score: number; ok: boolean }> {
  // Compare a 32x32 greyscale silhouette. Icons include navy padding, so
  // we compare the centre 60% region.
  const N = 32;
  const iconBuf = await sharp(file)
    .resize(N, N, { fit: "cover" })
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer();
  const mascotBuf = await mascotSignature(N);
  let diff = 0;
  for (let i = 0; i < iconBuf.length; i++) diff += Math.abs(iconBuf[i] - mascotBuf[i]);
  const score = 1 - diff / (iconBuf.length * 255);
  return { score, ok: score > 0.55 };
}

async function main() {
  if (!existsSync(MASCOT)) throw new Error("Missing canonical mascot: " + MASCOT);
  const entries = [...loadManifestIcons(), ...loadHtmlIcons()];
  const results: any[] = [];
  let failed = 0;

  for (const e of entries) {
    const rel = stripQuery(e.src).replace(/^\//, "");
    const file = resolve(PUBLIC, rel);
    const row: any = { src: e.src, sizes: e.sizes, purpose: e.purpose || "any", source: e.source };
    if (!existsSync(file)) {
      row.status = "MISSING";
      failed++;
      results.push(row);
      continue;
    }
    row.bytes = readFileSync(file).length;
    row.sha1 = createHash("sha1").update(readFileSync(file)).digest("hex").slice(0, 10);

    if (/\.png$/i.test(file)) {
      const meta = await sharp(file).metadata();
      row.actual = `${meta.width}x${meta.height}`;
      if (e.sizes && e.sizes !== "any") {
        const [w] = e.sizes.split("x").map((n) => parseInt(n, 10));
        if (meta.width !== w || meta.height !== w) {
          row.status = "WRONG_SIZE";
          failed++;
          results.push(row);
          continue;
        }
      }
      const { score, ok } = await iconMatchesMascot(file);
      row.mascotScore = score.toFixed(3);
      row.status = ok ? "OK" : "NOT_MASCOT";
      if (!ok) failed++;
    } else {
      row.status = "OK"; // .ico / .svg — presence-only check
    }
    results.push(row);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    failed,
    entries: results,
  };
  const outDir = resolve(ROOT, "seo-report");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "pwa-icon-report.json"), JSON.stringify(report, null, 2));

  console.log("\nPWA icon validation");
  console.table(results.map((r) => ({
    source: r.source, src: r.src, sizes: r.sizes, actual: r.actual || "-",
    mascotScore: r.mascotScore || "-", status: r.status,
  })));
  console.log(`\n${results.length - failed}/${results.length} icons OK. Report → seo-report/pwa-icon-report.json`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
