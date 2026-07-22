// e2e/diagnostics-endpoint.spec.ts
//
// Verifies /diagnostics.json is reachable, well-formed, and stays consistent
// with the homepage carousel after a fresh reload. Guards against drift
// between the build-time carousel manifest and what the SPA actually renders.

import { expect, test } from "@playwright/test";

type Diagnostics = {
  endpoint: string;
  generatedAt: string;
  blogIndexAt: string;
  carousel: string[];
  totalPosts: number;
  swVersion: string | null;
  serviceWorker?: { scriptPath: string; expectedScope: string; version: string | null };
};

test("/diagnostics.json exposes required fields and matches the homepage carousel", async ({ page, request }) => {
  const res = await request.get("/diagnostics.json");
  expect(res.status(), "diagnostics.json HTTP status").toBe(200);
  const diag = (await res.json()) as Diagnostics;

  // Presence
  expect(diag.generatedAt, "generatedAt").toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(diag.blogIndexAt, "blogIndexAt").toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(Array.isArray(diag.carousel), "carousel is array").toBe(true);
  expect(diag.carousel).toHaveLength(4);
  expect(diag.totalPosts, "totalPosts").toBeGreaterThan(0);
  expect(diag.swVersion, "swVersion").toBeTruthy();

  // Reload homepage and read the actual rendered carousel slugs.
  await page.goto("/", { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  const carousel = page.getByLabel("Latest blog posts");
  await carousel.waitFor({ state: "visible" });
  const hrefs = await carousel.locator("a[href]").evaluateAll((els) =>
    (els as HTMLAnchorElement[]).slice(0, 4).map((a) => new URL(a.href).pathname),
  );
  const renderedSlugs = hrefs.map((p) => p.replace(/^\//, "").replace(/\/$/, ""));

  expect(renderedSlugs, "rendered carousel slugs match diagnostics.carousel").toEqual(diag.carousel);
});
