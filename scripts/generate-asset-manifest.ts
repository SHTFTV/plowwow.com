// Emits dist/asset-manifest.json — a small, deploy-versioned pointer file we
// can fetch from the live site to prove the deploy is truly up-to-date.
//
// Fields:
//   generatedAt    – mirrors blog-index.json.generatedAt (build stamp)
//   builtAt        – wall clock at manifest write
//   assets[path]   – { size, sha256 } for every critical deploy asset
//
// Consumed by scripts/publish-and-verify.ts to detect when the live site has
// caught up to the local build.

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const DIST = resolve("dist");

// Assets that MUST exist on every deploy. build-validate.ts also enforces
// blog-index.json — keeping this list here in sync means a missing file
// breaks the build in two places, not silently at runtime.
const REQUIRED = [
  "blog-index.json",
  "sitemap.xml",
  "sitemap-blog.xml",
  "robots.txt",
  "index.html",
];

const missing = REQUIRED.filter((p) => !existsSync(resolve(DIST, p)));
if (missing.length) {
  console.error(`✗ generate-asset-manifest: missing required assets in dist/: ${missing.join(", ")}`);
  process.exit(1);
}

const blogIndex = JSON.parse(readFileSync(resolve(DIST, "blog-index.json"), "utf8")) as {
  generatedAt?: string;
  count?: number;
};

const assets: Record<string, { size: number; sha256: string }> = {};
for (const rel of REQUIRED) {
  const buf = readFileSync(resolve(DIST, rel));
  assets[rel] = {
    size: statSync(resolve(DIST, rel)).size,
    sha256: createHash("sha256").update(buf).digest("hex"),
  };
}

const manifest = {
  generatedAt: blogIndex.generatedAt ?? new Date().toISOString(),
  builtAt: new Date().toISOString(),
  blogPostCount: blogIndex.count ?? null,
  assets,
};

writeFileSync(resolve(DIST, "asset-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(
  `✓ asset-manifest.json written · generatedAt=${manifest.generatedAt} · ${Object.keys(assets).length} assets`,
);
