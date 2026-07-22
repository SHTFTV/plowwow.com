// Fetches the deployed homepage HTML + /blog-index.json and compares
// against the locally generated blog-posts.ts. Exits non-zero if the
// live carousel would be stale (missing top-4 slugs or timestamp drift).
//
// Usage:
//   PLOWWOW_LIVE_URL=https://plowwow.com bun run scripts/verify-live-carousel.ts
//
// Defaults to https://plowwow.com.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = (process.env.PLOWWOW_LIVE_URL || "https://plowwow.com").replace(/\/+$/, "");

type LocalPost = { slug: string; hasCustomHero: boolean; publishedAt: string };

function loadLocalCarousel(): { slugs: string[]; generatedAt: string } {
  const src = readFileSync(resolve(process.cwd(), "src/generated/blog-posts.ts"), "utf8");
  const jsonStart = src.indexOf("[");
  const jsonEnd = src.lastIndexOf("]");
  const posts = JSON.parse(src.slice(jsonStart, jsonEnd + 1)) as LocalPost[];
  const slugs = posts.filter((p) => p.hasCustomHero).slice(0, 4).map((p) => p.slug);
  let generatedAt = "";
  try {
    const idx = JSON.parse(readFileSync(resolve(process.cwd(), "public/blog-index.json"), "utf8"));
    generatedAt = idx.generatedAt || "";
  } catch { /* ignored */ }
  return { slugs, generatedAt };
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
  if (local.generatedAt && liveIndex.generatedAt && liveIndex.generatedAt < local.generatedAt) {
    problems.push(`live blog-index.json is older than local (live=${liveIndex.generatedAt} < local=${local.generatedAt})`);
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
