// Post-build prerender: for every route, take dist/index.html and inject a
// route-specific <title>, meta description, canonical, and OG tags into the
// static <head>, then write it to dist/<path>/index.html.
//
// The client-side React app still runs on load — this only guarantees that
// curl / view-source / non-JS crawlers see unique per-route metadata.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { BASE_URL, collectRoutes, type RouteMeta } from "./routes";

const DIST = resolve("dist");
const TEMPLATE_PATH = resolve(DIST, "index.html");

if (!existsSync(TEMPLATE_PATH)) {
  console.error("dist/index.html not found — run `vite build` first.");
  process.exit(1);
}
const template = readFileSync(TEMPLATE_PATH, "utf8");

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function renderHead(route: RouteMeta): string {
  const canonicalPath = route.path === "/" ? "/" : route.path.endsWith("/") ? route.path : `${route.path}/`;
  const url = `${BASE_URL}${canonicalPath}`;
  const title = esc(route.title);
  const desc = esc(route.description);
  const img = esc(route.ogImage ?? `${BASE_URL}/og-default.jpg`);

  let html = template;

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

  // meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${desc}" />`,
  );

  // canonical
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${url}" />`,
  );

  // OG tags
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${title}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${desc}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${url}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${img}" />`,
  );

  // Twitter
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${desc}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:image" content="${img}" />`,
  );

  // SEO body marker so curl/grep can prove distinct HTML content per route.
  html = html.replace(
    "</body>",
    `<script type="application/ld+json" data-prerendered-route="${route.path}">${JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": route.kind === "legacy-blog" ? "Article" : "WebPage",
        name: route.title,
        headline: route.title,
        description: route.description,
        url,
        image: route.ogImage,
      },
    )}</script>\n</body>`,
  );

  return html;
}

const routes = collectRoutes();
let written = 0;

for (const route of routes) {
  const html = renderHead(route);
  if (route.path === "/") {
    writeFileSync(TEMPLATE_PATH, html);
  } else {
    const outPath = resolve(DIST, route.path.replace(/^\//, ""), "index.html");
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
  }
  written++;
}

console.log(`✓ prerendered ${written} routes into dist/`);
