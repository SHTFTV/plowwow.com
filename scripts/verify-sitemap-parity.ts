// The generator stamps <lastmod> with the build date. That changes on a
// healthy rebuild; route structure must still match the committed sitemap.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const sitemapPath = "public/sitemap.xml";
const committed = execFileSync("git", ["show", `HEAD:${sitemapPath}`], { encoding: "utf8" });
const generated = readFileSync(sitemapPath, "utf8");
const withoutBuildDates = (xml: string) => xml.replace(
  /(<lastmod>)\d{4}-\d{2}-\d{2}(<\/lastmod>)/g,
  "$1BUILD_DATE$2",
);

if (withoutBuildDates(committed) !== withoutBuildDates(generated)) {
  console.error("public/sitemap.xml route structure is out of sync with scripts/routes.ts");
  console.error(execFileSync("git", ["--no-pager", "diff", "--", sitemapPath], { encoding: "utf8" }));
  process.exit(1);
}
console.log("✓ sitemap route structure matches; build-date changes are allowed");
