import { test, expect } from "../playwright-fixture";

// /advanced-technology deliberately presents an honest first-year beta, not the
// retired SaaS FAQ/demo. Keep keyboard access and availability checks aligned
// with the current product contract.
test.describe("Technology beta — accessible, accurate public entry points", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/advanced-technology");
    // The build marks static route markup; createRoot replaces it while lazy
    // modules load. Interact with the mounted client page, not a retiring node.
    await expect(page.locator('main#main-content:not([data-prerendered])')).toBeVisible();
  });

  test("Skip to main content moves keyboard focus to the beta overview", async ({ page }) => {
    const skip = page.getByRole("link", { name: "Skip to main content", exact: true });
    await skip.focus();
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    await expect(page.getByRole("heading", {
      level: 1, name: "Ambitious technology. An honest beta.", exact: true,
    })).toBeVisible();
  });

  test("Primary beta links retain keyboard order and open the current estimator", async ({ page }) => {
    const main = page.getByRole("main");
    const feedback = main.getByRole("link", { name: "Help shape the beta", exact: true });
    await expect(feedback).toHaveAttribute("href", "mailto:wow@plowwow.com?subject=Snow%20Intelligence%20beta%20feedback");
    await feedback.focus();
    await page.keyboard.press("Tab");
    const pricing = main.getByRole("link", { name: "Try the pricing beta", exact: true });
    await expect(pricing).toBeFocused();
    await expect(pricing).toHaveAttribute("href", "/snow-removal-calculator");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/snow-removal-calculator$/);
  });

  test("Each research idea explicitly states that availability is unconfirmed", async ({ page }) => {
    const main = page.getByRole("main");
    for (const name of [
      "EyeSpyR™ · Photo review", "Ghost Curbs · Site-hazard mapping",
      "Weather Brain · Decision support", "Wow-Shield™ · Service records",
      "Billing and material planning", "Municipal references",
    ]) {
      const article = main.getByRole("article").filter({
        has: page.getByRole("heading", { name, exact: true }),
      });
      await expect(article).toBeVisible();
      await expect(article.getByText("Under evaluation · Availability unconfirmed", { exact: true })).toBeVisible();
    }
    const estimate = main.getByRole("article").filter({
      has: page.getByRole("heading", { name: "A starting estimate", exact: true }),
    });
    await expect(estimate).toContainText("not a measured site survey, an accepted contract, a route reservation");
    await expect(estimate.getByRole("link", { name: "See the current estimator →", exact: true }))
      .toHaveAttribute("href", "/snow-removal-calculator");
  });

  test("The concept brief is a real PDF and property access has a working contact destination", async ({ page, request }) => {
    const main = page.getByRole("main");
    const brief = main.getByRole("link", { name: "Read the Wow-branded PDF ↗", exact: true });
    const path = "/downloads/plowwow-snow-intelligence-beta.pdf";
    await expect(brief).toHaveAttribute("href", path);
    await expect(brief).toHaveAttribute("target", "_blank");
    await expect(brief).toHaveAttribute("rel", /noopener/);
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await expect(main.getByRole("link", { name: "Call 604-761-1518 →", exact: true }))
      .toHaveAttribute("href", "tel:+16047611518");
  });
});
