// Emit static HTML for legacy /blog/<slug>/ alias URLs so a real HTTP fetch
// returns the correct post without depending on SPA fallback. Netlify's 301
// (see netlify.toml) still runs first when served from Netlify; this static
// alias is the correct answer for any host that doesn't process netlify.toml
// (Lovable preview, local `vite preview`, mirrors, static hosts).
//
// Strategy: copy the canonical prerendered dist/<slug>/index.html to
// dist/blog/<slug>/index.html and rewrite the canonical / og:url tags to
// point at the canonical /<slug>/ URL. Also inject a <meta http-equiv=refresh>
// fallback so non-JS crawlers that ignore canonical still land on the root URL.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { BASE_URL } from "./routes";

const DIST = resolve("dist");
const BLOG_CONTENT = resolve("src/content/legacy/blog");

if (!existsSync(DIST)) {
  console.error("dist/ not found — run `vite build` first.");
  process.exit(1);
}

const slugs = readdirSync(BLOG_CONTENT)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));

let written = 0;
const skipped: string[] = [];

for (const slug of slugs) {
  const canonicalHtml = resolve(DIST, slug, "index.html");
  if (!existsSync(canonicalHtml)) {
    skipped.push(slug);
    continue;
  }
  const html = readFileSync(canonicalHtml, "utf8");
  const canonicalUrl = `${BASE_URL}/${slug}/`;

  // Inject meta-refresh fallback for non-JS crawlers. Canonical/og:url already
  // point at /<slug>/ because prerender.ts computed them from the route path.
  const withRefresh = html.replace(
    /<head>/i,
    `<head>\n    <meta http-equiv="refresh" content="0; url=${canonicalUrl}">`,
  );

  const outPath = resolve(DIST, "blog", slug, "index.html");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, withRefresh);
  written += 1;
}

console.log(`✓ prerender-blog-aliases: wrote ${written} /blog/<slug>/ files`);
if (skipped.length) {
  console.warn(
    `  (skipped ${skipped.length} slugs with no canonical prerender: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? "…" : ""})`,
  );
}
