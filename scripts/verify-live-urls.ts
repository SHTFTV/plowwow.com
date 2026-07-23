// Live smoke test: fetch key URLs on the deployed site and fail on any 404.
// Usage: `bun run seo:smoke-live` (defaults to https://plowwow.com) or
// `HOST=https://plowwow-fluff-sparkle.lovable.app bunx tsx scripts/verify-live-urls.ts`.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const HOST = (process.env.HOST ?? "https://plowwow.com").replace(/\/$/, "");

const staticPaths = [
  "/blog-index.json",
  "/sitemap.xml",
  "/sitemap-blog.xml",
  "/robots.txt",
  "/blog/",
  "/blog/neighborhoods/",
];

// Sample a handful of blog posts from the shipped index so this test tracks
// new content automatically instead of hard-coding slugs.
const BLOG_INDEX = resolve("public/blog-index.json");
let sampledBlog: string[] = [];
if (existsSync(BLOG_INDEX)) {
  try {
    const idx = JSON.parse(readFileSync(BLOG_INDEX, "utf8")) as { posts?: Array<{ slug: string }> };
    const slugs = (idx.posts ?? []).map((p) => p.slug).filter(Boolean);
    // First 3 (newest) + 3 alias variants under /blog/<slug>/
    sampledBlog = [
      ...slugs.slice(0, 3).map((s) => `/${s}/`),
      ...slugs.slice(0, 3).map((s) => `/blog/${s}/`),
    ];
  } catch {
    /* ignore, fall through */
  }
}

const targets = [...staticPaths, ...sampledBlog];

type Result = { url: string; status: number; ok: boolean };

async function check(path: string): Promise<Result> {
  const url = `${HOST}${path}`;
  try {
    // Use GET (HEAD is often blocked by static hosts / edge caches).
    const res = await fetch(url, { redirect: "follow" });
    return { url, status: res.status, ok: res.status !== 404 && res.status < 500 };
  } catch (err) {
    return { url, status: 0, ok: false };
  }
}

const results = await Promise.all(targets.map(check));
const failed = results.filter((r) => !r.ok);

for (const r of results) {
  console.log(`${r.ok ? "✓" : "✗"} ${r.status.toString().padStart(3)} ${r.url}`);
}

if (failed.length) {
  console.error(`\n✗ ${failed.length}/${results.length} URL(s) failing on ${HOST}`);
  process.exit(1);
}
console.log(`\n✓ ${results.length}/${results.length} URLs OK on ${HOST}`);
