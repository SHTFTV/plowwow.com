import { test, expect } from "../playwright-fixture";

test.describe("App Features — Skip links focus restoration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/advanced-technology");
  });

  const getActiveElementInfo = async (page: import("@playwright/test").Page) => {
    return page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        text: (el as HTMLElement).innerText?.slice(0, 100) || null,
        ariaExpanded: el.getAttribute("aria-expanded") || null,
      };
    });
  };

  test("Skip to FAQ focuses the first accordion button and Tab order continues", async ({ page }) => {
    // Tab to reveal and focus the Skip to FAQ link.
    await page.keyboard.press("Tab");
    const skipLink = page.locator('a:has-text("Skip to FAQ")');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();

    // Activate the skip link.
    await page.keyboard.press("Enter");

    // Focus should land on the first accordion trigger button.
    const firstAccordionButton = page.locator('#faq button[aria-expanded]').first();
    await expect(firstAccordionButton).toBeFocused();
    await expect(firstAccordionButton).toHaveAttribute("aria-expanded", "false");

    // Pressing Tab should move focus to the next accordion trigger.
    await page.keyboard.press("Tab");
    const secondAccordionButton = page.locator('#faq button[aria-expanded]').nth(1);
    await expect(secondAccordionButton).toBeFocused();
  });

  test("Back to top focuses the H1 heading and Tab order continues", async ({ page }) => {
    // Tab to Skip to FAQ and activate it to jump to the FAQ section.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    // Tab through all 8 accordion items to reach the Back to top link.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
    }

    const backToTop = page.locator('a:has-text("Back to top")');
    await expect(backToTop).toBeVisible();
    await expect(backToTop).toBeFocused();

    // Activate Back to top.
    await page.keyboard.press("Enter");

    // Focus should land on the H1 heading.
    const h1 = page.locator('#app-hero-heading');
    await expect(h1).toBeFocused();

    // The next Tab should move focus to the "Try It Free" CTA button.
    await page.keyboard.press("Tab");
    const tryItFree = page.locator('a:has-text("Try It Free")').first();
    await expect(tryItFree).toBeFocused();
  });

  test("Skip to FAQ falls back to the FAQ heading when accordion buttons are absent", async ({ page }) => {
    // Remove all accordion trigger buttons from the DOM to force the fallback path.
    await page.evaluate(() => {
      document.querySelectorAll('#faq button[aria-expanded]').forEach((btn) => btn.remove());
    });

    // Verify the buttons are gone.
    const buttons = page.locator('#faq button[aria-expanded]');
    await expect(buttons).toHaveCount(0);

    // Tab to and activate the Skip to FAQ link.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    // Focus should land on the FAQ heading as the fallback.
    const faqHeading = page.locator('#faq-heading');
    await expect(faqHeading).toBeFocused();

    // The next Tab should find no accordion buttons (since we removed them).
    await page.keyboard.press("Tab");
    const activeInfo = await getActiveElementInfo(page);
    // After the heading, Tab should move to the Back to top link (the next focusable
    // element inside the FAQ section container).
    expect(activeInfo?.text).toContain("Back to top");
  });
});
