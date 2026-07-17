// Post-build: emit dist/404.html — a real static 404 page Netlify
// serves for missing /city/* and /blog/* paths (see netlify.toml).
// Kept dependency-free so it renders even if the SPA bundle fails.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DIST = resolve("dist");
const template = readFileSync(resolve(DIST, "index.html"), "utf8");

const title = "Page not found (404) | PlowWow";
const desc =
  "The page you're looking for doesn't exist. Browse PlowWow snow removal service areas across Metro Vancouver.";

let html = template
  .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
  .replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${desc}" />`,
  );

// Force noindex on the 404 page itself.
html = html.replace(
  /<meta\s+name="robots"[^>]*>/,
  `<meta name="robots" content="noindex, nofollow" />`,
);
if (!/name="robots"/.test(html)) {
  html = html.replace(
    "</head>",
    `  <meta name="robots" content="noindex, nofollow" />\n</head>`,
  );
}

writeFileSync(resolve(DIST, "404.html"), html);
console.log("✓ wrote dist/404.html");
