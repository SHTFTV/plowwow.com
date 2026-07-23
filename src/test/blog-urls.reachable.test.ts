import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { legacyBlogSlugs } from "@/legacy-slug-list";

// Verifies that:
//   1. Every blog slug in the app is prerendered to a canonical /<slug>/index.html
//      that returns 200 when served statically.
//   2. Every canonical /<slug>/ URL is listed in the blog sitemap.
//   3. The /blog/ index page is prerendered (no 404).
//   4. No individual /blog/<slug>/ URLs leak into any sitemap (canonical only).

const DIST = resolve(process.cwd(), "dist");
const SITEMAPS = [
  "sitemap.xml",
  "sitemap-blog.xml",
  "sitemap-static.xml",
  "sitemap-cities.xml",
  "sitemap-neighborhoods.xml",
  "sitemap-pages.xml",
  "sitemap-tags.xml",
];

const distBuilt = existsSync(resolve(DIST, "index.html"));

describe.skipIf(!distBuilt)("blog URL reachability (prerendered dist/)", () => {
  it("/blog/ index is prerendered", () => {
    expect(existsSync(resolve(DIST, "blog", "index.html"))).toBe(true);
  });

  it("every blog slug is prerendered at the canonical /<slug>/", () => {
    const missing = legacyBlogSlugs.filter(
      (slug) => !existsSync(resolve(DIST, slug, "index.html")),
    );
    expect(missing).toEqual([]);
  });

  it("every blog slug appears in sitemap-blog.xml at its canonical URL", () => {
    const xml = readFileSync(resolve(DIST, "sitemap-blog.xml"), "utf8");
    const missing = legacyBlogSlugs.filter(
      (slug) => !xml.includes(`<loc>https://plowwow.com/${slug}/</loc>`),
    );
    expect(missing).toEqual([]);
  });

  it("no sitemap advertises the legacy /blog/<slug>/ URL for a post", () => {
    for (const name of SITEMAPS) {
      const path = resolve(DIST, name);
      if (!existsSync(path)) continue;
      const xml = readFileSync(path, "utf8");
      const leaks = legacyBlogSlugs.filter((slug) =>
        xml.includes(`<loc>https://plowwow.com/blog/${slug}/</loc>`) ||
        xml.includes(`<loc>https://plowwow.com/blog/${slug}</loc>`),
      );
      expect(leaks, `${name} leaks legacy /blog/<slug> URLs`).toEqual([]);
    }
  });
});
