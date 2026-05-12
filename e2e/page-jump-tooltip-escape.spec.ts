import { test, expect } from "../playwright-fixture";

test.describe("Page jump tooltip — Escape closes from multiple focus states", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/blog");
  });

  const openViaClick = async (page: import("@playwright/test").Page) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#page-jump-tip")).toBeVisible();
  };

  test("Escape closes tooltip when the ? button is focused", async ({ page }) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    await button.scrollIntoViewIfNeeded();
    await button.focus(); // onFocus opens tooltip
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#page-jump-tip")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#page-jump-tip")).toBeHidden();
  });

  test("Escape closes tooltip when focus is on document body", async ({ page }) => {
    await openViaClick(page);

    // Move focus away from the button to the body
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.evaluate(() => document.body.focus());

    await page.keyboard.press("Escape");

    await expect(page.locator('button[aria-controls="page-jump-tip"]')).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.locator("#page-jump-tip")).toBeHidden();
  });

  test("Escape closes tooltip when another interactive element is focused", async ({ page }) => {
    await openViaClick(page);

    // Focus a different element on the page (e.g. a link or input)
    const otherFocusable = page.locator("a, button, input, [tabindex]").first();
    await otherFocusable.focus();

    await page.keyboard.press("Escape");

    await expect(page.locator('button[aria-controls="page-jump-tip"]')).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.locator("#page-jump-tip")).toBeHidden();
  });
});
