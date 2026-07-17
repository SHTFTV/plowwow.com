// GitHub Actions workflow-command annotations.
//
// Reads seo-report/*.json and emits `::error` / `::warning` lines on stdout so
// GitHub's Checks UI renders the top failing legacy redirects, hydration URLs,
// robots directives, and JSON-LD schema findings as clickable annotations
// attached to their source file (netlify.toml, public/robots.txt, or the
// closest project file we can resolve for the affected route).
//
// Run at the end of the CI job:  `bunx tsx scripts/gh-annotations.ts`
//
// CLI options:
//   --locale=<code>           Filter legacyRedirects annotations by locale
//   --variant=<variant>       Filter legacyRedirects annotations by page variant
//   --max=<n>                 Global default cap per category (default: 20;
//                             also honors SEO_ANNOTATIONS_TOP for back-compat)
//   --max-legacy=<n>          Per-category cap: legacy redirects
//   --max-hydration=<n>       Per-category cap: hydration issues
//   --max-robots=<n>          Per-category cap: robots.txt directive failures
//   --max-jsonld=<n>          Per-category cap: JSON-LD preflight findings
//
// Env fallbacks: SEO_ANN_MAX_LEGACY / _HYDRATION / _ROBOTS / _JSONLD, plus
// SEO_BASELINE_LOCALE and SEO_BASELINE_VARIANT for the filter (shared with
// the baseline tooling).

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { localeOf, pageVariantOf } from "./lib/baseline";

const REPORT_DIR = resolve("seo-report");

function argVal(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") || undefined : undefined;
}
function intOr(v: string | undefined, fallback: number): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

const DEFAULT_MAX = intOr(argVal("max") ?? process.env.SEO_ANNOTATIONS_TOP, 20);
const MAX = {
  legacy: intOr(argVal("max-legacy") ?? process.env.SEO_ANN_MAX_LEGACY, DEFAULT_MAX),
  hydration: intOr(argVal("max-hydration") ?? process.env.SEO_ANN_MAX_HYDRATION, DEFAULT_MAX),
  robots: intOr(argVal("max-robots") ?? process.env.SEO_ANN_MAX_ROBOTS, DEFAULT_MAX),
  jsonLd: intOr(argVal("max-jsonld") ?? process.env.SEO_ANN_MAX_JSONLD, DEFAULT_MAX),
};

const FILTER = {
  locale: argVal("locale") ?? process.env.SEO_BASELINE_LOCALE ?? undefined,
  variant: argVal("variant") ?? process.env.SEO_BASELINE_VARIANT ?? undefined,
};

