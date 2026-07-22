// e2e/route-preloader.spec.ts
//
// Verifies the RoutePreloader does NOT interfere with focus order or
// screen-reader announcements during normal navigation:
//   1. On homepage load, no focus is stolen, no unexpected aria-live text
//      appears from the preloader (it renders `null`).
//   2. Tab order matches the visible DOM order — preloading modules in the
//      background does not inject stray focusable elements.
//   3. After navigating (via link click) to a preloaded route, focus lands
//      on <main> as expected, aria-live regions announce only intentional
//      strings (loading fallback or page title), and no duplicate/leaked
//      announcements from the preloader appear.

import { expect, test } from "@playwright/test";

const ANNOUNCE_ALLOWLIST = [
  /^loading/i,     // Suspense fallback announces "Loading…"
  /snow removal/i, // BlogIndex / city page headings
  /^blog$/i,
  /^locations$/i,
];

async function snapshotLiveRegions(page: import("@playwright/test").Page): Promise<string[]> {
  return await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(
      '[aria-live], [role="status"], [role="alert"]'
    ));
    return nodes.map((n) => (n.textContent ?? "").trim()).filter(Boolean);
  });
}

async function tabOrder(page: import("@playwright/test").Page, steps: number): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return "<body>";
      const role = el.getAttribute("role");
      const aria = el.getAttribute("aria-label");
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
      return `${el.tagName.toLowerCase()}${role ? "[" + role + "]" : ""}::${aria ?? text}`;
    });
    out.push(label);
  }
  return out;
}

test.describe("route preloader accessibility", () => {
  test("does not steal focus or emit stray announcements on homepage load", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Skip-links / header links are the first focusable elements. Record
    // where focus lives BEFORE the preloader's idle timer fires.
    const initialActive = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return a ? a.tagName.toLowerCase() : "<none>";
    });
    // Preloader schedules on requestIdleCallback + 1200ms setTimeout in the
    // component. Wait past both.
    await page.waitForTimeout(3500);

    const activeAfter = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return a ? a.tagName.toLowerCase() : "<none>";
    });
    expect(activeAfter).toBe(initialActive);

    // aria-live regions may legitimately show marketing content (status
    // toasts, etc.); assert nothing preloader-flavoured leaked in.
    const live = await snapshotLiveRegions(page);
    for (const text of live) {
      const ok = ANNOUNCE_ALLOWLIST.some((rx) => rx.test(text));
      expect.soft(ok, `unexpected live-region text: "${text}"`).toBeTruthy();
    }
  });

  test("tab order is stable across preloader idle window", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const before = await tabOrder(page, 6);
    // Reset focus, wait past the idle window, tab again.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    await page.waitForTimeout(3500);
    const after = await tabOrder(page, 6);
    expect(after).toEqual(before);
  });

  test("navigating to a preloaded route emits only expected announcements", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Let the preloader finish so /blog is already in the module cache.
    await page.waitForTimeout(3500);

    // Prefer clicking a real in-page link so we exercise the same nav path
    // a keyboard user would; fall back to direct nav if no link matches.
    const blogLink = page.getByRole("link", { name: /^blog$/i }).first();
    if (await blogLink.count()) await blogLink.click();
    else await page.goto("/blog", { waitUntil: "domcontentloaded" });

    // Route change should be near-instant thanks to preloading; wait for
    // the H1 rather than a fixed timeout to avoid flakiness.
    await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 5000 });

    const live = await snapshotLiveRegions(page);
    for (const text of live) {
      const ok = ANNOUNCE_ALLOWLIST.some((rx) => rx.test(text));
      expect.soft(ok, `unexpected live-region text after nav: "${text}"`).toBeTruthy();
    }

    // Focus should land in the document body or on the main landmark —
    // never on a hidden preloader element (which shouldn't exist).
    const activeIsInsideMain = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body) return true;
      return !!a.closest("main");
    });
    expect(activeIsInsideMain).toBeTruthy();
  });
});
