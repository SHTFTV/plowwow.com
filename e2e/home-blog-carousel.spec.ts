// e2e/home-blog-carousel.spec.ts
//
// Loads the homepage, waits for the blog carousel, and asserts it renders
// the top-4 posts (with a custom hero) sorted by publishedAt DESC — the
// same ordering HomeBlog.tsx applies.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

type Post = { slug: string; hasCustomHero: boolean; publishedAt: string };

function expectedTop4(): Post[] {
  const src = readFileSync(resolve(process.cwd(), "src/generated/blog-posts.ts"), "utf8");
  const jsonStart = src.indexOf("[");
  const jsonEnd = src.lastIndexOf("]");
  const posts = JSON.parse(src.slice(jsonStart, jsonEnd + 1)) as Post[];
  return posts
    .filter((p) => p.hasCustomHero)
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 4);
}

test("homepage carousel shows the top-4 posts by publishedAt DESC", async ({ page }) => {
  const expected = expectedTop4();
  expect(expected).toHaveLength(4);

  await page.goto("/");
  const carousel = page.getByLabel("Latest blog posts");
  await carousel.waitFor({ state: "visible" });

  const hrefs = await carousel.locator("a[href]").evaluateAll((els) =>
    (els as HTMLAnchorElement[]).map((a) => new URL(a.href).pathname.replace(/^\//, "").replace(/\/$/, "")),
  );

  const firstFour = hrefs.slice(0, 4);
  expect(firstFour).toEqual(expected.map((p) => p.slug));

  // Sort assertion: expected slugs already come from a DESC sort — but double-check
  // via published-at ordering on the DOM's data pipeline.
  const sortedByDate = [...expected].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).map((p) => p.slug);
  expect(firstFour).toEqual(sortedByDate);
});
