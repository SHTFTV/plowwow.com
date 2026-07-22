// e2e/home-blog-carousel-mobile.spec.ts
//
// Mobile (and tablet) viewport parity for the homepage carousel. Fails if
// the expected top-4 slug images are not visually present at small widths —
// catches responsive regressions the desktop-only spec would miss.

import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

type Post = { slug: string; hasCustomHero: boolean; publishedAt: string; image: string; title: string };

function expectedTop4(): Post[] {
  const src = readFileSync(resolve(process.cwd(), "src/generated/blog-posts.ts"), "utf8");
  const posts = JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1)) as Post[];
  return posts
    .filter((p) => p.hasCustomHero)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 4);
}

const viewports = [
  { name: "mobile", width: 390, height: 844 },   // iPhone 14
  { name: "tablet", width: 820, height: 1180 },  // iPad Air
] as const;

for (const vp of viewports) {
  test(`carousel renders top-4 slugs on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const expected = expectedTop4();
    expect(expected).toHaveLength(4);

    await page.goto("/");
    const carousel = page.getByLabel("Latest blog posts");
    await carousel.waitFor({ state: "visible" });
    const cards = carousel.locator("a[href]");

    const outDir = resolve(process.cwd(), `seo-report/carousel-cards-${vp.name}`);
    mkdirSync(outDir, { recursive: true });

    for (let i = 0; i < 4; i++) {
      const card = cards.nth(i);
      const post = expected[i];

      // Scroll into view — the mobile layout is a horizontal snap carousel.
      await card.scrollIntoViewIfNeeded();

      const img = card.locator("img").first();
      await img.waitFor({ state: "attached" });
      const meta = await img.evaluate((el) => {
        const im = el as HTMLImageElement;
        const rect = im.getBoundingClientRect();
        return {
          src: im.currentSrc || im.src,
          complete: im.complete,
          naturalWidth: im.naturalWidth,
          width: rect.width,
          height: rect.height,
        };
      });

      expect(meta.complete, `${vp.name} card ${i} loaded`).toBe(true);
      expect(meta.naturalWidth, `${vp.name} card ${i} naturalWidth`).toBeGreaterThan(0);
      expect(meta.width * meta.height, `${vp.name} card ${i} rendered box`).toBeGreaterThan(0);
      expect(meta.src, `${vp.name} card ${i} src slug`).toContain(`/blog-images/${post.slug}`);

      await card.screenshot({ path: resolve(outDir, `card-${i}-${post.slug}.png`) });
    }

    await testInfo.attach(`${vp.name}-carousel`, {
      body: await carousel.screenshot(),
      contentType: "image/png",
    });
  });
}
