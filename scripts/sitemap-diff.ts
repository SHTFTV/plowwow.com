// Sitemap/robots diff.
//
// Compares the current set of prerendered city + neighborhood URLs
// against a committed baseline (seo-report/sitemap-baseline.json) and
// fails the build when the set changes unexpectedly.
//
// Run with `--update` to accept the current set as the new baseline
// (checked in via `bun run seo:sitemap-baseline`).
//
// This lets CI catch:
//   - a city page silently dropped from public/sitemap-*.xml
//   - a stray/typo neighborhood slug that shouldn't ship yet
//   - robots.txt losing its Sitemap: directives

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const PUBLIC = resolve(ROOT, "public");
const BASELINE = resolve(ROOT, "seo-report/sitemap-baseline.json");
const REPORT = resolve(ROOT, "seo-report/sitemap-diff.json");
const ROBOTS = resolve(PUBLIC, "robots.txt");

const REQUIRED_SITEMAPS = [
  "sitemap.xml",
  "sitemap-cities.xml",
  "sitemap-neighborhoods.xml",
];

function locs(file: string): string[] {
  if (!existsSync(file)) return [];
  const xml = readFileSync(file, "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((u) => !u.endsWith(".xml")); // ignore sitemap index children
}

const cities = locs(resolve(PUBLIC, "sitemap-cities.xml")).sort();
const neighborhoods = locs(resolve(PUBLIC, "sitemap-neighborhoods.xml")).sort();

const robotsTxt = existsSync(ROBOTS) ? readFileSync(ROBOTS, "utf8") : "";
const sitemapDirectives = [...robotsTxt.matchAll(/^Sitemap:\s*(\S+)/gim)]
  .map((m) => m[1])
  .sort();

const current = { cities, neighborhoods, sitemapDirectives };

const update = process.argv.includes("--update");
mkdirSync(resolve(ROOT, "seo-report"), { recursive: true });

if (update || !existsSync(BASELINE)) {
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n");
  console.log(
    `✓ sitemap-diff: baseline ${update ? "updated" : "created"} (` +
      `${cities.length} cities · ${neighborhoods.length} neighborhoods · ` +
      `${sitemapDirectives.length} robots Sitemap: directives)`,
  );
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as typeof current;

function diff(a: string[], b: string[]) {
  const A = new Set(a);
  const B = new Set(b);
  return {
    added: [...B].filter((x) => !A.has(x)),
    removed: [...A].filter((x) => !B.has(x)),
  };
}

const dCities = diff(baseline.cities, cities);
const dNeighborhoods = diff(baseline.neighborhoods, neighborhoods);
const dRobots = diff(baseline.sitemapDirectives, sitemapDirectives);

// Also assert every required child sitemap file exists so a rename can't
// silently break discovery.
const missingSitemaps = REQUIRED_SITEMAPS.filter(
  (f) => !existsSync(resolve(PUBLIC, f)),
);

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    cities: cities.length,
    neighborhoods: neighborhoods.length,
    robotsSitemapDirectives: sitemapDirectives.length,
  },
  cities: dCities,
  neighborhoods: dNeighborhoods,
  robotsSitemapDirectives: dRobots,
  missingSitemaps,
};
writeFileSync(REPORT, JSON.stringify(report, null, 2));

const changes =
  dCities.added.length +
  dCities.removed.length +
  dNeighborhoods.added.length +
  dNeighborhoods.removed.length +
  dRobots.added.length +
  dRobots.removed.length +
  missingSitemaps.length;

if (changes === 0) {
  console.log(
    `✓ sitemap-diff: no changes vs baseline (${cities.length} cities · ${neighborhoods.length} neighborhoods).`,
  );
  process.exit(0);
}

console.error(`\n✗ sitemap-diff: ${changes} unexpected change(s) vs baseline:\n`);
const dump = (label: string, d: { added: string[]; removed: string[] }) => {
  if (d.added.length) {
    console.error(`  + ${label} added (${d.added.length}):`);
    for (const u of d.added.slice(0, 15)) console.error(`      + ${u}`);
    if (d.added.length > 15) console.error(`      …and ${d.added.length - 15} more`);
  }
  if (d.removed.length) {
    console.error(`  - ${label} removed (${d.removed.length}):`);
    for (const u of d.removed.slice(0, 15)) console.error(`      - ${u}`);
    if (d.removed.length > 15) console.error(`      …and ${d.removed.length - 15} more`);
  }
};
dump("City URL", dCities);
dump("Neighborhood URL", dNeighborhoods);
dump("robots.txt Sitemap: directive", dRobots);
if (missingSitemaps.length) {
  console.error(`  ! Missing required sitemaps: ${missingSitemaps.join(", ")}`);
}
console.error(
  `\nIf these changes are intentional, run \`bun run seo:sitemap-baseline\` to accept them.`,
);
console.error(`See seo-report/sitemap-diff.json for machine output.`);
process.exit(1);
