// Fetches the deployed homepage HTML + /blog-index.json and compares
// against the locally generated blog-posts.ts. Exits non-zero if the
// live carousel would be stale (missing top-4 slugs or older post versions).
//
// Usage:
//   PLOWWOW_LIVE_URL=https://plowwow.com bun run scripts/verify-live-carousel.ts
//
// Defaults to https://plowwow.com.

import { blogPosts } from "../src/generated/blog-posts.ts";

const BASE = (process.env.PLOWWOW_LIVE_URL || "https://plowwow.com").replace(/\/+$/, "");

type PostVersion = { slug: string; publishedAt?: string; updatedAt?: string };

function postTimestamp(post: PostVersion): number {
  return Math.max(Date.parse(post.publishedAt || "") || 0, Date.parse(post.updatedAt || "") || 0);
}

function loadLocalCarousel() {
  // Import the generated data as TypeScript. Brackets in its type declarations,
  // string values and `satisfies BlogPostSummary[]` are not JSON boundaries.
  const posts = blogPosts.filter((p) => p.hasCustomHero).slice(0, 4);
  const slugs = posts.map((p) => p.slug);
  return { posts, slugs };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

async function main() {
  const local = loadLocalCarousel();
  console.log(`local carousel (${local.slugs.length}):`, local.slugs);

  const html = await fetchText(`${BASE}/?_cb=${Date.now()}`);
  const liveIndex = JSON.parse(await fetchText(`${BASE}/blog-index.json?_cb=${Date.now()}`));

  const missingInHtml = local.slugs.filter((slug) => !html.includes(`/${slug}`));
  const liveCarousel: string[] = liveIndex.carousel || [];
  const liveMismatch = local.slugs.filter((slug, i) => liveCarousel[i] !== slug);

  const problems: string[] = [];
  if (missingInHtml.length) {
    problems.push(`homepage HTML missing slugs: ${missingInHtml.join(", ")}`);
  }
  if (liveMismatch.length) {
    problems.push(
      `live blog-index.json carousel differs from local expected.\n  expected: ${local.slugs.join(", ")}\n  live:     ${liveCarousel.join(", ")}`,
    );
  }
  // A verification run regenerates the local index with a new wall-clock
  // generatedAt value. That is not a new content version: compare the actual
  // carousel posts so unchanged production content does not fail every night.
  const livePosts = new Map<string, PostVersion>(
    (Array.isArray(liveIndex.posts) ? liveIndex.posts : []).map((post: PostVersion): [string, PostVersion] => [post.slug, post]),
  );
  for (const post of local.posts) {
    const livePost = livePosts.get(post.slug);
    if (!livePost) {
      problems.push(`live blog-index.json missing post metadata: ${post.slug}`);
    } else if (postTimestamp(livePost) < postTimestamp(post)) {
      problems.push(`live blog-index.json has an older post version: ${post.slug} (live=${livePost.updatedAt || livePost.publishedAt || "missing"}, expected=${post.updatedAt || post.publishedAt})`);
    }
  }

  if (problems.length) {
    console.error("✗ live carousel is stale:\n - " + problems.join("\n - "));
    process.exit(1);
  }
  console.log(`✓ live carousel matches (${BASE}) generatedAt=${liveIndex.generatedAt}`);
}

main().catch((err) => {
  console.error("verify-live-carousel failed:", err);
  process.exit(1);
});

