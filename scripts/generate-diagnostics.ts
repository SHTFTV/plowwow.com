// Generates public/diagnostics.json — a machine-readable snapshot of
// build-time state so external monitors can programmatically confirm the
// deployed homepage carousel matches expectations without loading the
// SPA. Fields:
//   generatedAt      : ISO timestamp of this build
//   blogIndexAt      : blog-index.json generatedAt (source of truth for carousel)
//   carousel         : the 4 slugs the homepage should render, in order
//   totalPosts       : count of published posts
//   swVersion        : VERSION constant parsed out of public/sw.js
//   endpoint         : "/diagnostics.json" (self-referential for docs)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const blogIndex = JSON.parse(readFileSync(resolve(root, "public/blog-index.json"), "utf8"));
const swSrc = readFileSync(resolve(root, "public/sw.js"), "utf8");
const swMatch = /VERSION\s*=\s*["']([^"']+)["']/.exec(swSrc);

const payload = {
  endpoint: "/diagnostics.json",
  generatedAt: new Date().toISOString(),
  blogIndexAt: blogIndex.generatedAt,
  carousel: blogIndex.carousel,
  totalPosts: blogIndex.count,
  swVersion: swMatch ? swMatch[1] : null,
};

writeFileSync(resolve(root, "public/diagnostics.json"), JSON.stringify(payload, null, 2));
console.log(`✓ diagnostics.json written (sw=${payload.swVersion}, carousel=${payload.carousel.length})`);
