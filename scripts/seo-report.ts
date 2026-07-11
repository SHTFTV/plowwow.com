// Emit a per-route SEO report (JSON + Markdown) to /tmp/seo-report/.
// Consumed by CI as an uploaded artifact.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { collectRoutes, BASE_URL } from "./routes";
import { readImageSize } from "../src/test/helpers/image-size";

const OUT_DIR = resolve(process.cwd(), "seo-report");
mkdirSync(OUT_DIR, { recursive: true });

type Row = {
  path: string;
  kind: string;
  title: string;
  titleLen: number;
  description: string;
  descLen: number;
  ogImage: string | null;
  ogImageExists: boolean;
  ogImageWidth: number | null;
  ogImageHeight: number | null;
  warnings: string[];
};

const rows: Row[] = [];

for (const r of collectRoutes()) {
  const warnings: string[] = [];
  if (r.title.length < 10 || r.title.length > 65) warnings.push(`title length ${r.title.length}`);
  if (r.description.length < 50 || r.description.length > 200)
    warnings.push(`description length ${r.description.length}`);

  let exists = false;
  let w: number | null = null;
  let h: number | null = null;
  if (r.ogImage?.startsWith(BASE_URL + "/")) {
    const p = resolve(process.cwd(), "public", r.ogImage.slice(BASE_URL.length + 1));
    exists = existsSync(p);
    if (exists) {
      const s = readImageSize(p);
      if (s) {
        w = s.width;
        h = s.height;
        if (w < 600 || h < 315) warnings.push(`og:image ${w}×${h} below min 600×315`);
      } else {
        warnings.push("og:image unreadable");
      }
    } else {
      warnings.push("og:image missing on disk");
    }
  } else if (r.ogImage) {
    warnings.push("og:image not absolute plowwow.com URL");
  } else {
    warnings.push("no og:image");
  }

  rows.push({
    path: r.path,
    kind: r.kind,
    title: r.title,
    titleLen: r.title.length,
    description: r.description,
    descLen: r.description.length,
    ogImage: r.ogImage ?? null,
    ogImageExists: exists,
    ogImageWidth: w,
    ogImageHeight: h,
    warnings,
  });
}

const summary = {
  totalRoutes: rows.length,
  routesWithWarnings: rows.filter((r) => r.warnings.length).length,
  missingOgImages: rows.filter((r) => r.ogImage && !r.ogImageExists).length,
  generatedAt: new Date().toISOString(),
};

writeFileSync(
  resolve(OUT_DIR, "seo-report.json"),
  JSON.stringify({ summary, rows }, null, 2),
);

const md = [
  `# SEO Report`,
  ``,
  `- Total routes: **${summary.totalRoutes}**`,
  `- Routes with warnings: **${summary.routesWithWarnings}**`,
  `- Missing og:images: **${summary.missingOgImages}**`,
  ``,
  `## Warnings`,
  ``,
  ...rows
    .filter((r) => r.warnings.length)
    .map((r) => `- \`${r.path}\` — ${r.warnings.join("; ")}`),
  ``,
  `## All routes`,
  ``,
  `| Path | Title (len) | Desc (len) | og:image | Size |`,
  `|---|---|---|---|---|`,
  ...rows.map(
    (r) =>
      `| \`${r.path}\` | ${r.titleLen} | ${r.descLen} | ${r.ogImage ?? "—"} | ${r.ogImageWidth && r.ogImageHeight ? `${r.ogImageWidth}×${r.ogImageHeight}` : "—"} |`,
  ),
].join("\n");

writeFileSync(resolve(OUT_DIR, "seo-report.md"), md);

console.log(
  `✓ seo-report written — ${summary.totalRoutes} routes, ${summary.routesWithWarnings} with warnings, ${summary.missingOgImages} missing og:images`,
);

if (summary.missingOgImages > 0) {
  console.error(`✗ ${summary.missingOgImages} missing og:image(s) — see seo-report.md`);
  process.exit(1);
}
