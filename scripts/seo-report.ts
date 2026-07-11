// Emit a per-route SEO report (JSON + Markdown) to ./seo-report/.
// If a baseline report is provided via SEO_REPORT_BASELINE (path to a prior
// seo-report.json), also emit seo-diff.{json,md} showing per-route changes
// to title / description / og:image / canonical-style fields against the
// previous successful run. Consumed by CI as an uploaded artifact.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectRoutes, BASE_URL } from "./routes";
import { readImageMeta } from "../src/test/helpers/image-size";
import { cities, type City } from "../src/data/cities";

const OUT_DIR = resolve(process.cwd(), "seo-report");
mkdirSync(OUT_DIR, { recursive: true });

// Structured-data snapshot for a route, mirroring what CityPage.tsx emits.
// Keep in lockstep with src/pages/CityPage.tsx so the diff surfaces any
// runtime schema change on the next report run.
type StructuredData = {
  localBusiness?: {
    name: string;
    url: string;
    image: string;
    telephone: string;
    areaServed: string;
    priceRange: string;
  };
  faqPage?: {
    questionCount: number;
    // Stable hash of the FAQ q/a pairs so any content edit shows up in diff.
    entries: Array<{ q: string; a: string }>;
  };
};

function buildStructuredData(city: City, url: string, ogImage: string): StructuredData {
  return {
    localBusiness: {
      name: `PlowWow Snow Removal — ${city.name}`,
      url,
      image: ogImage,
      telephone: "+1-604-761-1518",
      areaServed: `${city.name}, ${city.province}`,
      priceRange: "$$",
    },
    faqPage: {
      questionCount: city.faqs.length,
      entries: city.faqs.map((f) => ({ q: f.q, a: f.a })),
    },
  };
}

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
  ogImageFormat: string | null;
  ogImageMime: string | null;
  ogImageTruncated: boolean;
  structuredData?: StructuredData;
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
  let format: string | null = null;
  let mime: string | null = null;
  let truncated = false;
  if (r.ogImage?.startsWith(BASE_URL + "/")) {
    const p = resolve(process.cwd(), "public", r.ogImage.slice(BASE_URL.length + 1));
    exists = existsSync(p);
    if (exists) {
      const meta = readImageMeta(p);
      if (meta) {
        w = meta.width;
        h = meta.height;
        format = meta.format;
        mime = meta.mime;
        truncated = meta.truncated;
        if (w < 600 || h < 315) warnings.push(`og:image ${w}×${h} below min 600×315`);
        if (truncated) warnings.push(`og:image truncated (missing EOI/IEND)`);
      } else {
        warnings.push("og:image unreadable / not PNG or JPEG");
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
    ogImageFormat: format,
    ogImageMime: mime,
    ogImageTruncated: truncated,
    warnings,
  });
}

const summary = {
  totalRoutes: rows.length,
  routesWithWarnings: rows.filter((r) => r.warnings.length).length,
  missingOgImages: rows.filter((r) => r.ogImage && !r.ogImageExists).length,
  generatedAt: new Date().toISOString(),
};

writeFileSync(resolve(OUT_DIR, "seo-report.json"), JSON.stringify({ summary, rows }, null, 2));

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
  `| Path | Title (len) | Desc (len) | og:image | Size | Format |`,
  `|---|---|---|---|---|---|`,
  ...rows.map(
    (r) =>
      `| \`${r.path}\` | ${r.titleLen} | ${r.descLen} | ${r.ogImage ?? "—"} | ${r.ogImageWidth && r.ogImageHeight ? `${r.ogImageWidth}×${r.ogImageHeight}` : "—"} | ${r.ogImageFormat ?? "—"} |`,
  ),
].join("\n");

writeFileSync(resolve(OUT_DIR, "seo-report.md"), md);

