// Playwright + axe-core accessibility scan for /blog/neighborhoods.
// Covers pagination, city filter, and tag filter interactions to ensure
// keyboard navigation and screen-reader labels stay correct.
//
// Runs against the local Vite dev server (http://localhost:8080). Writes
// seo-report/a11y-blog-neighborhoods.{json,md} and exits non-zero if any
// critical/serious axe violations are found or expected ARIA fails.
//
// Usage: bun run a11y:blog-neighborhoods
//        BASE=http://localhost:5173 bun run a11y:blog-neighborhoods

import { chromium, type Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:8080";
const OUT_DIR = resolve("seo-report");
mkdirSync(OUT_DIR, { recursive: true });

type Impact = "minor" | "moderate" | "serious" | "critical";

type Finding = {
  scenario: string;
  url: string;
  axeViolations: { id: string; impact: Impact | null; nodes: number; help: string }[];
  ariaChecks: { name: string; ok: boolean; detail?: string }[];
};

const findings: Finding[] = [];

async function scanPage(page: Page, scenario: string): Promise<Finding> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const axeViolations = results.violations.map((v) => ({
    id: v.id,
    impact: (v.impact ?? null) as Impact | null,
    nodes: v.nodes.length,
    help: v.help,
  }));

  // Structured ARIA/keyboard checks specific to the pagination + filters.
  const ariaChecks: Finding["ariaChecks"] = [];

  const paginationCount = await page.locator('nav[aria-label="Blog pagination"]').count();
  if (paginationCount > 0) {
    ariaChecks.push({ name: "Pagination has aria-label", ok: true });
    const currentBtn = page.locator('nav[aria-label="Blog pagination"] [aria-current="page"]');
    ariaChecks.push({ name: "Pagination has aria-current=page", ok: (await currentBtn.count()) === 1 });

    const prev = page.locator('nav[aria-label="Blog pagination"] button[aria-label="Previous page"]');
    const next = page.locator('nav[aria-label="Blog pagination"] button[aria-label="Next page"]');
    ariaChecks.push({ name: "Previous button labelled", ok: (await prev.count()) === 1 });
    ariaChecks.push({ name: "Next button labelled", ok: (await next.count()) === 1 });

    // 44x44 minimum tap target for pagination buttons.
    const pageBtns = page.locator('nav[aria-label="Blog pagination"] button');
    const count = await pageBtns.count();
    let tooSmall = 0;
    for (let i = 0; i < count; i++) {
      const box = await pageBtns.nth(i).boundingBox();
      if (!box || box.width < 44 || box.height < 44) tooSmall++;
    }
    ariaChecks.push({
      name: "All pagination buttons ≥ 44×44 px",
      ok: tooSmall === 0,
      detail: tooSmall === 0 ? undefined : `${tooSmall} button(s) below target size`,
    });
  } else {
    ariaChecks.push({ name: "Pagination not required (single page)", ok: true });
  }

  const cityGroup = page.locator('[role="group"][aria-label="Filter by neighborhood"]');
  ariaChecks.push({ name: "City filter group labelled", ok: (await cityGroup.count()) === 1 });
  const cityActive = await cityGroup.locator('button[aria-pressed="true"]').count();
  ariaChecks.push({
    name: "City filter exposes aria-pressed",
    ok: cityActive >= 1,
    detail: cityActive >= 1 ? undefined : "no aria-pressed=true button",
  });

  const tagGroupCount = await page.locator('[role="group"][aria-label="Filter by topic"]').count();
  if (tagGroupCount > 0) {
    const active = await page.locator('[role="group"][aria-label="Filter by topic"] button[aria-pressed="true"]').count();
    ariaChecks.push({ name: "Topic filter exposes aria-pressed", ok: active >= 1 });
  }

  // Live region for results heading.
  const live = page.locator("#results-heading[aria-live='polite']");
  ariaChecks.push({ name: "Results heading has aria-live=polite", ok: (await live.count()) === 1 });

  return { scenario, url: page.url(), axeViolations, ariaChecks };
}

