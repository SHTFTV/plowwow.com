// Ensures generated public assets are present in dist/ after Vite builds.
// Vite normally copies public/ automatically, but this hard-fails if the
// homepage carousel or crawler assets would deploy missing/stale.

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const PUBLIC = resolve("public");
const DIST = resolve("dist");

const CRITICAL_ASSETS = [
  "blog-index.json",
  "diagnostics.json",
  "link-audit.json",
  "rss.xml",
  "sitemap.xml",
  "sitemap-blog.xml",
  "sitemap-cities.xml",
  "sitemap-neighborhoods.xml",
  "sitemap-pages.xml",
  "sitemap-static.xml",
  "sitemap-tags.xml",
  "robots.txt",
  "_headers",
  "_redirects",
];

function sha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

if (!existsSync(DIST)) {
  console.error("✗ sync-critical-public-assets: dist/ is missing — run after vite build.");
  process.exit(1);
}

const copied: string[] = [];
for (const rel of CRITICAL_ASSETS) {
  const src = resolve(PUBLIC, rel);
  const dest = resolve(DIST, rel);

  if (!existsSync(src)) {
    console.error(`✗ sync-critical-public-assets: public/${rel} is missing.`);
    process.exit(1);
  }

  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);

  if (!existsSync(dest)) {
    console.error(`✗ sync-critical-public-assets: failed to write dist/${rel}.`);
    process.exit(1);
  }

  if (statSync(src).size !== statSync(dest).size || sha256(src) !== sha256(dest)) {
    console.error(`✗ sync-critical-public-assets: dist/${rel} does not match public/${rel}.`);
    process.exit(1);
  }

  copied.push(rel);
}

console.log(`✓ synced ${copied.length} critical public assets into dist/: ${copied.join(", ")}`);