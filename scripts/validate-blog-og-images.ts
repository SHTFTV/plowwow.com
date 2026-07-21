// Validates that every blog post has a consistent social share image.
// - Each post in src/generated/blog-posts.ts declares an `image` path.
// - File must exist under public/ at that path.
// - Image should be at least 1200x630 (OG spec). Non-fatal warning for
//   posts that use the /og-default.jpg fallback.
// Writes seo-report/blog-og-images.json (+ .md) and fails build if any
// blog post is missing its share image.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { blogPosts } from "../src/generated/blog-posts";

type SizeResult = { width: number; height: number } | null;

// Minimal JPEG/PNG dimension reader — avoids adding a dep.
function readImageSize(buf: Buffer): SizeResult {
  // PNG
  if (
    buf.length > 24 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG SOFn scan
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      i += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      const len = buf.readUInt16BE(i);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 3), width: buf.readUInt16BE(i + 5) };
      }
      i += len;
    }
  }
  return null;
}

type Row = {
  slug: string;
  image: string | null;
  exists: boolean;
  bytes: number;
  width: number | null;
  height: number | null;
  ok: boolean;
  warnings: string[];
};

const publicDir = resolve("public");
const rows: Row[] = [];
const DEFAULT_OG = "/og-default.jpg";

for (const p of blogPosts) {
  const warnings: string[] = [];
  // Prefer explicit p.image, otherwise check for a matching hero at
  // /blog-images/<slug>.jpg, otherwise fall back to the branded default.
  let image = p.image ?? null;
  if (!image) {
    const heroCandidate = `/blog-images/${p.slug}.jpg`;
    if (existsSync(resolve(publicDir, heroCandidate.replace(/^\//, "")))) {
      image = heroCandidate;
      warnings.push("using inferred /blog-images/<slug>.jpg (no image field)");
    } else {
      image = DEFAULT_OG;
      warnings.push("using /og-default.jpg fallback (no per-post hero)");
    }
  }
  const abs = resolve(publicDir, image.replace(/^\//, ""));
  if (!existsSync(abs)) {
    rows.push({ slug: p.slug, image, exists: false, bytes: 0, width: null, height: null, ok: false, warnings: [...warnings, "file not found in /public"] });
    continue;
  }
  const buf = readFileSync(abs);
  const size = readImageSize(buf);
  const w = size?.width ?? null;
  const h = size?.height ?? null;
  if (!w || !h) warnings.push("could not read dimensions");
  else if (w < 1200 || h < 630) warnings.push(`smaller than 1200x630 (${w}x${h})`);
  if (buf.length < 20_000) warnings.push(`suspiciously small file (${buf.length} bytes)`);
  if (!p.alt || p.alt.length < 20) warnings.push("alt text missing or too short");
  rows.push({
    slug: p.slug,
    image,
    exists: true,
    bytes: buf.length,
    width: w,
    height: h,
    ok: true,
    warnings,
  });
}

mkdirSync(resolve("seo-report"), { recursive: true });
const failed = rows.filter((r) => !r.ok);
const withWarnings = rows.filter((r) => r.warnings.length > 0);

const out = {
  generatedAt: new Date().toISOString(),
  total: rows.length,
  failed: failed.length,
  warned: withWarnings.length,
  rows,
};
writeFileSync(resolve("seo-report/blog-og-images.json"), JSON.stringify(out, null, 2));

const md: string[] = [
  `# Blog Social Share Image Report`,
  ``,
  `_Generated ${out.generatedAt}_`,
  ``,
  `- Total posts: **${rows.length}**`,
  `- Missing images: **${failed.length}**`,
  `- Warnings: **${withWarnings.length}**`,
  ``,
];
if (failed.length) {
  md.push(`## Missing`, ``);
  for (const r of failed) md.push(`- \`${r.slug}\` → ${r.warnings.join("; ")}`);
  md.push(``);
}
if (withWarnings.length) {
  md.push(`## Warnings`, ``);
  for (const r of withWarnings) md.push(`- \`${r.slug}\` (${r.width}x${r.height}) → ${r.warnings.join("; ")}`);
}
writeFileSync(resolve("seo-report/blog-og-images.md"), md.join("\n"));

if (failed.length) {
  console.error(`✗ blog-og-images: ${failed.length} post(s) missing share image`);
  for (const r of failed) console.error(`  - ${r.slug}: ${r.warnings.join("; ")}`);
  process.exit(1);
}
console.log(`✓ blog-og-images: ${rows.length} post(s) have a share image (${withWarnings.length} warning(s))`);
