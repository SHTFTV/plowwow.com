// Build-time bundle-size budget check + analyzer report.
//
// Reads dist/assets/*.js, gzips each file, and compares against thresholds
// defined in bundle-budgets.json. Also computes the initial-load total
// (index + eagerly-imported vendor chunks referenced from index.html) so
// route-level regressions can't hide behind a lazily-loaded chunk.
//
// Emits:
//   seo-report/bundle-report.json   full per-chunk breakdown
//   seo-report/bundle-report.md     human-readable table for CI logs
//
// Fails the build (exit 1) when any budget is exceeded. Pass --print to
// emit the report without failing (useful locally).

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = resolve(".");
const DIST = join(ROOT, "dist", "assets");
const REPORT_DIR = join(ROOT, "seo-report");
const BUDGET_FILE = join(ROOT, "bundle-budgets.json");
const INDEX_HTML = join(ROOT, "dist", "index.html");

type Budget = { kb: number };
type BudgetFile = {
  defaultChunkKb: number;
  totalInitialKb: number;
  budgets: Record<string, Budget>;
};

type ChunkStat = {
  file: string;
  rawKb: number;
  gzipKb: number;
  bucket: string;
  budgetKb: number;
  overBy: number;
  eagerlyLoaded: boolean;
};

function nameBucket(file: string): string {
  // Rollup names chunks as `<name>-<hash>.js` (e.g. `vendor-radix-abc.js`).
  // Strip the trailing hash + extension.
  const b = basename(file).replace(/\.js$/, "");
  return b.replace(/-[a-zA-Z0-9_]{6,}$/, "");
}

function kb(n: number) { return Number((n / 1024).toFixed(2)); }

function readInitialChunks(): Set<string> {
  const initial = new Set<string>();
  if (!existsSync(INDEX_HTML)) return initial;
  const html = readFileSync(INDEX_HTML, "utf8");
  // Scripts and preload/modulepreload references from the entry HTML are
  // downloaded on first paint — those count against the initial budget.
  const re = /(?:src|href)="\/assets\/([^"]+\.js)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) initial.add(m[1]);
  return initial;
}

function main() {
  const printOnly = process.argv.includes("--print");

  if (!existsSync(DIST)) {
    console.error("✗ bundle-budget: dist/assets not found — run `vite build` first.");
    process.exit(1);
  }
  const budgets = JSON.parse(readFileSync(BUDGET_FILE, "utf8")) as BudgetFile;
  const initial = readInitialChunks();

  const files = readdirSync(DIST).filter((f) => f.endsWith(".js"));
  const stats: ChunkStat[] = files.map((f) => {
    const raw = readFileSync(join(DIST, f));
    const gz = gzipSync(raw);
    const bucket = nameBucket(f);
    const budgetKb = budgets.budgets[bucket]?.kb ?? budgets.defaultChunkKb;
    const gzipKb = kb(gz.length);
    return {
      file: f,
      rawKb: kb(raw.length),
      gzipKb,
      bucket,
      budgetKb,
      overBy: Number((gzipKb - budgetKb).toFixed(2)),
      eagerlyLoaded: initial.has(f),
    };
  });

  stats.sort((a, b) => b.gzipKb - a.gzipKb);
  const initialTotalKb = Number(
    stats.filter((s) => s.eagerlyLoaded).reduce((n, s) => n + s.gzipKb, 0).toFixed(2),
  );
  const initialOverBy = Number((initialTotalKb - budgets.totalInitialKb).toFixed(2));

  const violations = stats.filter((s) => s.overBy > 0);
  const totalViolation = initialOverBy > 0;

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "bundle-report.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      totals: {
        initialTotalKb,
        initialBudgetKb: budgets.totalInitialKb,
        initialOverBy,
      },
      chunks: stats,
      violations,
    }, null, 2),
  );

  const md = [
    "# Bundle size report",
    "",
    `Initial JS (gzip): **${initialTotalKb} kB** / budget **${budgets.totalInitialKb} kB**` +
      (initialOverBy > 0 ? `  🚨 over by ${initialOverBy} kB` : "  ✅"),
    "",
    "| Chunk | gzip kB | budget | over | initial |",
    "| --- | ---: | ---: | ---: | :---: |",
    ...stats.map((s) =>
      `| ${s.bucket} | ${s.gzipKb} | ${s.budgetKb} | ${s.overBy > 0 ? "🚨 +" + s.overBy : "—"} | ${s.eagerlyLoaded ? "•" : ""} |`,
    ),
    "",
  ].join("\n");
  writeFileSync(join(REPORT_DIR, "bundle-report.md"), md);

  const top = stats.slice(0, 8).map((s) => `${s.bucket}=${s.gzipKb}kB`).join("  ");
  console.log(`bundle-budget: initial ${initialTotalKb}/${budgets.totalInitialKb} kB gz · top: ${top}`);

  if (!printOnly && (violations.length > 0 || totalViolation)) {
    console.error(`✗ bundle-budget: ${violations.length} chunk violation(s)` +
      (totalViolation ? `, initial JS over by ${initialOverBy} kB` : ""));
    for (const v of violations) {
      console.error(`   ${v.file}  bucket=${v.bucket}  gzip=${v.gzipKb}kB  budget=${v.budgetKb}kB  over=+${v.overBy}kB`);
    }
    console.error(`\nEither optimize the offending chunk or update bundle-budgets.json intentionally.`);
    process.exit(1);
  }

  console.log(`✓ bundle-budget: all ${stats.length} chunks within budget (initial ${initialTotalKb} ≤ ${budgets.totalInitialKb} kB gz)`);
}

main();
