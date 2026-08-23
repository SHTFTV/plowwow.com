// Generate a sitemap INDEX plus split child sitemaps from the shared route list.
// Runs via `prebuild` (and `predev` for local parity).
//
// Outputs (all under /public):
//   sitemap.xml            — <sitemapindex> referencing the child sitemaps
//   sitemap-static.xml     — home + top-level static pages (blog hub, quote, etc.)
//   sitemap-cities.xml     — every /:citySlug landing page
//   sitemap-blog.xml       — every /blog/* and legacy-blog neighborhood post
//   sitemap-pages.xml      — remaining legacy content pages
//
// public/sitemap-images.xml is generated separately and is referenced from the
// sitemap index as well so image discovery scales as posts grow.

import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { BASE_URL, collectRoutes, type RouteMeta } from "./routes";
import { SUPPORTED_LOCALES, X_DEFAULT_LOCALE, localizedUrl } from "./lib/locales";

const today = new Date().toISOString().slice(0, 10);
const withSlash = (p: string) => (p === "/" ? "/" : p.endsWith("/") ? p : `${p}/`);

const routes = Array.from(
  new Map(collectRoutes().map((r) => [r.path, r])).values(),
);

const priorityFor = (r: RouteMeta) =>
  r.path === "/" ? "1.0" : r.kind === "city" || r.kind === "static" ? "0.8" : "0.6";

function urlBlock(r: RouteMeta): string {
  // Query-string routes (e.g. tag listings) must not be slash-normalized or
  // hreflang-fanned — they're single-locale filter views.
  if (r.path.includes("?")) {
    return [
      "  <url>",
      `    <loc>${BASE_URL}${r.path}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>weekly</changefreq>`,
      `    <priority>0.5</priority>`,
      "  </url>",
    ].join("\n");
  }
  const path = withSlash(r.path);
  const hreflangLinks = [
    ...SUPPORTED_LOCALES.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${localizedUrl(BASE_URL, path, l)}" />`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${localizedUrl(BASE_URL, path, X_DEFAULT_LOCALE)}" />`,
  ];
  return [
    "  <url>",
    `    <loc>${BASE_URL}${path}</loc>`,
    ...hreflangLinks,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>weekly</changefreq>`,
    `    <priority>${priorityFor(r)}</priority>`,
    "  </url>",
  ].join("\n");
}

function writeUrlset(filename: string, subset: RouteMeta[]) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${subset.map(urlBlock).join("\n")}
</urlset>
`;
  writeFileSync(resolve("public", filename), xml);
  console.log(`✓ ${filename} (${subset.length} urls)`);
}

// --- Split routes into mutually-exclusive buckets ------------------------------
const staticRoutes = routes.filter((r) => r.kind === "static");
const cityRoutes = routes.filter((r) => r.kind === "city");
const allBlogRoutes = routes.filter((r) => r.kind === "legacy-blog");
const pageRoutes = routes.filter((r) => r.kind === "legacy-page");

// Neighborhood posts = blog posts whose slug matches a known neighborhood/city
// token. Kept in sync (by hand) with NEIGHBORHOOD_HINTS in src/pages/BlogIndex.tsx.
const NEIGHBORHOOD_HINTS = [
  "burnaby", "vancouver", "richmond", "surrey", "delta", "langley", "coquitlam",
  "port-coquitlam", "port-moody", "maple-ridge", "pitt-meadows", "new-westminster",
  "north-vancouver", "west-vancouver", "squamish", "tsawwassen", "abbotsford",
  "chilliwack", "mission", "white-rock", "anmore", "belcarra", "lynn-valley",
  "steveston", "fort-langley", "cloverdale", "metrotown", "kerrisdale",
  "shaughnessy", "killarney", "edmonds", "burquitlam", "champlain", "renfrew",
  "kensington", "arbutus", "sapperton", "burke-mountain", "heritage-mountain",
  "silver-valley", "buckingham", "middlegate", "middle-gate", "sfu", "edgemont",
  "deep-cove", "lonsdale", "queensborough", "fleetwood", "ladner",
];
const neighborhoodRoutes = allBlogRoutes.filter((r) => {
  const slug = r.path.replace(/^\/(blog\/)?/, "").replace(/\/$/, "").toLowerCase();
  return NEIGHBORHOOD_HINTS.some((h) => slug.includes(h));
});
const neighborhoodPaths = new Set(neighborhoodRoutes.map((r) => r.path));
// A URL belongs to exactly one page sitemap. Neighborhood posts are removed from
// the general blog bucket so sitemap consumers never see duplicate page <loc>s.
const blogRoutes = allBlogRoutes.filter((r) => !neighborhoodPaths.has(r.path));

// Blog tag / category listing pages are now path-based static routes
// (`/blog/tag/<slug>/`), so they flow through `staticRoutes` above and each
// has its own prerendered directory with a self-referencing canonical.
const tagRoutes: RouteMeta[] = staticRoutes.filter((r) => r.path.startsWith("/blog/tag/"));
const nonTagStaticRoutes = staticRoutes.filter((r) => !r.path.startsWith("/blog/tag/"));

writeUrlset("sitemap-static.xml", nonTagStaticRoutes);
writeUrlset("sitemap-cities.xml", cityRoutes);
writeUrlset("sitemap-blog.xml", blogRoutes);
if (neighborhoodRoutes.length) writeUrlset("sitemap-neighborhoods.xml", neighborhoodRoutes);
writeUrlset("sitemap-tags.xml", tagRoutes);
if (pageRoutes.length) writeUrlset("sitemap-pages.xml", pageRoutes);

// --- Sitemap index -------------------------------------------------------------
const children = [
  "sitemap-static.xml",
  "sitemap-cities.xml",
  "sitemap-blog.xml",
  neighborhoodRoutes.length ? "sitemap-neighborhoods.xml" : null,
  "sitemap-tags.xml",
  pageRoutes.length ? "sitemap-pages.xml" : null,
  existsSync(resolve("public/sitemap-images.xml")) ? "sitemap-images.xml" : null,
].filter(Boolean) as string[];

const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children
  .map(
    (f) => `  <sitemap>
    <loc>${BASE_URL}/${f}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>
`;
writeFileSync(resolve("public/sitemap.xml"), indexXml);
console.log(`✓ sitemap.xml index (${children.length} child sitemaps)`);