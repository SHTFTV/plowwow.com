import { test, expect } from "../playwright-fixture";
import { Page } from "@playwright/test";

async function skipToFaqAndExpandFirstAccordion(page: Page) {
  const skipLink = page.locator('a:has-text("Skip to FAQ")');
  await skipLink.focus();
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");

  const firstAccordionButton = page.locator('button', { hasText: 'What is the best snow removal software for contractors?' });
  await expect(firstAccordionButton).toBeFocused();
  await expect(firstAccordionButton).toHaveAttribute("aria-expanded", "false");

  await page.keyboard.press("Enter");
  await expect(firstAccordionButton).toHaveAttribute("aria-expanded", "true");
  await expect(firstAccordionButton).toBeFocused();

  await page.keyboard.press("Tab");
  const secondAccordionButton = page.locator('button', { hasText: 'How much does snow removal software cost?' });
  await expect(secondAccordionButton).toBeFocused();

  const firstAccordionItem = page.locator('div[data-state]').filter({ has: firstAccordionButton });
  const firstAccordionContent = firstAccordionItem.locator('div[role="region"]');

  return { firstAccordionButton, secondAccordionButton, firstAccordionItem, firstAccordionContent };
}

test.describe("App Features — Skip links focus restoration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/advanced-technology");
  });

  test("Skip to FAQ → Tab to second accordion keeps first content visible", async ({ page }) => {
    const { firstAccordionButton, secondAccordionButton, firstAccordionItem, firstAccordionContent } =
      await skipToFaqAndExpandFirstAccordion(page);

    await expect(firstAccordionButton).toHaveAttribute("aria-expanded", "true");
    await expect(secondAccordionButton).toHaveAttribute("aria-expanded", "false");
    await expect(firstAccordionItem).toHaveAttribute("data-state", "open");
    await expect(firstAccordionContent).toBeVisible();
  });

  test("Shift+Tab from second accordion back to first keeps first content visible", async ({ page }) => {
    const { firstAccordionButton, secondAccordionButton, firstAccordionItem, firstAccordionContent } =
      await skipToFaqAndExpandFirstAccordion(page);

    await expect(secondAccordionButton).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Shift+Tab");
    await expect(firstAccordionButton).toBeFocused();

    await expect(firstAccordionItem).toHaveAttribute("data-state", "open");
    await expect(firstAccordionContent).toBeVisible();

    const secondAccordionItem = page.locator('div[data-state]').filter({ has: secondAccordionButton });
    await expect(secondAccordionItem).toHaveAttribute("data-state", "closed");
  });

  test("Back to top focuses the H1 heading and Tab order continues", async ({ page }) => {
    const backToTop = page.locator('a:has-text("Back to top")');
    await backToTop.focus();
    await expect(backToTop).toBeFocused();

    await page.keyboard.press("Enter");

    const h1 = page.locator('#app-hero-heading');
    await expect(h1).toBeFocused();

    await page.keyboard.press("Tab");
    const tryItFree = page.locator('a:has-text("Try It Free")').first();
    await expect(tryItFree).toBeFocused();
  });

  test("Skip to FAQ falls back to the FAQ heading when accordion buttons are absent", async ({ page }) => {
    await page.evaluate(() => {
      document.querySelectorAll('#faq button[aria-expanded]').forEach((btn) => btn.remove());
    });

    const buttons = page.locator('#faq button[aria-expanded]');
    await expect(buttons).toHaveCount(0);

    const skipLink = page.locator('a:has-text("Skip to FAQ")');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    await page.keyboard.press("Enter");

    const faqHeading = page.locator('#faq-heading');
    await expect(faqHeading).toBeFocused();

    await page.keyboard.press("Tab");
    const backToTop = page.locator('a:has-text("Back to top")');
    await expect(backToTop).toBeFocused();
  });
});
