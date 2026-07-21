// Playwright crawler over every prerendered city route.
//
// Serves dist/ with a tiny built-in Node http server, then for each city
// slug loads the URL in Chromium with JavaScript DISABLED so we see exactly
// what Googlebot/Bingbot see when they don't execute React. Asserts:
//   - HTTP 200
//   - <title> contains city name + "PlowWow"
//   - <link rel="canonical"> is absolute + self-referencing
//   - <h1> contains the city name
//   - Rendered body text is materially different from the homepage
//
// Fails (exit 1) on any violation. Emits seo-report/prerender-crawl.json.

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { chromium } from "@playwright/test";
import { cities } from "../src/data/cities";

const DIST = resolve("dist");
if (!existsSync(DIST)) {
  console.error("dist/ not found — run `vite build && tsx scripts/prerender.ts` first.");
  process.exit(1);
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function serveDist(port: number) {
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);
      let p = decodeURIComponent(url.pathname);
      if (p.endsWith("/")) p += "index.html";
      let file = join(DIST, p);
      if (!existsSync(file) || !statSync(file).isFile()) {
        const alt = join(DIST, p, "index.html");
        if (existsSync(alt)) file = alt;
        else {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
      }
      res.statusCode = 200;
      res.setHeader("content-type", MIME[extname(file)] ?? "application/octet-stream");
      res.end(readFileSync(file));
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e));
    }
  });
  return new Promise<{ close: () => Promise<void> }>((r) => {
    server.listen(port, () => {
      r({ close: () => new Promise((rr) => server.close(() => rr())) });
    });
  });
}

const PORT = 4187;
const BASE = `http://localhost:${PORT}`;

type Target = { slug: string; name: string; aliases?: string[] };
const targets: Target[] = [
  { slug: "burnaby-snow-removal", name: "Burnaby" },
  { slug: "burnaby", name: "Burnaby" },
  ...cities.map((c) => ({
    slug: c.slug,
    name: c.name,
    aliases: c.slug === "new-westminster" ? ["New West"] : undefined,
  })),
];

const matches = (h: string, t: Target) => {
  const names = [t.name, ...(t.aliases ?? [])];
  return names.some((n) => h.toLowerCase().includes(n.toLowerCase()));
};

async function main() {
  const server = await serveDist(PORT);

  // Fetch homepage body once (JS disabled) as the "must differ" baseline.
  const browser = await chromium.launch({ headless: true });
  const uaCtx = await browser.newContext({
    javaScriptEnabled: false,
    userAgent:
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  });

  const homePage = await uaCtx.newPage();
  const homeResp = await homePage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  if (!homeResp || homeResp.status() !== 200) {
    console.error("failed to load homepage");
    process.exit(1);
  }
  const homeBody = (await homePage.locator("main[data-prerendered]").innerText().catch(() => "")).trim();
  await homePage.close();

  const results: {
    slug: string;
    ok: boolean;
    problems: string[];
  }[] = [];

  for (const t of targets) {
    const file = resolve(DIST, t.slug, "index.html");
    if (!existsSync(file)) continue;

    const page = await uaCtx.newPage();
    const url = `${BASE}/${t.slug}/`;
    const expectedCanonical = `https://plowwow.com/${t.slug}/`;
    const problems: string[] = [];

    const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
    if (!resp || resp.status() !== 200) problems.push(`HTTP ${resp?.status()}`);

    const title = await page.title();
    if (!matches(title, t) || !/PlowWow/i.test(title))
      problems.push(`title bad: ${title}`);

    const canonical = await page
      .locator('link[rel="canonical"]')
      .first()
      .getAttribute("href")
      .catch(() => null);
    if (!canonical || canonical.replace(/\/+$/, "") !== expectedCanonical.replace(/\/+$/, ""))
      problems.push(`canonical bad: ${canonical}`);

    const h1 = (await page.locator("h1").first().innerText().catch(() => "")).trim();
    if (!h1) problems.push("no <h1>");
    else if (!matches(h1, t)) problems.push(`h1 missing "${t.name}": ${h1}`);

    const body = (await page.locator("main[data-prerendered]").innerText().catch(() => "")).trim();
    if (!body) problems.push("no prerendered <main>");
    else if (homeBody && body === homeBody)
      problems.push("body identical to homepage");

    results.push({ slug: t.slug, ok: problems.length === 0, problems });
    await page.close();
  }

  await browser.close();
  await server.close();

  mkdirSync(resolve("seo-report"), { recursive: true });
  const failed = results.filter((r) => !r.ok);
  writeFileSync(
    resolve("seo-report/prerender-crawl.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), checked: results.length, passed: results.length - failed.length, failed },
      null,
      2,
    ),
  );

  if (failed.length) {
    console.error(`\n✗ prerender-crawl: ${failed.length}/${results.length} city route(s) fail crawler checks:\n`);
    for (const r of failed) {
      console.error(`  /${r.slug}/`);
      for (const p of r.problems) console.error(`    - ${p}`);
    }
    console.error(`\nSee seo-report/prerender-crawl.json for machine output.`);
    process.exit(1);
  }

  console.log(
    `✓ prerender-crawl: ${results.length} city route(s) render correct title/canonical/H1/unique body to a JS-disabled Googlebot.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
