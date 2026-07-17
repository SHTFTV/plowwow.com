// CLI: audits internal linking (orphan posts, cities missing neighborhood
// posts) and writes public/link-audit.json. Runs via bunx tsx from
// prebuild so the JSON ships with the deploy.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { blogPosts } from "../src/generated/blog-posts";
import { cities } from "../src/data/cities";
import { runLinkAudit, hubsFromCities } from "../src/lib/linkAudit";

const hubs = hubsFromCities(cities);
const report = runLinkAudit(
  blogPosts.map((p) => ({ slug: p.slug, title: p.title })),
  hubs,
);

writeFileSync(resolve("public/link-audit.json"), JSON.stringify(report, null, 2));
console.log(
  `link-audit.json written — ${report.totals.posts} posts, ${report.totals.orphanPosts} orphans, ${report.totals.citiesWithoutPosts} empty cities`,
);
if (report.orphanPosts.length) {
  console.log("Orphans:", report.orphanPosts.map((p) => p.slug).join(", "));
}
if (report.citiesWithoutPosts.length) {
  console.log("Empty cities:", report.citiesWithoutPosts.map((c) => c.slug).join(", "));
}
