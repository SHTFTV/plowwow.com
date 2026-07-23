import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { legacyBlogSlugs } from "@/legacy-slug-list";

// Verifies that:
//   1. Every blog slug is listed in sitemap-blog.xml at its canonical /<slug>/ URL.
//   2. No sitemap leaks the legacy /blog/<slug>/ URL for individual posts.
//   3. When dist/ exists, every canonical URL is prerendered to a static
//      index.html (so a real HTTP fetch would return 200) and /blog/ isn't 404.

const PUBLIC_DIR = resolve(process.cwd(), "public");
const DIST_DIR = resolve(process.cwd(), "dist");
const SITEMAPS = [
  "sitemap.xml",
  "sitemap-blog.xml",
  "sitemap-static.xml",
  "sitemap-cities.xml",
  "sitemap-neighborhoods.xml",
  "sitemap-pages.xml",
  "sitemap-tags.xml",
];

describe("blog URL canonicalization in sitemaps", () => {
  it("every blog slug appears in sitemap-blog.xml at its canonical URL", () => {
    const xml = readFileSync(resolve(PUBLIC_DIR, "sitemap-blog.xml"), "utf8");
    const missing = legacyBlogSlugs.filter(
      (slug) => !xml.includes(`<loc>https://plowwow.com/${slug}/</loc>`),
    );
    expect(missing).toEqual([]);
  });

  it("no sitemap advertises legacy /blog/<slug> URLs for individual posts", () => {
    for (const name of SITEMAPS) {
      const path = resolve(PUBLIC_DIR, name);
      if (!existsSync(path)) continue;
      const xml = readFileSync(path, "utf8");
      const leaks = legacyBlogSlugs.filter(
        (slug) =>
          xml.includes(`<loc>https://plowwow.com/blog/${slug}/</loc>`) ||
          xml.includes(`<loc>https://plowwow.com/blog/${slug}</loc>`),
      );
      expect(leaks, `${name} leaks /blog/<slug> URLs`).toEqual([]);
    }
  });
});

const distBuilt = existsSync(resolve(DIST_DIR, "index.html"));

describe("blog URL reachability (prerendered dist/)", () => {
  it.runIf(distBuilt)("/blog/ index is prerendered (not 404)", () => {
    expect(existsSync(resolve(DIST_DIR, "blog", "index.html"))).toBe(true);
  });

  it.runIf(distBuilt)(
    "every blog slug prerenders to /<slug>/index.html (would return 200)",
    () => {
      const missing = legacyBlogSlugs.filter(
        (slug) => !existsSync(resolve(DIST_DIR, slug, "index.html")),
      );
      expect(missing).toEqual([]);
    },
  );
});
