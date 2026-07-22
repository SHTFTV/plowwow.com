// e2e/pwa-reset-carousel.spec.ts
//
// Clicks the "Reset caches & reload" button on /admin/pwa-diagnostics and
// then verifies the homepage carousel matches the newest blog-index.json
// after the forced reload — i.e. cache clearing does not desync the
// carousel from the freshest data.

import { expect, test } from "@playwright/test";

test("reset caches & reload keeps carousel in sync with blog-index.json", async ({ page }) => {
  await page.goto("/admin/pwa-diagnostics");
  await expect(page.getByRole("heading", { name: "PWA Diagnostics" })).toBeVisible();

  const resetBtn = page.getByRole("button", { name: "Reset caches & reload" });
  await expect(resetBtn).toBeVisible();

  // The button triggers window.location.replace with a cache-buster.
  // Click and wait for the navigation to settle. It may reload the same
  // page or take us elsewhere depending on history — we just need a
  // completed load event.
  await Promise.all([
    page.waitForLoadState("load"),
    resetBtn.click(),
  ]);

  // From wherever we landed, navigate to home and verify the carousel
  // matches the live blog-index.json exactly.
  await page.goto("/");
  const carousel = page.getByLabel("Latest blog posts");
  await carousel.waitFor({ state: "visible" });
  const hrefs = await carousel.locator("a[href]").evaluateAll((els) =>
    (els as HTMLAnchorElement[]).slice(0, 4).map((a) => new URL(a.href).pathname.replace(/^\/|\/$/g, "")),
  );

  const idx = await page.evaluate(async () => {
    const r = await fetch(`/blog-index.json?_cb=${Date.now()}`);
    return (await r.json()) as { carousel: string[]; generatedAt: string };
  });

  expect(hrefs).toEqual(idx.carousel.slice(0, 4));
});