// ---------------------------------------------------------------------------
// Per-route diff vs. previous successful run
// ---------------------------------------------------------------------------
const baselinePath = process.env.SEO_REPORT_BASELINE;
const DIFF_FIELDS = [
  "title",
  "description",
  "ogImage",
  "ogImageFormat",
  "ogImageMime",
  "ogImageWidth",
  "ogImageHeight",
] as const;
type DiffField = (typeof DIFF_FIELDS)[number];

type Change = { field: DiffField; from: unknown; to: unknown };
type DiffRow =
  | { path: string; status: "added"; current: Row }
  | { path: string; status: "removed"; previous: Row }
  | { path: string; status: "changed"; changes: Change[]; current: Row; previous: Row };

let diffMd = "# SEO Diff\n\n_No baseline supplied — first run or previous artifact unavailable._\n";
let diffJson: { baseline: string | null; diffs: DiffRow[] } = { baseline: null, diffs: [] };

if (baselinePath && existsSync(baselinePath)) {
  const prev = JSON.parse(readFileSync(baselinePath, "utf8")) as { rows: Row[] };
  const prevByPath = new Map(prev.rows.map((r) => [r.path, r]));
  const currByPath = new Map(rows.map((r) => [r.path, r]));

  const diffs: DiffRow[] = [];
  for (const [path, cur] of currByPath) {
    const p = prevByPath.get(path);
    if (!p) {
      diffs.push({ path, status: "added", current: cur });
      continue;
    }
    const changes: Change[] = [];
    for (const f of DIFF_FIELDS) {
      if ((cur as any)[f] !== (p as any)[f]) {
        changes.push({ field: f, from: (p as any)[f], to: (cur as any)[f] });
      }
    }
    if (changes.length) diffs.push({ path, status: "changed", changes, current: cur, previous: p });
  }
  for (const [path, p] of prevByPath) {
    if (!currByPath.has(path)) diffs.push({ path, status: "removed", previous: p });
  }

  diffJson = { baseline: baselinePath, diffs };

  const added = diffs.filter((d) => d.status === "added");
  const removed = diffs.filter((d) => d.status === "removed");
  const changed = diffs.filter((d) => d.status === "changed");

  const fmt = (v: unknown) =>
    v === null || v === undefined ? "—" : String(v).replace(/\|/g, "\\|");

  diffMd = [
    `# SEO Diff`,
    ``,
    `Baseline: \`${baselinePath}\``,
    ``,
    `- Added routes: **${added.length}**`,
    `- Removed routes: **${removed.length}**`,
    `- Changed routes: **${changed.length}**`,
    ``,
    ...(added.length
      ? [`## Added`, ``, ...added.map((d) => `- \`${d.path}\``), ``]
      : []),
    ...(removed.length
      ? [`## Removed`, ``, ...removed.map((d) => `- \`${d.path}\``), ``]
      : []),
    ...(changed.length
      ? [
          `## Changed`,
          ``,
          ...changed.flatMap((d) =>
            d.status === "changed"
              ? [
                  `### \`${d.path}\``,
                  ``,
                  `| Field | Previous | Current |`,
                  `|---|---|---|`,
                  ...d.changes.map((c) => `| ${c.field} | ${fmt(c.from)} | ${fmt(c.to)} |`),
                  ``,
                ]
              : [],
          ),
        ]
      : []),
  ].join("\n");
}

writeFileSync(resolve(OUT_DIR, "seo-diff.json"), JSON.stringify(diffJson, null, 2));
writeFileSync(resolve(OUT_DIR, "seo-diff.md"), diffMd);

console.log(
  `✓ seo-report written — ${summary.totalRoutes} routes, ${summary.routesWithWarnings} with warnings, ${summary.missingOgImages} missing og:images`,
);
if (diffJson.baseline) {
  console.log(`✓ seo-diff written — ${diffJson.diffs.length} route(s) differ from baseline`);
} else {
  console.log(`ℹ seo-diff skipped — no baseline (set SEO_REPORT_BASELINE to enable)`);
}

if (summary.missingOgImages > 0) {
  console.error(`✗ ${summary.missingOgImages} missing og:image(s) — see seo-report.md`);
  process.exit(1);
}
