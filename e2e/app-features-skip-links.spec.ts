import { test, expect } from "../playwright-fixture";

test.describe("App Features — Skip links focus restoration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/advanced-technology");
  });

  test("Skip to FAQ focuses the first accordion button and Tab order continues", async ({ page }) => {
    // Explicitly focus the skip link (deterministic, no hard-coded Tab count).
    const skipLink = page.locator('a:has-text("Skip to FAQ")');
    await skipLink.focus();
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
    // Explicitly focus the Back to top link (deterministic, no hard-coded Tab count).
    const backToTop = page.locator('a:has-text("Back to top")');
    await backToTop.focus();
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

    // Explicitly focus the skip link (deterministic, no hard-coded Tab count).
    const skipLink = page.locator('a:has-text("Skip to FAQ")');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    // Activate the skip link.
    await page.keyboard.press("Enter");

    // Focus should land on the FAQ heading as the fallback.
    const faqHeading = page.locator('#faq-heading');
    await expect(faqHeading).toBeFocused();

    // After the heading, Tab should move to the Back to top link.
    await page.keyboard.press("Tab");
    const backToTop = page.locator('a:has-text("Back to top")');
    await expect(backToTop).toBeFocused();
  });
});
