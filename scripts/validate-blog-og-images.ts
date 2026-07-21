// Validates that every blog post has a consistent mascot-only social share
// image and fails the build when warnings/failures exceed configured thresholds.
//
// Thresholds (env-overridable):
//   BLOG_OG_MAX_FAILURES        default 0  — missing/broken hero images
//   BLOG_OG_MAX_WARNINGS        default 8  — dimension/size/alt-length warnings
//   BLOG_OG_MAX_DEFAULT_FALLBACK default 0 — posts still on /og-default.jpg
//
// Writes seo-report/blog-og-images.{json,md} and prints a compact summary
// table to the build log regardless of pass/fail.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { blogPosts } from "../src/generated/blog-posts";

type SizeResult = { width: number; height: number } | null;

function readImageSize(buf: Buffer): SizeResult {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
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
  image: string;
  source: "hero" | "theme" | "default";
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

const MAX_FAILURES = Number(process.env.BLOG_OG_MAX_FAILURES ?? 0);
const MAX_WARNINGS = Number(process.env.BLOG_OG_MAX_WARNINGS ?? 8);
const MAX_DEFAULT_FALLBACK = Number(process.env.BLOG_OG_MAX_DEFAULT_FALLBACK ?? 0);

for (const p of blogPosts) {
  const warnings: string[] = [];
  const image = p.image ?? DEFAULT_OG;
  const source: Row["source"] = image === DEFAULT_OG
    ? "default"
    : image.includes("/_theme-")
      ? "theme"
      : "hero";
  if (source === "default") warnings.push("using /og-default.jpg fallback (no per-post or themed hero)");

  const abs = resolve(publicDir, image.replace(/^\//, ""));
  if (!existsSync(abs)) {
    rows.push({ slug: p.slug, image, source, exists: false, bytes: 0, width: null, height: null, ok: false, warnings: [...warnings, "file not found in /public"] });
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

  rows.push({ slug: p.slug, image, source, exists: true, bytes: buf.length, width: w, height: h, ok: true, warnings });
}

mkdirSync(resolve("seo-report"), { recursive: true });
const failed = rows.filter((r) => !r.ok);
const withWarnings = rows.filter((r) => r.warnings.length > 0);
const onDefault = rows.filter((r) => r.source === "default");
const bySource = {
  hero: rows.filter((r) => r.source === "hero").length,
  theme: rows.filter((r) => r.source === "theme").length,
  default: onDefault.length,
};

const out = {
  generatedAt: new Date().toISOString(),
  total: rows.length,
  failed: failed.length,
  warned: withWarnings.length,
  bySource,
  thresholds: { MAX_FAILURES, MAX_WARNINGS, MAX_DEFAULT_FALLBACK },
  rows,
};
writeFileSync(resolve("seo-report/blog-og-images.json"), JSON.stringify(out, null, 2));

const md: string[] = [
  `# Blog Social Share Image Report`,
  ``,
  `_Generated ${out.generatedAt}_`,
  ``,
  `- Total posts: **${rows.length}**`,
  `- Custom hero: **${bySource.hero}** · Themed mascot fallback: **${bySource.theme}** · /og-default.jpg: **${bySource.default}**`,
  `- Missing images: **${failed.length}** (threshold ≤ ${MAX_FAILURES})`,
  `- Posts with warnings: **${withWarnings.length}** (threshold ≤ ${MAX_WARNINGS})`,
  `- Default-fallback posts: **${bySource.default}** (threshold ≤ ${MAX_DEFAULT_FALLBACK})`,
  ``,
];
if (failed.length) {
  md.push(`## Missing`, ``);
  for (const r of failed) md.push(`- \`${r.slug}\` → ${r.warnings.join("; ")}`);
  md.push(``);
}
if (withWarnings.length) {
  md.push(`## Warnings`, ``);
  for (const r of withWarnings) md.push(`- \`${r.slug}\` (${r.width}x${r.height}, ${r.source}) → ${r.warnings.join("; ")}`);
}
writeFileSync(resolve("seo-report/blog-og-images.md"), md.join("\n"));

// --- Human summary in the build log ------------------------------------------
const bar = "─".repeat(60);
console.log(`\n${bar}`);
console.log(`Blog OG / Twitter share images`);
console.log(bar);
console.log(`  Total posts        : ${rows.length}`);
console.log(`  Custom hero        : ${bySource.hero}`);
console.log(`  Themed mascot fallback : ${bySource.theme}`);
console.log(`  Default fallback   : ${bySource.default} (max ${MAX_DEFAULT_FALLBACK})`);
console.log(`  Warnings           : ${withWarnings.length} (max ${MAX_WARNINGS})`);
console.log(`  Missing files      : ${failed.length} (max ${MAX_FAILURES})`);
console.log(bar);

const violations: string[] = [];
if (failed.length > MAX_FAILURES) violations.push(`missing images ${failed.length} > ${MAX_FAILURES}`);
if (withWarnings.length > MAX_WARNINGS) violations.push(`warnings ${withWarnings.length} > ${MAX_WARNINGS}`);
if (bySource.default > MAX_DEFAULT_FALLBACK) violations.push(`default-fallback posts ${bySource.default} > ${MAX_DEFAULT_FALLBACK}`);

if (violations.length) {
  console.error(`\n✗ blog-og-images thresholds exceeded:`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error(`See seo-report/blog-og-images.md for the full list.\n`);
  process.exit(1);
}
console.log(`✓ blog-og-images: all thresholds within budget.\n`);
