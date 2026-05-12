import { test, expect } from "../playwright-fixture";

test.describe("Page jump tooltip — Escape closes from multiple focus states", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/blog");
  });

  const assertButtonAriaInvariants = async (page: import("@playwright/test").Page) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    // aria-controls must always point at the tooltip id, regardless of open state.
    await expect(button).toHaveAttribute("aria-controls", "page-jump-tip");
    await expect(button).toHaveCount(1);
  };

  const assertTooltipOpen = async (page: import("@playwright/test").Page) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    const tip = page.locator("#page-jump-tip");
    await assertButtonAriaInvariants(page);
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(tip).toBeVisible();
    await expect(tip).toHaveAttribute("role", "tooltip");
    await expect(tip).toHaveAttribute("id", "page-jump-tip");
  };

  const assertTooltipClosed = async (page: import("@playwright/test").Page) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    await assertButtonAriaInvariants(page);
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#page-jump-tip")).toBeHidden();
  };

  const openViaClick = async (page: import("@playwright/test").Page) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await assertTooltipOpen(page);
  };

  test("Focus returns to ? button after Escape closes the tooltip", async ({ page }) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    await openViaClick(page);

    // Move focus elsewhere while tooltip is open.
    const otherFocusable = page.locator("a, button, input, [tabindex]")
      .filter({ hasNot: page.locator('[aria-controls="page-jump-tip"]') })
      .first();
    await otherFocusable.focus();
    await assertTooltipOpen(page);

    await page.keyboard.press("Escape");

    await assertTooltipClosed(page);
    await expect(button).toBeFocused();
  });

  test("Escape closes tooltip and restores focus to ? button when focus is inside the tooltip", async ({ page }) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    await openViaClick(page);

    // Focus an element inside the tooltip.
    const tip = page.locator("#page-jump-tip");
    const innerFocusable = tip.locator("a, button, input, [tabindex]").first();
    await innerFocusable.waitFor({ state: "visible" });
    await innerFocusable.focus();
    await expect(innerFocusable).toBeFocused();
    await assertTooltipOpen(page);

    await page.keyboard.press("Escape");

    await assertTooltipClosed(page);
    await expect(button).toBeFocused();
  });

  test("Focus returns to ? button after Escape when focus was on document.body", async ({ page }) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    await openViaClick(page);

    // Blur active element and move focus to <body>.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.evaluate(() => document.body.focus());
    await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await assertTooltipOpen(page);

    await page.keyboard.press("Escape");

    await assertTooltipClosed(page);
    await expect(button).toBeFocused();
  });

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

  test("Escape still closes tooltip after cycling focus with Tab", async ({ page }) => {
    await openViaClick(page);

    const button = page.locator('button[aria-controls="page-jump-tip"]');
    await button.focus();

    // Cycle focus several times with Tab — tooltip should remain open.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("#page-jump-tip")).toBeVisible();
    }

    // Shift+Tab a couple times as well.
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press("Shift+Tab");
      await expect(button).toHaveAttribute("aria-expanded", "true");
    }

    // Escape from wherever focus has landed must still close it.
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#page-jump-tip")).toBeHidden();
  test("Enter while focus is inside the tooltip keeps it open; Escape then restores focus to ? button", async ({ page }) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    const tip = page.locator("#page-jump-tip");

    await openViaClick(page);

    // Focus trap moves focus to the tooltip body on Tab from the ? button.
    await button.focus();
    await page.keyboard.press("Tab");
    await expect.poll(() =>
      page.evaluate(() => document.activeElement?.id ?? null),
    ).toBe("page-jump-tip");
    await assertTooltipOpen(page);

    // Pressing Enter inside the tooltip must not close it or move focus away.
    await page.keyboard.press("Enter");
    await assertTooltipOpen(page);
    await expect.poll(() =>
      page.evaluate(() => document.activeElement?.id ?? null),
    ).toBe("page-jump-tip");

    // A second Enter — still no-op, still open, still focused inside.
    await page.keyboard.press("Enter");
    await assertTooltipOpen(page);
    await expect.poll(() =>
      page.evaluate(() => document.activeElement?.id ?? null),
    ).toBe("page-jump-tip");

    // Escape from inside the tooltip must close it and restore focus to ?.
    await page.keyboard.press("Escape");
    await assertTooltipClosed(page);
    await expect(button).toBeFocused();
    await expect(tip).toBeHidden();
  });

  test("Tab and Shift+Tab cycle focus while tooltip is open, Escape returns focus to ? button", async ({ page }) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    await button.scrollIntoViewIfNeeded();
    await button.focus(); // onFocus opens tooltip
    await assertTooltipOpen(page);
    await expect(button).toBeFocused();

    const isButtonActive = () =>
      page.evaluate(
        () => document.activeElement?.getAttribute("aria-controls") === "page-jump-tip",
      );
    expect(await isButtonActive()).toBe(true);

    // Tab forward — focus must move off the ? button.
    await page.keyboard.press("Tab");
    expect(await isButtonActive()).toBe(false);
    const afterTab = await page.evaluate(() => document.activeElement?.tagName ?? null);
    expect(afterTab).not.toBeNull();

    // Tab forward again — focus advances to a different element (cycling forward).
    await page.keyboard.press("Tab");
    const afterSecondTab = await page.evaluate(
      () => document.activeElement?.outerHTML?.slice(0, 200) ?? null,
    );
    expect(afterSecondTab).not.toBeNull();
    expect(afterSecondTab).not.toBe(afterTab);

    // Shift+Tab back twice — focus must return to the ? button (cycling backward).
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(button).toBeFocused();
    await assertTooltipOpen(page);

    // Tab off the button once more, then Escape — focus must return to the ? button.
    await page.keyboard.press("Tab");
    expect(await isButtonActive()).toBe(false);

    await page.keyboard.press("Escape");
    await assertTooltipClosed(page);
    await expect(button).toBeFocused();
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

  test("Space while focus is inside the tooltip keeps it open; Escape then restores focus to ? button", async ({ page }) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    const tip = page.locator("#page-jump-tip");

    await openViaClick(page);

    // Focus trap moves focus to the tooltip body on Tab from the ? button.
    await button.focus();
    await page.keyboard.press("Tab");
    await expect.poll(() =>
      page.evaluate(() => document.activeElement?.id ?? null),
    ).toBe("page-jump-tip");
    await assertTooltipOpen(page);

    // Pressing Space inside the tooltip must not close it or move focus away.
    await page.keyboard.press("Space");
    await assertTooltipOpen(page);
    await expect.poll(() =>
      page.evaluate(() => document.activeElement?.id ?? null),
    ).toBe("page-jump-tip");

    // A second Space — still no-op, still open, still focused inside.
    await page.keyboard.press("Space");
    await assertTooltipOpen(page);
    await expect.poll(() =>
      page.evaluate(() => document.activeElement?.id ?? null),
    ).toBe("page-jump-tip");

    // The page must not have scrolled away from the tooltip as a side effect of Space.
    await expect(tip).toBeInViewport();

    // Escape from inside the tooltip must close it and restore focus to ?.
    await page.keyboard.press("Escape");
    await assertTooltipClosed(page);
    await expect(button).toBeFocused();
    await expect(tip).toBeHidden();
  });

  test("Arrow keys inside the tooltip keep it open; Escape then restores focus to ? button", async ({ page }) => {
    const button = page.locator('button[aria-controls="page-jump-tip"]');
    const tip = page.locator("#page-jump-tip");

    await openViaClick(page);

    // Focus trap moves focus to the tooltip body on Tab from the ? button.
    await button.focus();
    await page.keyboard.press("Tab");
    await expect.poll(() =>
      page.evaluate(() => document.activeElement?.id ?? null),
    ).toBe("page-jump-tip");
    await assertTooltipOpen(page);

    const arrows = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"] as const;
    for (const key of arrows) {
      await page.keyboard.press(key);
      await assertTooltipOpen(page);
      await expect.poll(() =>
        page.evaluate(() => document.activeElement?.id ?? null),
      ).toBe(`page-jump-tip after ${key}` && "page-jump-tip");
      // Tooltip must remain in viewport (no stray arrow-key scroll moved it away).
      await expect(tip).toBeInViewport();
    }

    // Escape from inside the tooltip must close it and restore focus to ?.
    await page.keyboard.press("Escape");
    await assertTooltipClosed(page);
    await expect(button).toBeFocused();
    await expect(tip).toBeHidden();
  });
});
