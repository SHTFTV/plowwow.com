// Per-route prerender content validator.
//
// For every city route (static /burnaby + every entry in src/data/cities),
// asserts the built dist/<slug>/index.html satisfies:
//   1. <title> contains the city name AND "PlowWow"
//   2. <link rel="canonical"> is absolute and self-references the URL
//   3. Prerendered <h1> contains the city name
//   4. Body content (prerendered #root main) differs from dist/index.html
//   5. og:title, og:url, og:image, twitter:title, twitter:image are set and
//      the OG image is an absolute https:// URL
//   6. A LocalBusiness JSON-LD block is present containing a PostalAddress
//
// Fails the build (exit 1) on any violation.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { cities } from "../src/data/cities";

const DIST = resolve("dist");
const HOME_HTML = readFileSync(resolve(DIST, "index.html"), "utf8");
const HOME_MAIN = HOME_HTML.match(/<main[^>]*data-prerendered="\/"[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";

type Target = { slug: string; name: string };

const targets: Target[] = [
  { slug: "burnaby-snow-removal", name: "Burnaby" },
  { slug: "burnaby", name: "Burnaby" },
  ...cities.map((c) => ({ slug: c.slug, name: c.name })),
];

const failures: string[] = [];
const passed: string[] = [];

for (const t of targets) {
  const file = resolve(DIST, t.slug, "index.html");
  if (!existsSync(file)) {
    // Not every legacy slug ships as a directory — skip silently.
    continue;
  }
  const html = readFileSync(file, "utf8");
  const url = `https://plowwow.com/${t.slug}/`;

  const problems: string[] = [];

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  if (!title.includes(t.name)) problems.push(`title missing "${t.name}": ${title}`);
  if (!/PlowWow/i.test(title)) problems.push(`title missing "PlowWow": ${title}`);

  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1] ?? "";
  if (canonical.replace(/\/+$/, "") !== url.replace(/\/+$/, ""))
    problems.push(`canonical mismatch: expected ${url}, got ${canonical}`);

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  if (!h1) problems.push(`missing <h1>`);
  else if (!h1.toLowerCase().includes(t.name.toLowerCase()))
    problems.push(`h1 missing "${t.name}": ${h1}`);

  const main =
    html.match(/<main[^>]*data-prerendered="\/[^"]*"[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
  if (!main) problems.push(`missing prerendered <main>`);
  else if (HOME_MAIN && main.trim() === HOME_MAIN.trim())
    problems.push(`body content matches homepage (not route-specific)`);

  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/)?.[1] ?? "";
  const ogUrl = html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/)?.[1] ?? "";
  const ogImg = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/)?.[1] ?? "";
  const twTitle = html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"/)?.[1] ?? "";
  const twImg = html.match(/<meta\s+name="twitter:image"\s+content="([^"]*)"/)?.[1] ?? "";
  if (!ogTitle.includes(t.name)) problems.push(`og:title missing "${t.name}": ${ogTitle}`);
  if (ogUrl.replace(/\/+$/, "") !== url.replace(/\/+$/, ""))
    problems.push(`og:url mismatch: expected ${url}, got ${ogUrl}`);
  if (!/^https:\/\//.test(ogImg)) problems.push(`og:image not absolute https: ${ogImg}`);
  if (!twTitle.includes(t.name)) problems.push(`twitter:title missing "${t.name}": ${twTitle}`);
  if (!/^https:\/\//.test(twImg)) problems.push(`twitter:image not absolute https: ${twImg}`);

  const hasLocalBusiness = /"@type"\s*:\s*(?:"LocalBusiness"|\[[^\]]*"LocalBusiness"[^\]]*\])/.test(
    html,
  );
  const hasPostalAddress = /"@type"\s*:\s*"PostalAddress"/.test(html);
  if (!hasLocalBusiness) problems.push(`missing LocalBusiness JSON-LD`);
  if (!hasPostalAddress) problems.push(`missing PostalAddress JSON-LD`);

  if (problems.length) failures.push(`✗ /${t.slug}/\n    - ${problems.join("\n    - ")}`);
  else passed.push(`/${t.slug}/`);
}

mkdirSync(resolve("seo-report"), { recursive: true });
writeFileSync(
  resolve("seo-report/prerender-content.json"),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), passed, failures },
    null,
    2,
  ),
);

if (failures.length) {
  console.error(
    `\n✗ prerender-content-validate: ${failures.length} route(s) failed content checks:\n`,
  );
  for (const f of failures) console.error(f);
  console.error(`\nSee seo-report/prerender-content.json for machine output.`);
  process.exit(1);
}

console.log(
  `✓ prerender-content-validate: ${passed.length} city route(s) have unique title/canonical/H1/body + OG/Twitter + LocalBusiness+PostalAddress.`,
);