function readJson<T>(name: string): T | null {
  const p = resolve(REPORT_DIR, name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")) as T; } catch { return null; }
}

/** Escape a message for the ::error/::warning workflow command (%, \r, \n). */
function esc(s: string): string {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

type Annotation = {
  level: "error" | "warning";
  file: string;
  line?: number;
  title: string;
  message: string;
};

function emit(a: Annotation) {
  const parts = [`file=${a.file}`];
  if (a.line) parts.push(`line=${a.line}`);
  parts.push(`title=${esc(a.title)}`);
  process.stdout.write(`::${a.level} ${parts.join(",")}::${esc(a.message)}\n`);
}

/** Best-effort mapping from URL/path → repo file for annotation anchoring. */
function fileForRoute(pathOrUrl: string): string {
  try {
    const p = pathOrUrl.startsWith("http") ? new URL(pathOrUrl).pathname : pathOrUrl;
    // Legacy → new-URL redirects live in netlify.toml.
    if (/^\/(snow-removal-in-|.*-snow-removal|blog|posts|locations|quote|metrotown-)/.test(p)) {
      return "netlify.toml";
    }
    // City hubs render from src/pages/CityPage.tsx.
    if (/^\/[a-z-]+\/?$/.test(p)) return "src/pages/CityPage.tsx";
    // Blog / legacy pages render from LegacyPage.
    if (/^\/blog(\/|$)/.test(p)) return "src/pages/BlogIndex.tsx";
    return "src/pages/LegacyPage.tsx";
  } catch {
    return "netlify.toml";
  }
}

/** True when route matches --locale/--variant filter (only applied to legacy redirects). */
function passesFilter(pathOrUrl: string): boolean {
  if (!FILTER.locale && !FILTER.variant) return true;
  if (FILTER.locale && localeOf(pathOrUrl) !== FILTER.locale) return false;
  if (FILTER.variant && pageVariantOf(pathOrUrl) !== FILTER.variant) return false;
  return true;
}

const annotations: Annotation[] = [];

// 1. Legacy redirects — netlify.toml regressions.
type LegacyDoc = { checks?: { source: string; expected: string; ok: boolean; reason?: string }[] };
const legacy = readJson<LegacyDoc>("legacy-redirects.json");
const legacyFailing = (legacy?.checks ?? []).filter((c) => !c.ok);
const legacyFiltered = legacyFailing.filter((c) => passesFilter(c.expected || c.source));
for (const c of legacyFiltered.slice(0, MAX.legacy)) {
  annotations.push({
    level: "error",
    file: fileForRoute(c.source),
    title: `Legacy redirect failing: ${c.source}`,
    message: `Expected 301 → ${c.expected} but got: ${c.reason ?? "unknown"}`,
  });
}

// 2. Hydration OG/Twitter — treat as warnings (soft-fail category).
type HydrationDoc = { results?: { url: string; issues: string[] }[] };
const hydration = readJson<HydrationDoc>("hydration.json");
let hydrationCount = 0;
outer: for (const r of hydration?.results ?? []) {
  for (const issue of r.issues) {
    if (hydrationCount++ >= MAX.hydration) break outer;
    annotations.push({
      level: "warning",
      file: fileForRoute(r.url),
      title: `Hydration issue: ${new URL(r.url).pathname}`,
      message: issue,
    });
  }
}

// 3. JSON-LD preflight findings — critical.
type JsonLdDoc = { findings?: { path?: string; url?: string; message: string }[] };
const jsonld = readJson<JsonLdDoc>("jsonld-preflight.json");
for (const f of (jsonld?.findings ?? []).slice(0, MAX.jsonLd)) {
  annotations.push({
    level: "error",
    file: fileForRoute(f.path ?? f.url ?? "/"),
    title: `JSON-LD: ${f.path ?? f.url ?? "?"}`,
    message: f.message,
  });
}

// 4. Robots directives — anchor to public/robots.txt.
type RobotsDoc = {
  failures?: string[];
  missingSitemaps?: string[];
  missingUserAgents?: string[];
  blockMisses?: { userAgent: string; missing: string[] }[];
};
const robots = readJson<RobotsDoc>("robots-directives.json");
const robotsMsgs: string[] = [
  ...(robots?.failures ?? []),
  ...(robots?.missingSitemaps ?? []).map((s) => `missing Sitemap: ${s}`),
  ...(robots?.missingUserAgents ?? []).map((s) => `missing User-agent: ${s}`),
  ...(robots?.blockMisses ?? []).flatMap((b) => b.missing.map((m) => `${b.userAgent}: missing "${m}"`)),
];
for (const msg of robotsMsgs.slice(0, MAX.robots)) {
  annotations.push({
    level: "error",
    file: "public/robots.txt",
    title: `robots.txt directive failing`,
    message: msg,
  });
}

for (const a of annotations) emit(a);

// Group summary so the log has a scannable header. Include cap + filter context
// so it's obvious when output was trimmed vs. genuinely clean.
const filterDesc = FILTER.locale || FILTER.variant
  ? ` filter[locale=${FILTER.locale ?? "*"},variant=${FILTER.variant ?? "*"}]`
  : "";
const capsDesc = `caps[legacy=${MAX.legacy},hydration=${MAX.hydration},robots=${MAX.robots},jsonLd=${MAX.jsonLd}]`;
process.stdout.write(
  `::notice title=SEO annotations::${annotations.length} annotation(s) emitted ` +
    `(legacy=${legacyFiltered.length}${legacyFailing.length !== legacyFiltered.length ? `/${legacyFailing.length}` : ""}, ` +
    `hydration=${hydration?.results?.reduce((n, r) => n + r.issues.length, 0) ?? 0}, ` +
    `jsonLd=${jsonld?.findings?.length ?? 0}, robots=${robotsMsgs.length}) ${capsDesc}${filterDesc}\n`,
);
