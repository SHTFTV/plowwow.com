// Generate custom OpenGraph/Twitter images for every /blog/neighborhoods
// filter combination (city × tag) with at least one post. Composites a
// themed mascot background (already generated at public/blog-images/_theme-*.jpg)
// with an SVG overlay containing the filter label so every share card
// matches the active filter.
//
// Output: public/blog-images/_neighborhoods/{key}.jpg
// Key format:
//   city-{citySlug}                  → e.g. city-all, city-vancouver, city-citywide
//   city-{citySlug}__tag-{tagSlug}   → e.g. city-vancouver__tag-strata
//
// The chosen theme background follows the same rules as `pickTheme` in
// generate-blog-index.ts — tag-driven when a tag is active, otherwise
// citywide for "all" and per-city defaults for city-only views.

import sharp from "sharp";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { blogPosts } from "../src/generated/blog-posts";
import { cityHubs, cityForBlogSlug } from "../src/lib/internalLinks";

const ALL = "all";
const CITYWIDE = "citywide";
const W = 1200;
const H = 630;
const OUT = resolve("public/blog-images/_neighborhoods");
mkdirSync(OUT, { recursive: true });

type Theme = "strata" | "commercial" | "residential" | "storm" | "citywide";

const TAG_THEME: Record<string, Theme> = {
  Strata: "strata",
  Commercial: "commercial",
  Residential: "residential",
  Liability: "strata",
  "De-Icing": "storm",
  Weather: "storm",
  Contracts: "commercial",
  Equipment: "citywide",
};

const CITY_THEME: Record<string, Theme> = {
  burnaby: "strata",
  vancouver: "residential",
  richmond: "residential",
  surrey: "commercial",
  langley: "commercial",
  coquitlam: "residential",
  "port-coquitlam": "residential",
  "port-moody": "residential",
  "maple-ridge": "residential",
  "pitt-meadows": "residential",
  "north-vancouver": "storm",
  "west-vancouver": "storm",
  "new-westminster": "commercial",
  "white-rock": "residential",
  delta: "residential",
  tsawwassen: "residential",
  ladner: "residential",
  squamish: "storm",
  chilliwack: "commercial",
  abbotsford: "commercial",
  mission: "residential",
};

const slugTag = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function pickTheme(citySlug: string, tag: string | null): Theme {
  if (tag && TAG_THEME[tag]) return TAG_THEME[tag];
  if (citySlug === ALL || citySlug === CITYWIDE) return "citywide";
  return CITY_THEME[citySlug] ?? "citywide";
}

function cityLabel(citySlug: string): string {
  if (citySlug === ALL) return "All Neighborhoods";
  if (citySlug === CITYWIDE) return "Citywide";
  return cityHubs.find((c) => c.slug === citySlug)?.name ?? citySlug;
}

