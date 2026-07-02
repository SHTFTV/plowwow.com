// Generate public/sitemap.xml from the shared route list.
// Runs via `prebuild` (and `predev` for local parity).

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BASE_URL, collectRoutes } from "./routes";

const routes = collectRoutes();
const today = new Date().toISOString().slice(0, 10);

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
      `    <loc>${BASE_URL}${r.path}</loc>`,
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
