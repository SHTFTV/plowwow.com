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
    const firstAccordionButton = page.locator('button', { hasText: 'What is the best snow removal software for contractors?' });
    await expect(firstAccordionButton).toBeFocused();
    await expect(firstAccordionButton).toHaveAttribute("aria-expanded", "false");

    // Pressing Enter should expand the first accordion item.
    await page.keyboard.press("Enter");
    await expect(firstAccordionButton).toHaveAttribute("aria-expanded", "true");
    // Focus must remain on the first button after expansion.
    await expect(firstAccordionButton).toBeFocused();

    // Pressing Tab should move focus to the second accordion trigger.
    await page.keyboard.press("Tab");
    const secondAccordionButton = page.locator('button', { hasText: 'How much does snow removal software cost?' });
    await expect(secondAccordionButton).toBeFocused();
    await expect(secondAccordionButton).toHaveAttribute("aria-expanded", "false");
  });

  test("Shift+Tab from second accordion button moves focus back to first", async ({ page }) => {
    // Set up the same state as the first test: skip to FAQ, expand first accordion, Tab to second.
    const skipLink = page.locator('a:has-text("Skip to FAQ")');
    await skipLink.focus();
    await page.keyboard.press("Enter");

    const firstAccordionButton = page.locator('button', { hasText: 'What is the best snow removal software for contractors?' });
    await expect(firstAccordionButton).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(firstAccordionButton).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Tab");
    const secondAccordionButton = page.locator('button', { hasText: 'How much does snow removal software cost?' });
    await expect(secondAccordionButton).toBeFocused();
    await expect(secondAccordionButton).toHaveAttribute("aria-expanded", "false");

    // Pressing Shift+Tab should move focus back to the first accordion trigger.
    await page.keyboard.press("Shift+Tab");
    await expect(firstAccordionButton).toBeFocused();

    // The first accordion panel should remain expanded and its content visible.
    const firstAccordionItem = page.locator('div[data-state]').filter({ has: firstAccordionButton });
    await expect(firstAccordionItem).toHaveAttribute("data-state", "open");
    const firstAccordionContent = firstAccordionItem.locator('div[role="region"]');
    await expect(firstAccordionContent).toBeVisible();

    // The second accordion should remain collapsed.
    await expect(secondAccordionButton).toHaveAttribute("aria-expanded", "false");
    const secondAccordionItem = page.locator('div[data-state]').filter({ has: secondAccordionButton });
    await expect(secondAccordionItem).toHaveAttribute("data-state", "closed");
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