function buildOverlaySVG(city: string, tag: string | null): Buffer {
  const eyebrow = "PLOWWOW · NEIGHBORHOOD BLOG";
  const line1 = city;
  const line2 = tag ? `Topic · ${tag}` : "Snow-removal guides by neighborhood";
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b1220" stop-opacity="0"/>
      <stop offset="55%" stop-color="#0b1220" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0b1220" stop-opacity="0.92"/>
    </linearGradient>
    <filter id="ds" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#fade)"/>
  <rect x="60" y="60" width="220" height="34" rx="17" fill="#EAB308"/>
  <text x="170" y="83" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="900"
        text-anchor="middle" fill="#0b1220" letter-spacing="1.5">${esc(eyebrow)}</text>
  <text x="60" y="${H - 130}" font-family="Inter, Arial, sans-serif" font-size="70" font-weight="900"
        fill="#ffffff" filter="url(#ds)">${esc(line1)}</text>
  <text x="60" y="${H - 70}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700"
        fill="#f8fafc" opacity="0.95" filter="url(#ds)">${esc(line2)}</text>
  <text x="${W - 60}" y="${H - 40}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800"
        text-anchor="end" fill="#EAB308" letter-spacing="1">plowwow.com/blog/neighborhoods</text>
</svg>`);
}

async function render(baseTheme: Theme, city: string, tag: string | null, outPath: string) {
  const bg = resolve(`public/blog-images/_theme-${baseTheme}.jpg`);
  if (!existsSync(bg)) throw new Error(`missing base theme image: ${bg}`);
  const overlay = buildOverlaySVG(city, tag);
  await sharp(bg)
    .resize(W, H, { fit: "cover" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 84, progressive: true, mozjpeg: true })
    .toFile(outPath);
}

async function main() {
  // Group posts by city (matching BlogNeighborhoods logic).
  const grouped = new Map<string, typeof blogPosts>();
  for (const p of blogPosts) {
    const key = cityForBlogSlug(p.slug)?.slug ?? CITYWIDE;
    const arr = grouped.get(key) ?? [];
    arr.push(p);
    grouped.set(key, arr);
  }

  const cityKeys = [ALL, ...cityHubs.map((c) => c.slug).filter((s) => (grouped.get(s)?.length ?? 0) > 0)];
  if ((grouped.get(CITYWIDE)?.length ?? 0) > 0) cityKeys.push(CITYWIDE);

  const generated: { key: string; file: string; city: string; tag: string | null }[] = [];

  for (const c of cityKeys) {
    const scoped = c === ALL ? blogPosts : grouped.get(c) ?? [];
    // Baseline OG (no tag).
    const baseKey = `city-${c}`;
    const baseFile = resolve(OUT, `${baseKey}.jpg`);
    await render(pickTheme(c, null), cityLabel(c), null, baseFile);
    generated.push({ key: baseKey, file: `/blog-images/_neighborhoods/${baseKey}.jpg`, city: c, tag: null });

    // Per-tag OG for tags with at least one post in this city scope.
    const tagCounts = new Map<string, number>();
    for (const p of scoped) for (const t of (p.tags ?? [])) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    for (const [tag, count] of tagCounts.entries()) {
      if (count < 1) continue;
      const key = `city-${c}__tag-${slugTag(tag)}`;
      const file = resolve(OUT, `${key}.jpg`);
      await render(pickTheme(c, tag), cityLabel(c), tag, file);
      generated.push({ key, file: `/blog-images/_neighborhoods/${key}.jpg`, city: c, tag });
    }
  }

  // Emit a small manifest the client can consult without recomputing keys.
  const manifest = {
    generatedAt: new Date().toISOString(),
    count: generated.length,
    fallback: "/blog-images/_neighborhoods/city-all.jpg",
    entries: generated,
  };
  writeFileSync(resolve("public/blog-images/_neighborhoods/manifest.json"), JSON.stringify(manifest, null, 2));

  // Update generated TS index consumed by BlogNeighborhoods.tsx.
  const tsPath = resolve("src/generated/neighborhoods-og.ts");
  const tsBody = `// AUTO-GENERATED by scripts/generate-neighborhoods-og.ts — do not edit.
// Maps a (city, tag) filter combination to its custom OG image URL.

export const NEIGHBORHOODS_OG_FALLBACK = ${JSON.stringify(manifest.fallback)};

export const NEIGHBORHOODS_OG: Record<string, string> = ${JSON.stringify(
    Object.fromEntries(generated.map((g) => [g.key, g.file])),
    null,
    2,
  )};

export function neighborhoodsOgUrl(citySlug: string, tag: string | null): string {
  const slugTag = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const key = tag ? \`city-\${citySlug}__tag-\${slugTag(tag)}\` : \`city-\${citySlug}\`;
  return NEIGHBORHOODS_OG[key] ?? NEIGHBORHOODS_OG_FALLBACK;
}
`;
  writeFileSync(tsPath, tsBody);

  console.log(`✓ neighborhoods OG: ${generated.length} images written to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
