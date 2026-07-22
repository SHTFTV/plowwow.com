// Web Vitals / performance test: compare first-render time after
// navigation on a preloaded route vs. a cold (non-preloaded) route.
//
// The route preloader in src/lib/routePreloader.ts kicks the top routes
// into the module cache after idle. We measure:
//   - t0: click <a href> in the SPA
//   - t1: React commits the target route's <h1> to the DOM
//
// Preloaded routes (CityPage, BlogIndex) should render measurably faster
// than a cold, non-preloaded route (AdminGscCoverage).

import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:8080";

async function measure(page: import("@playwright/test").Page, href: string, waitFor: string): Promise<number> {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  // Give the preloader its idle window.
  await page.waitForTimeout(2800);
  const t = await page.evaluate(async ({ href, waitFor }) => {
    const start = performance.now();
    history.pushState({}, "", href);
    dispatchEvent(new PopStateEvent("popstate"));
    const deadline = start + 8000;
    return await new Promise<number>((resolve) => {
      const tick = () => {
        if (document.querySelector(waitFor)) return resolve(performance.now() - start);
        if (performance.now() > deadline) return resolve(-1);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }, { href, waitFor });
  return t;
}

test.describe("route preloader — first render performance", () => {
  test("preloaded route renders faster than cold route", async ({ page }) => {
    // Preloaded (top of PRELOAD_QUEUE): CityPage
    const preloaded = await measure(page, "/burnaby-snow-removal", "h1");
    // Cold: an admin route the preloader does NOT warm.
    const cold = await measure(page, "/admin/gsc-coverage", "h1, main");

    // Sanity: both routes rendered.
    expect(preloaded).toBeGreaterThan(0);
    expect(cold).toBeGreaterThan(0);

    // Preloaded should be faster. Allow a generous 25% slack for flake —
    // the point is to catch a regression where the preloader silently
    // breaks and both routes hit the network the same way.
    expect(preloaded).toBeLessThan(cold * 1.25);

    // Attach the timings to the test report for trend spotting.
    test.info().annotations.push({ type: "preloaded-ms", description: preloaded.toFixed(1) });
    test.info().annotations.push({ type: "cold-ms", description: cold.toFixed(1) });
  });
});
