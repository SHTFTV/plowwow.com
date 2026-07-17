// Generate public/sitemap.xml from the shared route list.
// Runs via `prebuild` (and `predev` for local parity).

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BASE_URL, collectRoutes } from "./routes";

// Dedupe by path — a legacy content file may share a slug with a static route.
const routes = Array.from(
  new Map(collectRoutes().map((r) => [r.path, r])).values()
);
const today = new Date().toISOString().slice(0, 10);

// Canonical form: trailing slash on every non-root URL.
const withSlash = (p: string) => (p === "/" ? "/" : p.endsWith("/") ? p : `${p}/`);

const urls = routes
  .map((r) => {
    const priority =
      r.path === "/"
        ? "1.0"
        : r.kind === "city" || r.kind === "static"
          ? "0.8"
          : "0.6";
    return [
      "  <url>",
      `    <loc>${BASE_URL}${withSlash(r.path)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>weekly</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n");
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`✓ sitemap.xml written (${routes.length} routes)`);
