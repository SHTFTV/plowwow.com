// e2e/home-blog-carousel-visual.spec.ts
//
// Beyond href parity, this asserts the visible carousel cards actually
// correspond to the expected top-4 slugs: hero <img> src matches the
// slug's blog-image path, the card renders visibly (non-zero box), and
// we capture per-card screenshots for review.

import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

type Post = { slug: string; hasCustomHero: boolean; publishedAt: string; image: string; title: string };

function expectedTop4(): Post[] {
  const src = readFileSync(resolve(process.cwd(), "src/generated/blog-posts.ts"), "utf8");
  const jsonStart = src.indexOf("[");
  const jsonEnd = src.lastIndexOf("]");
  const posts = JSON.parse(src.slice(jsonStart, jsonEnd + 1)) as Post[];
  return posts
    .filter((p) => p.hasCustomHero)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 4);
}

test("carousel cards visually correspond to expected top-4 slugs", async ({ page }, testInfo) => {
  const expected = expectedTop4();
  expect(expected).toHaveLength(4);

  await page.goto("/");
  const carousel = page.getByLabel("Latest blog posts");
  await carousel.waitFor({ state: "visible" });
  const cards = carousel.locator("a[href]");
  await expect(cards).toHaveCount(await cards.count());

  const outDir = resolve(process.cwd(), "seo-report/carousel-cards");
  mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < 4; i++) {
    const card = cards.nth(i);
    const post = expected[i];

    // Href parity for the card as a whole.
    const href = await card.getAttribute("href");
    expect(href, `card ${i} href`).toBe(`/${post.slug}`);

    // The hero image must be the slug's real image, fully loaded, and non-zero.
    const img = card.locator("img").first();
    await img.waitFor({ state: "visible" });
    const meta = await img.evaluate((el) => {
      const im = el as HTMLImageElement;
      const rect = im.getBoundingClientRect();
      return {
        src: im.currentSrc || im.src,
        complete: im.complete,
        naturalWidth: im.naturalWidth,
        naturalHeight: im.naturalHeight,
        width: rect.width,
        height: rect.height,
        alt: im.alt,
      };
    });

    expect(meta.complete, `card ${i} image loaded`).toBe(true);
    expect(meta.naturalWidth, `card ${i} naturalWidth`).toBeGreaterThan(0);
    expect(meta.width * meta.height, `card ${i} rendered box`).toBeGreaterThan(0);
    expect(meta.src, `card ${i} src matches slug`).toContain(`/blog-images/${post.slug}`);

    await card.screenshot({ path: resolve(outDir, `card-${i}-${post.slug}.png`) });
  }

  await carousel.screenshot({ path: resolve(outDir, "carousel.png") });
  await testInfo.attach("carousel", { path: resolve(outDir, "carousel.png"), contentType: "image/png" });
});