async function keyboardOpenNextPage(page: Page) {
  // Tab into pagination, activate Next via Enter.
  const next = page.locator('nav[aria-label="Blog pagination"] button[aria-label="Next page"]');
  await next.focus();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();

  // Scenario 1: default (all neighborhoods, page 1).
  await page.goto(`${BASE}/blog/neighborhoods/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#results-heading");
  findings.push(await scanPage(page, "default"));

  // Scenario 2: keyboard-drive to next page.
  if (await page.locator('nav[aria-label="Blog pagination"] button[aria-label="Next page"]').count()) {
    await keyboardOpenNextPage(page);
    await page.waitForSelector("#results-heading");
    findings.push(await scanPage(page, "page-2 via keyboard"));
  }

  // Scenario 3: city filter — pick Vancouver.
  await page.goto(`${BASE}/blog/neighborhoods/?city=vancouver`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#results-heading");
  findings.push(await scanPage(page, "city=vancouver"));

  // Scenario 4: city + tag filter.
  await page.goto(`${BASE}/blog/neighborhoods/?city=vancouver&tag=Strata`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#results-heading");
  findings.push(await scanPage(page, "city=vancouver&tag=Strata"));

  // Scenario 5: citywide filter.
  await page.goto(`${BASE}/blog/neighborhoods/?city=citywide`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#results-heading");
  findings.push(await scanPage(page, "city=citywide"));

  await browser.close();

  // --- Aggregate + write reports ---------------------------------------------
  const criticalCount = findings.reduce(
    (n, f) => n + f.axeViolations.filter((v) => v.impact === "critical" || v.impact === "serious").length,
    0,
  );
  const ariaFailures = findings.reduce((n, f) => n + f.ariaChecks.filter((c) => !c.ok).length, 0);

  const summary = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    scenarios: findings.length,
    criticalOrSeriousAxe: criticalCount,
    ariaFailures,
    findings,
  };
  writeFileSync(resolve(OUT_DIR, "a11y-blog-neighborhoods.json"), JSON.stringify(summary, null, 2));

  const md: string[] = [
    "# /blog/neighborhoods — Accessibility Scan",
    "",
    `_Generated ${summary.generatedAt}_`,
    "",
    `- Scenarios: **${findings.length}**`,
    `- Critical/serious axe violations: **${criticalCount}**`,
    `- ARIA/keyboard check failures: **${ariaFailures}**`,
    "",
  ];
  for (const f of findings) {
    md.push(`## ${f.scenario}`, "", `\`${f.url}\``, "");
    if (f.axeViolations.length === 0) md.push("_No axe violations._");
    else {
      md.push("### Axe violations", "");
      for (const v of f.axeViolations) md.push(`- **${v.impact ?? "n/a"}** \`${v.id}\` (${v.nodes} node${v.nodes === 1 ? "" : "s"}) — ${v.help}`);
    }
    md.push("", "### ARIA / keyboard checks", "");
    for (const c of f.ariaChecks) md.push(`- ${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    md.push("");
  }
  writeFileSync(resolve(OUT_DIR, "a11y-blog-neighborhoods.md"), md.join("\n"));

  const bar = "─".repeat(60);
  console.log(`\n${bar}`);
  console.log(`/blog/neighborhoods a11y scan`);
  console.log(bar);
  console.log(`  Scenarios          : ${findings.length}`);
  console.log(`  Critical/serious   : ${criticalCount}`);
  console.log(`  ARIA check fails   : ${ariaFailures}`);
  console.log(bar);
  console.log(`Report: seo-report/a11y-blog-neighborhoods.md\n`);

  if (criticalCount > 0 || ariaFailures > 0) {
    console.error("✗ a11y failures — see seo-report/a11y-blog-neighborhoods.md");
    process.exit(1);
  }
  console.log("✓ a11y clean.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
