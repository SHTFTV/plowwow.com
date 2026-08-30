import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectRoutes, BASE_URL } from "../../scripts/routes";

// Rules the generated sitemap.xml and robots.txt MUST satisfy.
const MUST_INCLUDE = ["/guest-post", "/seo-report", "/blog", "/"];
const MUST_EXCLUDE_FROM_SITEMAP = ["/auth", "/admin"];
const MUST_DISALLOW_IN_ROBOTS = ["/auth", "/admin"];

const routeSitemaps = ["sitemap-static.xml", "sitemap-cities.xml", "sitemap-blog.xml", "sitemap-neighborhoods.xml", "sitemap-tags.xml", "sitemap-pages.xml"];
const sitemap = routeSitemaps.map((file) => readFileSync(resolve(process.cwd(), "public", file), "utf8")).join("\n");
const robots = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");
const normalizeUrl = (url: string) => url === `${BASE_URL}/` ? url : url.replace(/\/$/, "");
const locs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => normalizeUrl(m[1]));

describe("sitemap.xml diff vs expected route rules", () => {
  it("includes every required public route", () => {
    for (const path of MUST_INCLUDE) {
      expect(locs, `expected sitemap to include ${path}`).toContain(`${BASE_URL}${path}`);
    }
  });

  it("excludes every private/protected route", () => {
    for (const path of MUST_EXCLUDE_FROM_SITEMAP) {
      const url = `${BASE_URL}${path}`;
      expect(locs.some((l) => l === url || l.startsWith(url + "/")),
        `sitemap must not list ${path}`).toBe(false);
    }
  });

  it("uses only absolute plowwow.com URLs (no relative or preview hosts)", () => {
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) expect(loc.startsWith(`${BASE_URL}/`)).toBe(true);
  });

  it("stays in sync with collectRoutes() (no orphaned or missing entries)", () => {
    const expected = new Set(collectRoutes().map((r) => `${BASE_URL}${r.path}`));
    const actual = new Set(locs);
    // Every collected route must be in sitemap.
    const missing = [...expected].filter((u) => !actual.has(u));
    expect(missing, `sitemap missing routes: ${missing.slice(0, 5).join(", ")}`).toEqual([]);
    // Every sitemap entry must correspond to a real route (or be an intentional extra).
    const extra = [...actual].filter((u) => !expected.has(u));
    expect(extra, `sitemap has orphaned entries: ${extra.slice(0, 5).join(", ")}`).toEqual([]);
  });

  it("has no duplicate <loc> entries", () => {
    for (const file of routeSitemaps) {
      const xml = readFileSync(resolve(process.cwd(), "public", file), "utf8");
      const fileLocs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => normalizeUrl(m[1]));
      expect(new Set(fileLocs).size, `${file} contains duplicate routes`).toBe(fileLocs.length);
    }
  });
});

describe("robots.txt diff vs expected crawler rules", () => {
  it("disallows every protected path", () => {
    for (const path of MUST_DISALLOW_IN_ROBOTS) {
      const re = new RegExp(`Disallow:\\s*${path}\\b`);
      expect(robots).toMatch(re);
    }
  });

  it("does NOT globally block crawlers", () => {
    // A bare `Disallow: /` under `User-agent: *` would kill indexing.
    const ua = robots.split(/User-agent:\s*\*/i)[1] ?? "";
    const firstBlock = ua.split(/User-agent:/i)[0];
    expect(firstBlock).not.toMatch(/^\s*Disallow:\s*\/\s*$/m);
  });

  it("references the absolute sitemap URL", () => {
    expect(robots).toMatch(new RegExp(`Sitemap:\\s*${BASE_URL}/sitemap\\.xml`));
  });
});
