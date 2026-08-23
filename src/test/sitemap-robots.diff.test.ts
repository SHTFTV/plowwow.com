import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { collectRoutes, BASE_URL } from "../../scripts/routes";

// Rules the generated sitemap index, child sitemaps, and robots.txt MUST satisfy.
const MUST_INCLUDE = ["/guest-post", "/seo-report", "/blog", "/"];
const MUST_EXCLUDE_FROM_SITEMAP = ["/auth", "/admin"];
const MUST_DISALLOW_IN_ROBOTS = ["/auth", "/admin"];

const publicDir = resolve(process.cwd(), "public");
const sitemapIndex = readFileSync(resolve(publicDir, "sitemap.xml"), "utf8");
const robots = readFileSync(resolve(publicDir, "robots.txt"), "utf8");

const indexLocs = Array.from(sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
const childSitemapFiles = indexLocs
  .filter((loc) => loc.startsWith(`${BASE_URL}/sitemap-`) && loc.endsWith(".xml"))
  .map((loc) => basename(new URL(loc).pathname))
  .filter((name) => name !== "sitemap-images.xml");

const normalizeUrl = (url: string) => {
  if (url === `${BASE_URL}/`) return url;
  return url.replace(/\/$/, "");
};

const locs = childSitemapFiles.flatMap((file) => {
  const xml = readFileSync(resolve(publicDir, file), "utf8");
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => normalizeUrl(m[1]));
});

describe("sitemap.xml diff vs expected route rules", () => {
  it("is a sitemap index that references child sitemap files", () => {
    expect(sitemapIndex).toContain("<sitemapindex");
    expect(childSitemapFiles.length).toBeGreaterThan(0);
  });

  it("includes every required public route", () => {
    for (const path of MUST_INCLUDE) {
      expect(locs, `expected sitemap children to include ${path}`).toContain(`${BASE_URL}${path}`);
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
    const missing = [...expected].filter((u) => !actual.has(u));
    expect(missing, `sitemap missing routes: ${missing.slice(0, 5).join(", ")}`).toEqual([]);
    const extra = [...actual].filter((u) => !expected.has(u));
    expect(extra, `sitemap has orphaned entries: ${extra.slice(0, 5).join(", ")}`).toEqual([]);
  });

  it("has no duplicate page <loc> entries across child sitemaps", () => {
    expect(new Set(locs).size).toBe(locs.length);
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
    const ua = robots.split(/User-agent:\s*\*/i)[1] ?? "";
    const firstBlock = ua.split(/User-agent:/i)[0];
    expect(firstBlock).not.toMatch(/^\s*Disallow:\s*\/\s*$/m);
  });

  it("references the absolute sitemap URL", () => {
    expect(robots).toMatch(new RegExp(`Sitemap:\\s*${BASE_URL}/sitemap\\.xml`));
  });
});
