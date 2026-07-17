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
//   --max=<n>                 Global default cap per category (default: 20)
//   --max-legacy / -hydration / -robots / -jsonld=<n>
//                             Per-category caps.
//   --config=<path>           Load defaults from a JSON config file.
//   --fail-on-skipped         Exit 1 when skipped counts exceed failOnSkipped.
//   --dry-run                 Print planned vs skipped to stderr; emit nothing.
//   --dry-run=output          Same as --dry-run and always write
//                             seo-report/annotation-plan.json (planned vs
//                             skipped counts + per-item details).
//   --write-sample-config[=path]
//                             Write a fully documented config template and exit.
//   --fail-on-plan-regression[=N]
//                             Exit 1 when the --compare selection's totalSkipped
//                             grows by more than N (default 0) vs the base.
//                             skipped counts + per-item details).
//
// Env fallbacks: SEO_ANN_MAX_{LEGACY,HYDRATION,ROBOTS,JSONLD},
// SEO_BASELINE_LOCALE/VARIANT, SEO_ANN_CONFIG,
// SEO_ANN_FAIL_ON_SKIPPED_{LEGACY,HYDRATION,ROBOTS,JSONLD,TOTAL}.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { localeOf, pageVariantOf } from "./lib/baseline";

const REPORT_DIR = resolve("seo-report");
const DEFAULT_CONFIG_PATH = resolve("seo-annotations.config.json");

export type Filter = { locale?: string; variant?: string };
export type Caps = { legacy: number; hydration: number; robots: number; jsonLd: number };
export type FailOnSkipped = {
  legacy?: number;
  hydration?: number;
  robots?: number;
  jsonLd?: number;
  total?: number;
};
export type AnnotationsConfig = {
  caps?: Partial<Caps> & { default?: number };
  filter?: Filter;
  failOnSkipped?: FailOnSkipped;
};
export type Annotation = {
  level: "error" | "warning";
  file: string;
  line?: number;
  title: string;
  message: string;
};
export type SkippedCounts = { legacy: number; hydration: number; robots: number; jsonLd: number };

export type LegacyDoc = { checks?: { source: string; expected: string; ok: boolean; reason?: string }[] };
export type HydrationDoc = { results?: { url: string; issues: string[] }[] };
export type JsonLdDoc = { findings?: { path?: string; url?: string; message: string }[] };
export type RobotsDoc = {
  failures?: string[];
  missingSitemaps?: string[];
  missingUserAgents?: string[];
  blockMisses?: { userAgent: string; missing: string[] }[];
};

function argVal(argv: string[], name: string): string | undefined {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") || undefined : undefined;
}
function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}
function intOr(v: string | number | undefined, fallback: number): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}
function intOrUndef(v: string | number | undefined): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

export type ConfigIssue = {
  path: string;
  pointer?: string;                // RFC 6901 JSON Pointer
  expected: string;
  got: string;
  example: string;
  loc?: { line: number; column: number; endLine?: number; endColumn?: number };
  snippet?: string;                // corrected snippet for the field
};

function pathToPointer(path: string): string {
  const parts = path.replace(/^\$\.?/, "").split(".").filter(Boolean);
  return "/" + parts.map((p) => p.replace(/~/g, "~0").replace(/\//g, "~1")).join("/");
}

/** Locate line/column of a dotted JSON path inside raw source. Best-effort. */
export function locateJsonPath(
  source: string,
  path: string,
): { line: number; column: number; endLine?: number; endColumn?: number } | undefined {
  const segs = path.replace(/^\$\.?/, "").split(".").filter(Boolean);
  if (!segs.length) return undefined;
  let idx = 0;
  for (const seg of segs) {
    const re = new RegExp(`"${seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`, "g");
    re.lastIndex = idx;
    const m = re.exec(source);
    if (!m) return undefined;
    idx = m.index + m[0].length;
  }
  const valueStart = idx;
  const keyStart = source.lastIndexOf('"', valueStart - 2);
  const anchor = keyStart >= 0 ? keyStart : valueStart;
  const before = source.slice(0, anchor);
  const line = before.split("\n").length;
  const column = anchor - (before.lastIndexOf("\n") + 1) + 1;
  let depth = 0, end = valueStart;
  while (end < source.length) {
    const c = source[end];
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") { if (depth === 0) break; depth--; }
    else if ((c === "," || c === "\n") && depth === 0) break;
    end++;
  }
  const vs = source.slice(0, end);
  const endLine = vs.split("\n").length;
  const endColumn = end - (vs.lastIndexOf("\n") + 1) + 1;
  return { line, column, endLine, endColumn };
}

function correctedSnippetFor(path: string): string {
  const segs = path.replace(/^\$\.?/, "").split(".").filter(Boolean);
  const [root, key] = segs;
  if (root === "caps") return `"caps": { "${key ?? "legacy"}": 20 }`;
  if (root === "filter") return `"filter": { "${key ?? "locale"}": "${key === "variant" ? "blog" : "en-CA"}" }`;
  if (root === "failOnSkipped") return `"failOnSkipped": { "${key ?? "total"}": 100 }`;
  return `{ "caps": { "default": 20 } }`;
}

function fmtIssue(i: ConfigIssue): string {
  const ptr = i.pointer ? ` (pointer ${i.pointer})` : "";
  const locStr = i.loc ? ` [line ${i.loc.line}:${i.loc.column}${i.loc.endLine ? `-${i.loc.endLine}:${i.loc.endColumn}` : ""}]` : "";
  const snip = i.snippet ? `\n      corrected: ${i.snippet}` : "";
  return `${i.path}${ptr}${locStr} — expected ${i.expected} (got ${i.got}); example: ${i.example}${snip}`;
}

/**
 * Validate a parsed config object. Throws an Error with a friendly, actionable
 * message that includes JSON path, expected type/range, and a corrected
 * snippet for each failure. Exported for tests.
 */
export function validateConfig(raw: unknown, source = "config", sourceText?: string): AnnotationsConfig {
  const issues: ConfigIssue[] = [];
  const isObj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  if (raw != null && !isObj(raw)) {
    throw new Error(
      `Invalid ${source}:\n  - $ — expected JSON object (got ${
        Array.isArray(raw) ? "array" : typeof raw
      }); example: {"caps":{"default":20}}\n` +
        `See seo-annotations.config.schema.json for the expected shape.`,
    );
  }
  const cfg = (raw ?? {}) as Record<string, unknown>;
  const checkNonNegInt = (v: unknown, path: string, exampleKey: string, exampleParent: string) => {
    if (v == null) return;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || Math.floor(v) !== v) {
      issues.push({
        path,
        expected: "non-negative integer (>= 0)",
        got: JSON.stringify(v),
        example: `{"${exampleParent}":{"${exampleKey}":20}}`,
      });
    }
  };
  if (cfg.caps != null) {
    if (!isObj(cfg.caps)) {
      issues.push({ path: "$.caps", expected: "object", got: Array.isArray(cfg.caps) ? "array" : typeof cfg.caps, example: `{"caps":{"default":20,"legacy":20}}` });
    } else {
      const allowed = new Set(["default", "legacy", "hydration", "robots", "jsonLd"]);
      for (const [k, v] of Object.entries(cfg.caps)) {
        if (!allowed.has(k)) {
          issues.push({
            path: `$.caps.${k}`,
            expected: `one of: ${[...allowed].join(", ")}`,
            got: `unknown key "${k}"`,
            example: `{"caps":{"legacy":20}}`,
          });
        } else checkNonNegInt(v, `$.caps.${k}`, k, "caps");
      }
    }
  }
  if (cfg.filter != null) {
    if (!isObj(cfg.filter)) {
      issues.push({ path: "$.filter", expected: "object", got: Array.isArray(cfg.filter) ? "array" : typeof cfg.filter, example: `{"filter":{"locale":"en-CA","variant":"blog"}}` });
    } else {
      for (const [k, v] of Object.entries(cfg.filter)) {
        if (k !== "locale" && k !== "variant") {
          issues.push({
            path: `$.filter.${k}`,
            expected: "one of: locale, variant",
            got: `unknown key "${k}"`,
            example: `{"filter":{"locale":"en-CA"}}`,
          });
        } else if (v != null && (typeof v !== "string" || !v.trim())) {
          issues.push({
            path: `$.filter.${k}`,
            expected: "non-empty string",
            got: JSON.stringify(v),
            example: `{"filter":{"${k}":"${k === "locale" ? "en-CA" : "blog"}"}}`,
          });
        }
      }
    }
  }
  if (cfg.failOnSkipped != null) {
    if (!isObj(cfg.failOnSkipped)) {
      issues.push({ path: "$.failOnSkipped", expected: "object", got: Array.isArray(cfg.failOnSkipped) ? "array" : typeof cfg.failOnSkipped, example: `{"failOnSkipped":{"total":100}}` });
    } else {
      const allowed = new Set(["legacy", "hydration", "robots", "jsonLd", "total"]);
      for (const [k, v] of Object.entries(cfg.failOnSkipped)) {
        if (!allowed.has(k)) {
          issues.push({
            path: `$.failOnSkipped.${k}`,
            expected: `one of: ${[...allowed].join(", ")}`,
            got: `unknown key "${k}"`,
            example: `{"failOnSkipped":{"total":100}}`,
          });
        } else checkNonNegInt(v, `$.failOnSkipped.${k}`, k, "failOnSkipped");
      }
    }
  }
  if (issues.length) {
    for (const i of issues) {
      i.pointer = pathToPointer(i.path);
      i.snippet = correctedSnippetFor(i.path);
      if (sourceText) {
        const loc = locateJsonPath(sourceText, i.path);
        if (loc) i.loc = loc;
      }
    }
    throw new Error(
      `Invalid ${source}:\n  - ${issues.map(fmtIssue).join("\n  - ")}\n` +
        `See seo-annotations.config.schema.json for the expected shape.`,
    );
  }
  return cfg as AnnotationsConfig;
}

/** Load a JSON config file. Missing file → `{}`. Invalid shape → throws. */
export function loadConfigFile(path?: string): AnnotationsConfig {
  const p = path ?? DEFAULT_CONFIG_PATH;
  if (!existsSync(p)) return {};
  const text = readFileSync(p, "utf8");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse ${p} as JSON: ${(e as Error).message}`);
  }
  return validateConfig(raw, p, text);
}


/**
 * Parse CLI + env + config into a resolved caps + filter config (pure; testable).
 * Precedence (highest first): CLI flag > env var > config file > built-in default.
 */
export function parseConfig(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
  config: AnnotationsConfig = {},
): { caps: Caps; filter: Filter; failOnSkipped: FailOnSkipped; failOnSkippedEnabled: boolean } {
  const cfgDefault = intOrUndef(config.caps?.default);
  const DEFAULT_MAX = intOr(argVal(argv, "max") ?? env.SEO_ANNOTATIONS_TOP, cfgDefault ?? 20);
  const pick = (
    cli: string,
    envKey: string,
    cfgKey: keyof Caps,
  ): number => intOr(argVal(argv, cli) ?? env[envKey], intOr(config.caps?.[cfgKey], DEFAULT_MAX));
  return {
    caps: {
      legacy: pick("max-legacy", "SEO_ANN_MAX_LEGACY", "legacy"),
      hydration: pick("max-hydration", "SEO_ANN_MAX_HYDRATION", "hydration"),
      robots: pick("max-robots", "SEO_ANN_MAX_ROBOTS", "robots"),
      jsonLd: pick("max-jsonld", "SEO_ANN_MAX_JSONLD", "jsonLd"),
    },
    filter: {
      locale: argVal(argv, "locale") ?? env.SEO_BASELINE_LOCALE ?? config.filter?.locale ?? undefined,
      variant: argVal(argv, "variant") ?? env.SEO_BASELINE_VARIANT ?? config.filter?.variant ?? undefined,
    },
    failOnSkipped: {
      legacy: intOrUndef(env.SEO_ANN_FAIL_ON_SKIPPED_LEGACY) ?? config.failOnSkipped?.legacy,
      hydration: intOrUndef(env.SEO_ANN_FAIL_ON_SKIPPED_HYDRATION) ?? config.failOnSkipped?.hydration,
      robots: intOrUndef(env.SEO_ANN_FAIL_ON_SKIPPED_ROBOTS) ?? config.failOnSkipped?.robots,
      jsonLd: intOrUndef(env.SEO_ANN_FAIL_ON_SKIPPED_JSONLD) ?? config.failOnSkipped?.jsonLd,
      total: intOrUndef(env.SEO_ANN_FAIL_ON_SKIPPED_TOTAL) ?? config.failOnSkipped?.total,
    },
    failOnSkippedEnabled:
      hasFlag(argv, "fail-on-skipped") || env.SEO_ANN_FAIL_ON_SKIPPED === "1",
  };
}

/**
 * Evaluate skipped counts against `failOnSkipped` limits. Returns a list of
 * violations (empty when limits are unset or not exceeded).
 */
export function evaluateSkippedLimits(
  skipped: SkippedCounts,
  limits: FailOnSkipped,
): { category: string; skipped: number; limit: number }[] {
  const violations: { category: string; skipped: number; limit: number }[] = [];
  const cats: (keyof SkippedCounts)[] = ["legacy", "hydration", "robots", "jsonLd"];
  for (const c of cats) {
    const lim = limits[c];
    if (typeof lim === "number" && skipped[c] > lim) {
      violations.push({ category: c, skipped: skipped[c], limit: lim });
    }
  }
  const total = skipped.legacy + skipped.hydration + skipped.robots + skipped.jsonLd;
  if (typeof limits.total === "number" && total > limits.total) {
    violations.push({ category: "total", skipped: total, limit: limits.total });
  }
  return violations;
}

function readJson<T>(name: string): T | null {
  const p = resolve(REPORT_DIR, name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")) as T; } catch { return null; }
}

/** Escape a message for the ::error/::warning workflow command (%, \r, \n). */
function esc(s: string): string {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/** Best-effort mapping from URL/path → repo file for annotation anchoring. */
export function fileForRoute(pathOrUrl: string): string {
  try {
    const p = pathOrUrl.startsWith("http") ? new URL(pathOrUrl).pathname : pathOrUrl;
    if (/^\/(snow-removal-in-|.*-snow-removal|blog|posts|locations|quote|metrotown-)/.test(p)) {
      return "netlify.toml";
    }
    if (/^\/[a-z-]+\/?$/.test(p)) return "src/pages/CityPage.tsx";
    if (/^\/blog(\/|$)/.test(p)) return "src/pages/BlogIndex.tsx";
    return "src/pages/LegacyPage.tsx";
  } catch {
    return "netlify.toml";
  }
}

/** True when route matches --locale/--variant filter. */
export function passesFilter(pathOrUrl: string, filter: Filter): boolean {
  if (!filter.locale && !filter.variant) return true;
  if (filter.locale && localeOf(pathOrUrl) !== filter.locale) return false;
  if (filter.variant && pageVariantOf(pathOrUrl) !== filter.variant) return false;
  return true;
}

export type Category = "legacy" | "hydration" | "jsonLd" | "robots";
export type SkipReason = "cap" | "filter" | "none";
export type CategoryPlan = {
  category: Category;
  rawFailures: number;      // failures before filter
  matched: number;          // failures after filter (input to cap)
  emitted: number;
  skippedByCap: number;
  filteredOut: number;      // rawFailures - matched
  status: "ok" | "cap-reached" | "filter-mismatch" | "no-matching-failures" | "partial";
  topSkipped: { reason: SkipReason; summary: string }[];
  topFiltered: { reason: "filter"; summary: string }[];
};
export type AnnotationPlan = {
  categories: Record<Category, CategoryPlan>;
  annotations: Annotation[];
  totalEmitted: number;
  totalSkipped: number;
};

const TOP_REASON_N = 5;

function catStatus(p: Omit<CategoryPlan, "status" | "topSkipped" | "topFiltered">): CategoryPlan["status"] {
  if (p.rawFailures === 0) return "no-matching-failures";
  if (p.matched === 0 && p.filteredOut > 0) return "filter-mismatch";
  if (p.skippedByCap > 0) return "cap-reached";
  if (p.emitted < p.rawFailures) return "partial";
  return "ok";
}

/** Pure annotation-selection function — used by CLI and unit tests. */
export function selectAnnotations(input: {
  legacy?: LegacyDoc | null;
  hydration?: HydrationDoc | null;
  jsonld?: JsonLdDoc | null;
  robots?: RobotsDoc | null;
  caps: Caps;
  filter: Filter;
}): { annotations: Annotation[]; skipped: SkippedCounts; totals: SkippedCounts; plan: AnnotationPlan } {
  const annotations: Annotation[] = [];
  const skipped: SkippedCounts = { legacy: 0, hydration: 0, robots: 0, jsonLd: 0 };
  const totals: SkippedCounts = { legacy: 0, hydration: 0, robots: 0, jsonLd: 0 };

  // Legacy
  const legacyRaw = (input.legacy?.checks ?? []).filter((c) => !c.ok);
  const legacyFiltered = legacyRaw.filter((c) => passesFilter(c.expected || c.source, input.filter));
  totals.legacy = legacyFiltered.length;
  const legacyEmitted = legacyFiltered.slice(0, input.caps.legacy);
  for (const c of legacyEmitted) {
    annotations.push({
      level: "error",
      file: fileForRoute(c.source),
      title: `Legacy redirect failing: ${c.source}`,
      message: `Expected 301 → ${c.expected} but got: ${c.reason ?? "unknown"}`,
    });
  }
  skipped.legacy = Math.max(0, legacyFiltered.length - input.caps.legacy);
  const legacySkippedCap = legacyFiltered.slice(input.caps.legacy);
  const legacyFilteredOut = legacyRaw.filter((c) => !passesFilter(c.expected || c.source, input.filter));

  // Hydration
  const hydrationRaw: { url: string; issue: string }[] = [];
  for (const r of input.hydration?.results ?? []) {
    for (const issue of r.issues) hydrationRaw.push({ url: r.url, issue });
  }
  totals.hydration = hydrationRaw.length;
  const hydrationEmitted = hydrationRaw.slice(0, input.caps.hydration);
  for (const { url, issue } of hydrationEmitted) {
    annotations.push({
      level: "warning",
      file: fileForRoute(url),
      title: `Hydration issue: ${(() => { try { return new URL(url).pathname; } catch { return url; } })()}`,
      message: issue,
    });
  }
  skipped.hydration = Math.max(0, hydrationRaw.length - input.caps.hydration);
  const hydrationSkippedCap = hydrationRaw.slice(input.caps.hydration);

  // JSON-LD
  const jsonldRaw = input.jsonld?.findings ?? [];
  totals.jsonLd = jsonldRaw.length;
  const jsonldEmitted = jsonldRaw.slice(0, input.caps.jsonLd);
  for (const f of jsonldEmitted) {
    annotations.push({
      level: "error",
      file: fileForRoute(f.path ?? f.url ?? "/"),
      title: `JSON-LD: ${f.path ?? f.url ?? "?"}`,
      message: f.message,
    });
  }
  skipped.jsonLd = Math.max(0, jsonldRaw.length - input.caps.jsonLd);
  const jsonldSkippedCap = jsonldRaw.slice(input.caps.jsonLd);

  // Robots
  const robotsMsgs: string[] = [
    ...(input.robots?.failures ?? []),
    ...(input.robots?.missingSitemaps ?? []).map((s) => `missing Sitemap: ${s}`),
    ...(input.robots?.missingUserAgents ?? []).map((s) => `missing User-agent: ${s}`),
    ...(input.robots?.blockMisses ?? []).flatMap((b) => b.missing.map((m) => `${b.userAgent}: missing "${m}"`)),
  ];
  totals.robots = robotsMsgs.length;
  const robotsEmitted = robotsMsgs.slice(0, input.caps.robots);
  for (const msg of robotsEmitted) {
    annotations.push({
      level: "error",
      file: "public/robots.txt",
      title: `robots.txt directive failing`,
      message: msg,
    });
  }
  skipped.robots = Math.max(0, robotsMsgs.length - input.caps.robots);
  const robotsSkippedCap = robotsMsgs.slice(input.caps.robots);

  const buildCat = (
    category: Category,
    rawFailures: number,
    matched: number,
    emitted: number,
    skippedByCap: number,
    filteredOut: number,
    topCap: { reason: "cap"; summary: string }[],
    topFilter: { reason: "filter"; summary: string }[],
  ): CategoryPlan => {
    const base = { category, rawFailures, matched, emitted, skippedByCap, filteredOut };
    return {
      ...base,
      status: catStatus(base),
      topSkipped: topCap.slice(0, TOP_REASON_N),
      topFiltered: topFilter.slice(0, TOP_REASON_N),
    };
  };

  const plan: AnnotationPlan = {
    categories: {
      legacy: buildCat(
        "legacy",
        legacyRaw.length,
        legacyFiltered.length,
        legacyEmitted.length,
        skipped.legacy,
        legacyFilteredOut.length,
        legacySkippedCap.map((c) => ({ reason: "cap", summary: `${c.source} → ${c.expected}` })),
        legacyFilteredOut.map((c) => ({ reason: "filter", summary: `${c.source} (locale/variant mismatch)` })),
      ),
      hydration: buildCat(
        "hydration",
        hydrationRaw.length,
        hydrationRaw.length,
        hydrationEmitted.length,
        skipped.hydration,
        0,
        hydrationSkippedCap.map((h) => ({ reason: "cap", summary: `${(() => { try { return new URL(h.url).pathname; } catch { return h.url; } })()} — ${h.issue}` })),
        [],
      ),
      jsonLd: buildCat(
        "jsonLd",
        jsonldRaw.length,
        jsonldRaw.length,
        jsonldEmitted.length,
        skipped.jsonLd,
        0,
        jsonldSkippedCap.map((f) => ({ reason: "cap", summary: `${f.path ?? f.url ?? "?"} — ${f.message}` })),
        [],
      ),
      robots: buildCat(
        "robots",
        robotsMsgs.length,
        robotsMsgs.length,
        robotsEmitted.length,
        skipped.robots,
        0,
        robotsSkippedCap.map((m) => ({ reason: "cap", summary: m })),
        [],
      ),
    },
    annotations,
    totalEmitted: annotations.length,
    totalSkipped: skipped.legacy + skipped.hydration + skipped.robots + skipped.jsonLd,
  };

  return { annotations, skipped, totals, plan };
}

/** Serialize an AnnotationPlan to CSV. One row per category. */
/** Parse a --plan-category-include=cat1,cat2 value into a normalized Category[]
 *  (order preserved, unknown values dropped). Undefined/empty → null (no filter).
 */
export function parseCategoryInclude(raw: string | undefined | null): Category[] | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const valid: readonly Category[] = ["legacy", "hydration", "jsonLd", "robots"];
  const aliases: Record<string, Category> = {
    legacy: "legacy",
    "legacy-redirects": "legacy",
    hydration: "hydration",
    robots: "robots",
    jsonld: "jsonLd",
    "json-ld": "jsonLd",
    jsonLd: "jsonLd",
  };
  const seen = new Set<Category>();
  const out: Category[] = [];
  for (const raw of s.split(",")) {
    const t = raw.trim();
    if (!t) continue;
    const norm = aliases[t] ?? (valid.includes(t as Category) ? (t as Category) : null);
    if (norm && !seen.has(norm)) { seen.add(norm); out.push(norm); }
  }
  return out.length ? out : null;
}

/** Alias for parseCategoryInclude — parses --plan-category-exclude=cat1,cat2. */
export const parseCategoryExclude = parseCategoryInclude;

/** Resolve the effective category selection given optional include and exclude
 *  filters. Effective = (include ?? ALL) minus exclude. Returns null when the
 *  result equals the full default set (i.e. no filtering needed) so callers can
 *  keep their existing "no include" fast paths. Returns [] when everything is
 *  excluded.
 */
export function resolveCategorySelection(
  include: Category[] | null | undefined,
  exclude: Category[] | null | undefined,
): Category[] | null {
  const ALL: readonly Category[] = ["legacy", "hydration", "jsonLd", "robots"];
  const base: Category[] = include && include.length ? [...include] : [...ALL];
  const ex = new Set(exclude ?? []);
  const out = base.filter((c) => !ex.has(c));
  const sameAsAll =
    !include && !exclude ||
    (out.length === ALL.length && ALL.every((c, i) => out[i] === c));
  return sameAsAll ? null : out;
}

export function planToCsv(
  plan: AnnotationPlan,
  meta: { filterLabel?: string; include?: Category[] | null } = {},
): string {
  const header = [
    "category", "rawFailures", "matched", "emitted", "skippedByCap",
    "filteredOut", "status", "topSkipped", "topFiltered",
  ];
  const rows: string[][] = [header];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cats: Category[] = meta.include && meta.include.length
    ? meta.include
    : ["legacy", "hydration", "jsonLd", "robots"];
  for (const cat of cats) {
    const p = plan.categories[cat];
    rows.push([
      cat,
      String(p.rawFailures), String(p.matched), String(p.emitted),
      String(p.skippedByCap), String(p.filteredOut), p.status,
      p.topSkipped.map((s) => s.summary).join(" | "),
      p.topFiltered.map((s) => s.summary).join(" | "),
    ]);
  }
  const prefix = meta.filterLabel ? `# filter: ${meta.filterLabel}\n` : "";
  return prefix + rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}

/**
 * Diff two annotation plans (a vs b) showing per-category delta of counts
 * and status transitions. Used by --compare-locale / --compare-variant.
 */
export function diffPlans(
  a: AnnotationPlan,
  b: AnnotationPlan,
  labels: { a: string; b: string } = { a: "A", b: "B" },
): {
  labels: { a: string; b: string };
  categories: Record<Category, {
    emitted: { a: number; b: number; delta: number };
    skippedByCap: { a: number; b: number; delta: number };
    filteredOut: { a: number; b: number; delta: number };
    matched: { a: number; b: number; delta: number };
    status: { a: string; b: string; changed: boolean };
  }>;
  totalEmitted: { a: number; b: number; delta: number };
  totalSkipped: { a: number; b: number; delta: number };
} {
  const cats: Category[] = ["legacy", "hydration", "jsonLd", "robots"];
  const categories = {} as ReturnType<typeof diffPlans>["categories"];
  for (const c of cats) {
    const pa = a.categories[c];
    const pb = b.categories[c];
    categories[c] = {
      emitted: { a: pa.emitted, b: pb.emitted, delta: pb.emitted - pa.emitted },
      skippedByCap: { a: pa.skippedByCap, b: pb.skippedByCap, delta: pb.skippedByCap - pa.skippedByCap },
      filteredOut: { a: pa.filteredOut, b: pb.filteredOut, delta: pb.filteredOut - pa.filteredOut },
      matched: { a: pa.matched, b: pb.matched, delta: pb.matched - pa.matched },
      status: { a: pa.status, b: pb.status, changed: pa.status !== pb.status },
    };
  }
  return {
    labels,
    categories,
    totalEmitted: { a: a.totalEmitted, b: b.totalEmitted, delta: b.totalEmitted - a.totalEmitted },
    totalSkipped: { a: a.totalSkipped, b: b.totalSkipped, delta: b.totalSkipped - a.totalSkipped },
  };
}

/** Serialize a plan diff (from diffPlans) to CSV. One row per category, plus totals rows. */
export function planDiffToCsv(
  diff: ReturnType<typeof diffPlans>,
  opts: { include?: Category[] | null } = {},
): string {
  const header = [
    "category",
    "emitted_a", "emitted_b", "emitted_delta",
    "skippedByCap_a", "skippedByCap_b", "skippedByCap_delta",
    "filteredOut_a", "filteredOut_b", "filteredOut_delta",
    "matched_a", "matched_b", "matched_delta",
    "status_a", "status_b", "status_changed",
  ];
  const escCsv = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows: string[][] = [header];
  const cats: Category[] = opts.include && opts.include.length
    ? opts.include
    : ["legacy", "hydration", "jsonLd", "robots"];
  for (const cat of cats) {
    const d = diff.categories[cat];
    rows.push([
      cat,
      String(d.emitted.a), String(d.emitted.b), String(d.emitted.delta),
      String(d.skippedByCap.a), String(d.skippedByCap.b), String(d.skippedByCap.delta),
      String(d.filteredOut.a), String(d.filteredOut.b), String(d.filteredOut.delta),
      String(d.matched.a), String(d.matched.b), String(d.matched.delta),
      d.status.a, d.status.b, String(d.status.changed),
    ]);
  }
  rows.push([
    "__totalEmitted__",
    String(diff.totalEmitted.a), String(diff.totalEmitted.b), String(diff.totalEmitted.delta),
    "", "", "", "", "", "", "", "", "", "", "", "",
  ]);
  rows.push([
    "__totalSkipped__",
    String(diff.totalSkipped.a), String(diff.totalSkipped.b), String(diff.totalSkipped.delta),
    "", "", "", "", "", "", "", "", "", "", "", "",
  ]);
  const prefix = `# A: ${diff.labels.a}\n# B: ${diff.labels.b}\n`;
  return prefix + rows.map((r) => r.map(escCsv).join(",")).join("\n") + "\n";
}

/** Fully documented config template written by --write-sample-config. */
export const SAMPLE_CONFIG_TEMPLATE = `{
  "$schema": "./seo-annotations.config.schema.json",

  // Per-category caps on the number of GitHub Actions annotations emitted.
  // 'default' is used when a per-category value is not set. CLI flags
  // (--max, --max-legacy, --max-hydration, --max-robots, --max-jsonld) and
  // env vars (SEO_ANN_MAX_{LEGACY,HYDRATION,ROBOTS,JSONLD}) override these.
  "caps": {
    "default": 20,
    "legacy": 20,
    "hydration": 20,
    "robots": 20,
    "jsonLd": 20
  },

  // Restrict annotations to a locale and/or page variant. Overridden by
  // --locale/--variant CLI flags or SEO_BASELINE_LOCALE/SEO_BASELINE_VARIANT.
  "filter": {
    "locale": "en-CA",
    "variant": "blog"
  },

  // Per-category (and total) caps on *skipped* failures. When
  // --fail-on-skipped is set (or SEO_ANN_FAIL_ON_SKIPPED=1), exceeding any
  // limit causes CI to exit non-zero so overly restrictive thresholds surface
  // early. Individual limits are also honored via env:
  // SEO_ANN_FAIL_ON_SKIPPED_{LEGACY,HYDRATION,ROBOTS,JSONLD,TOTAL}.
  "failOnSkipped": {
    "legacy": 50,
    "hydration": 50,
    "robots": 20,
    "jsonLd": 20,
    "total": 100
  }
}
`;

/** Strip `//` line and `/* ... *\/` block comments from a JSON-ish source. */
export function stripJsonComments(src: string): string {
  let out = "";
  let i = 0;
  let inStr = false;
  let strCh = "";
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (inStr) {
      out += c;
      if (c === "\\" && i + 1 < src.length) { out += src[i + 1]; i += 2; continue; }
      if (c === strCh) inStr = false;
      i++;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; out += c; i++; continue; }
    if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && n === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
};

export type SchemaError = {
  path: string;             // e.g. "$.caps.legacy"
  keyword: "type" | "minimum" | "maximum" | "minLength" | "additionalProperties";
  expected: string;         // human-readable expectation (types/range)
  actual: string;           // e.g. "string \"20\"" or ">= 0"
  example: unknown;         // a corrected value for this field
  snippet: string;          // JSON snippet like `"legacy": 20`
};

/** Build a sensible corrected example value for a given schema node. */
function exampleFor(schema: JsonSchema): unknown {
  const t = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (t === "integer" || t === "number") {
    const min = typeof schema.minimum === "number" ? schema.minimum : 0;
    return Math.max(min, 20);
  }
  if (t === "string") return "example";
  if (t === "boolean") return true;
  if (t === "array") return [];
  if (t === "object") return {};
  return null;
}

/** Minimal JSON Schema (draft-07 subset) validator returning structured
 *  errors: type, properties, additionalProperties, minimum, maximum, minLength.
 */
export function validateAgainstSchemaDetailed(
  value: unknown,
  schema: JsonSchema,
  path = "$",
  fieldName: string | null = null,
): SchemaError[] {
  const errs: SchemaError[] = [];
  const typeOf = (v: unknown): string => {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    if (Number.isInteger(v as number)) return "integer";
    return typeof v;
  };
  const mkSnippet = (name: string | null, val: unknown): string =>
    name ? `"${name}": ${JSON.stringify(val)}` : JSON.stringify(val);

  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const t = typeOf(value);
    const ok = allowed.some((a) => a === t || (a === "number" && t === "integer"));
    if (!ok) {
      const ex = exampleFor(schema);
      errs.push({
        path,
        keyword: "type",
        expected: allowed.join(" | "),
        actual: `${t} (${JSON.stringify(value)})`,
        example: ex,
        snippet: mkSnippet(fieldName, ex),
      });
    }
  }
  if (typeof value === "number" && typeof schema.minimum === "number" && value < schema.minimum) {
    const ex = schema.minimum;
    errs.push({
      path,
      keyword: "minimum",
      expected: `>= ${schema.minimum}`,
      actual: `${value}`,
      example: ex,
      snippet: mkSnippet(fieldName, ex),
    });
  }
  if (typeof value === "number" && typeof schema.maximum === "number" && value > schema.maximum) {
    const ex = schema.maximum;
    errs.push({
      path,
      keyword: "maximum",
      expected: `<= ${schema.maximum}`,
      actual: `${value}`,
      example: ex,
      snippet: mkSnippet(fieldName, ex),
    });
  }
  if (typeof value === "string" && typeof schema.minLength === "number" && value.length < schema.minLength) {
    const ex = "example";
    errs.push({
      path,
      keyword: "minLength",
      expected: `minLength ${schema.minLength}`,
      actual: `length ${value.length}`,
      example: ex,
      snippet: mkSnippet(fieldName, ex),
    });
  }
  if (schema.properties && value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const [k, sub] of Object.entries(schema.properties)) {
      if (k in obj) errs.push(...validateAgainstSchemaDetailed(obj[k], sub, `${path}.${k}`, k));
    }
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(obj)) {
        if (!(k in schema.properties)) {
          errs.push({
            path: `${path}.${k}`,
            keyword: "additionalProperties",
            expected: `one of: ${Object.keys(schema.properties).join(", ")}`,
            actual: `unknown property "${k}"`,
            example: undefined,
            snippet: `// remove "${k}" from ${path}`,
          });
        }
      }
    }
  }
  return errs;
}

/** Legacy string-based validator, retained for callers/tests that expect
 *  flat message strings. Wraps validateAgainstSchemaDetailed. */
export function validateAgainstSchema(value: unknown, schema: JsonSchema, path = "$"): string[] {
  return validateAgainstSchemaDetailed(value, schema, path).map(
    (e) => `${e.path} — expected ${e.expected} (got ${e.actual})`,
  );
}

/** Format a SchemaError as a multi-line human message with corrected snippet. */
export function formatSchemaError(e: SchemaError): string {
  const lines = [
    `  • ${e.path}`,
    `      keyword : ${e.keyword}`,
    `      expected: ${e.expected}`,
    `      actual  : ${e.actual}`,
  ];
  if (e.snippet) lines.push(`      fix     : ${e.snippet}`);
  return lines.join("\n");
}

/** Parse SAMPLE_CONFIG_TEMPLATE and validate it against the JSON schema.
 *  Throws with an actionable message when the documented template ever drifts
 *  from seo-annotations.config.schema.json (fail-fast). Ignores the `$schema`
 *  field which is a hint for editors, not a config value.
 */
export function validateSampleConfigTemplate(schemaPath?: string): void {
  // Try caller-provided path, then cwd, then next-to-this-script. This makes
  // the fail-fast check work from CI, from unit tests (tmp cwd), and from the
  // CLI regardless of where it was invoked.
  const candidates: string[] = [];
  if (schemaPath) candidates.push(resolve(schemaPath));
  else {
    candidates.push(resolve("seo-annotations.config.schema.json"));
    try {
      const here = new URL(".", import.meta.url).pathname;
      if (here) candidates.push(resolve(here, "..", "seo-annotations.config.schema.json"));
    } catch { /* noop */ }
  }
  const sp = candidates.find((p) => existsSync(p));
  if (!sp) {
    throw new Error(`Sample config validation: schema file not found (tried: ${candidates.join(", ")})`);
  }
  const schema = JSON.parse(readFileSync(sp, "utf8")) as JsonSchema;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonComments(SAMPLE_CONFIG_TEMPLATE));
  } catch (e) {
    throw new Error(`Sample config template is not valid JSON (after stripping comments): ${(e as Error).message}`);
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    delete (parsed as Record<string, unknown>).$schema;
  }
  const errs = validateAgainstSchemaDetailed(parsed, schema);
  if (errs.length) {
    throw new Error(
      `SAMPLE_CONFIG_TEMPLATE has drifted from ${sp}:\n${errs.map(formatSchemaError).join("\n")}\n` +
        `Fix SAMPLE_CONFIG_TEMPLATE in scripts/gh-annotations.ts or update the schema.`,
    );
  }
  // Also cross-check with the runtime validator so both stay in sync.
  validateConfig(parsed, "SAMPLE_CONFIG_TEMPLATE");
}

/** Write a fully documented config template. Returns the resolved path.
 *  Fails fast (throws) when the template no longer matches the JSON schema.
 */
export function writeSampleConfig(path?: string, schemaPath?: string): string {
  validateSampleConfigTemplate(schemaPath);
  const dest = resolve(path ?? "seo-annotations.config.sample.json");
  writeFileSync(dest, SAMPLE_CONFIG_TEMPLATE);
  return dest;
}

/** Parse a --fail-on-plan-regression threshold value. Accepts absolute
 *  integers ("5") or percent strings ("25%"). Returns { kind, value }.
 *  Undefined/empty → { kind: "absolute", value: 0 }.
 */
export function parseRegressionThreshold(
  raw: string | number | undefined,
): { kind: "absolute" | "percent"; value: number } {
  if (raw == null || raw === "") return { kind: "absolute", value: 0 };
  const s = String(raw).trim();
  if (s.endsWith("%")) {
    const n = Number(s.slice(0, -1));
    if (Number.isFinite(n) && n >= 0) return { kind: "percent", value: n };
    return { kind: "absolute", value: 0 };
  }
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0) return { kind: "absolute", value: Math.floor(n) };
  return { kind: "absolute", value: 0 };
}

/** Evaluate a plan diff against a regression threshold. */
export function evaluateRegression(
  diff: ReturnType<typeof diffPlans>,
  threshold: { kind: "absolute" | "percent"; value: number },
): {
  triggered: boolean;
  metric: "totalSkipped";
  before: number;
  after: number;
  delta: number;
  deltaPercent: number; // Infinity when before=0 and delta>0
  threshold: { kind: "absolute" | "percent"; value: number };
  perCategory: {
    category: Category;
    before: number;
    after: number;
    delta: number;
    deltaPercent: number;
    exceeds: boolean;
  }[];
} {
  const before = diff.totalSkipped.a;
  const after = diff.totalSkipped.b;
  const delta = diff.totalSkipped.delta;
  const pct = before > 0 ? (delta / before) * 100 : delta > 0 ? Infinity : 0;
  const triggered =
    threshold.kind === "percent" ? pct > threshold.value : delta > threshold.value;
  const cats: Category[] = ["legacy", "hydration", "jsonLd", "robots"];
  const perCategory = cats.map((c) => {
    const cb = diff.categories[c].skippedByCap.a;
    const ca = diff.categories[c].skippedByCap.b;
    const cd = diff.categories[c].skippedByCap.delta;
    const cp = cb > 0 ? (cd / cb) * 100 : cd > 0 ? Infinity : 0;
    const exceeds =
      threshold.kind === "percent" ? cp > threshold.value : cd > threshold.value;
    return { category: c, before: cb, after: ca, delta: cd, deltaPercent: cp, exceeds };
  });
  return { triggered, metric: "totalSkipped", before, after, delta, deltaPercent: pct, threshold, perCategory };
}

/** Severity band → deltaPercent threshold. A category "exceeds" the band when
 *  its skippedByCap deltaPercent is strictly greater than the band's value.
 *  Infinite deltaPercent (before=0 → after>0) always exceeds any finite band.
 */
export type SeverityBand = "minor" | "major" | "critical";
export const SEVERITY_BANDS: Record<SeverityBand, number> = {
  minor: 1,
  major: 25,
  critical: 50,
};

export function parseSeverityBand(raw: string | undefined | null): SeverityBand | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "minor" || s === "major" || s === "critical") return s;
  return null;
}

/** Evaluate a plan diff against a severity band. Returns per-category exceed
 *  flags and whether the overall check should fail (any category exceeds).
 */
export function evaluateRegressionSeverity(
  diff: ReturnType<typeof diffPlans>,
  band: SeverityBand,
  include?: Category[] | null,
): {
  triggered: boolean;
  band: SeverityBand;
  thresholdPercent: number;
  perCategory: {
    category: Category;
    before: number;
    after: number;
    delta: number;
    deltaPercent: number;
    exceeds: boolean;
  }[];
} {
  const thresholdPercent = SEVERITY_BANDS[band];
  const cats: Category[] = include && include.length
    ? include
    : ["legacy", "hydration", "jsonLd", "robots"];
  const perCategory = cats.map((c) => {
    const cb = diff.categories[c].skippedByCap.a;
    const ca = diff.categories[c].skippedByCap.b;
    const cd = diff.categories[c].skippedByCap.delta;
    const cp = cb > 0 ? (cd / cb) * 100 : cd > 0 ? Infinity : 0;
    const exceeds = cp > thresholdPercent;
    return { category: c, before: cb, after: ca, delta: cd, deltaPercent: cp, exceeds };
  });
  return {
    triggered: perCategory.some((c) => c.exceeds),
    band,
    thresholdPercent,
    perCategory,
  };
}

/** Serialize a regression evaluation (from evaluateRegression) to CSV. */
export function regressionToCsv(
  regression: ReturnType<typeof evaluateRegression>,
  opts: { include?: Category[] | null; labels?: { a: string; b: string } } = {},
): string {
  const escCsv = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["category", "before", "after", "delta", "deltaPercent", "exceeds"];
  const includeSet = opts.include && opts.include.length ? new Set(opts.include) : null;
  const rows: string[][] = [header];
  for (const c of regression.perCategory) {
    if (includeSet && !includeSet.has(c.category)) continue;
    const pct = Number.isFinite(c.deltaPercent) ? c.deltaPercent.toFixed(2) : "Infinity";
    rows.push([c.category, String(c.before), String(c.after), String(c.delta), pct, String(c.exceeds)]);
  }
  const totalPct = Number.isFinite(regression.deltaPercent)
    ? regression.deltaPercent.toFixed(2)
    : "Infinity";
  rows.push(["__total__", String(regression.before), String(regression.after), String(regression.delta), totalPct, String(regression.triggered)]);
  const prefix = opts.labels ? `# A: ${opts.labels.a}\n# B: ${opts.labels.b}\n` : "";
  const tDesc = regression.threshold.kind === "percent"
    ? `${regression.threshold.value}%`
    : `${regression.threshold.value}`;
  return `${prefix}# threshold: ${tDesc}\n` + rows.map((r) => r.map(escCsv).join(",")).join("\n") + "\n";
}

/** Get structured schema-drift errors for the sample-config template. Returns
 *  an empty array when no drift is present. Used by --schema-error-report.
 */
export function getSampleConfigTemplateErrors(schemaPath?: string): SchemaError[] {
  const candidates: string[] = [];
  if (schemaPath) candidates.push(resolve(schemaPath));
  else {
    candidates.push(resolve("seo-annotations.config.schema.json"));
    try {
      const here = new URL(".", import.meta.url).pathname;
      if (here) candidates.push(resolve(here, "..", "seo-annotations.config.schema.json"));
    } catch { /* noop */ }
  }
  const sp = candidates.find((p) => existsSync(p));
  if (!sp) return [];
  const schema = JSON.parse(readFileSync(sp, "utf8")) as JsonSchema;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonComments(SAMPLE_CONFIG_TEMPLATE));
  } catch { return []; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    delete (parsed as Record<string, unknown>).$schema;
  }
  return validateAgainstSchemaDetailed(parsed, schema);
}

function emit(a: Annotation) {
  const parts = [`file=${a.file}`];
  if (a.line) parts.push(`line=${a.line}`);
  parts.push(`title=${esc(a.title)}`);
  process.stdout.write(`::${a.level} ${parts.join(",")}::${esc(a.message)}\n`);
}

// ---------------------------------------------------------------------------
// CLI entrypoint — skipped when this module is imported (e.g. from tests).
// ---------------------------------------------------------------------------
const isDirectRun = (() => {
  try {
    // tsx / node both set process.argv[1] to the script path
    const invoked = process.argv[1] ?? "";
    return invoked.endsWith("gh-annotations.ts") || invoked.endsWith("gh-annotations.js");
  } catch { return false; }
})();

if (isDirectRun) {
  const argv = process.argv.slice(2);

  // --schema-error-report[=path] — write schema-drift-errors.json with the
  // structured path/expected/actual/snippet details for each failing field.
  // Runs BEFORE --write-sample-config so both flags can be combined; the file
  // is always written (empty array when there is no drift).
  if (argv.some((a) => a === "--schema-error-report" || a.startsWith("--schema-error-report="))) {
    const p = argVal(argv, "schema-error-report");
    const dest = resolve(p && p.length ? p : resolve(REPORT_DIR, "schema-drift-errors.json"));
    mkdirSync(resolve(dest, ".."), { recursive: true });
    const errs = getSampleConfigTemplateErrors();
    writeFileSync(
      dest,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          drift: errs.length > 0,
          count: errs.length,
          errors: errs,
        },
        null,
        2,
      ),
    );
    process.stdout.write(
      `Wrote schema-drift-errors.json → ${dest} (${errs.length} error(s))\n`,
    );
    if (errs.length) {
      process.stdout.write(
        `::error title=SEO annotations sample-config drift::${errs.length} field(s) drifted; see ${dest}\n`,
      );
    }
    // Continue: allow --write-sample-config or normal run to follow.
  }

  // --write-sample-config[=path] — write a fully documented template and exit.
  if (argv.some((a) => a === "--write-sample-config" || a.startsWith("--write-sample-config="))) {
    const p = argVal(argv, "write-sample-config");
    const dest = writeSampleConfig(p);
    process.stdout.write(`Wrote sample config → ${dest}\n`);
    process.exit(0);
  }

  const configPath = argVal(argv, "config") ?? process.env.SEO_ANN_CONFIG;
  let config: AnnotationsConfig;
  try {
    config = loadConfigFile(configPath);
  } catch (e) {
    // Friendly, actionable failure — visible in the Checks UI.
    const msg = (e as Error).message;
    process.stdout.write(`::error title=Invalid SEO annotations config::${esc(msg)}\n`);
    process.stderr.write(msg + "\n");
    process.exit(2);
  }
  const { caps, filter, failOnSkipped, failOnSkippedEnabled } = parseConfig(argv, process.env, config);
  // --dry-run              → dry-run mode, do not write annotation-plan.json (unless env forces)
  // --dry-run=output       → dry-run mode AND explicitly emit annotation-plan.json
  const dryRunVal = argVal(argv, "dry-run");
  const dryRunFlag = hasFlag(argv, "dry-run") || dryRunVal != null || process.env.SEO_ANN_DRY_RUN === "1";
  const dryRun = dryRunFlag;
  const emitPlanFile = true; // always write annotation-plan.json for CI artifact
  const dryRunOutput = dryRunVal === "output";
  const legacy = readJson<LegacyDoc>("legacy-redirects.json");
  const hydration = readJson<HydrationDoc>("hydration.json");
  const jsonld = readJson<JsonLdDoc>("jsonld-preflight.json");
  const robots = readJson<RobotsDoc>("robots-directives.json");

  const { annotations, skipped, totals, plan } = selectAnnotations({
    legacy, hydration, jsonld, robots, caps, filter,
  });

  // --plan-format=csv writes an additional annotation-plan.csv artifact.
  const planFormat = argVal(argv, "plan-format");
  // --top-skipped-reasons=<n> controls how many top skipped reasons appear
  // in each per-category ::notice line.
  const TOP_NOTICE = intOr(argVal(argv, "top-skipped-reasons") ?? process.env.SEO_ANN_TOP_SKIPPED_REASONS, 3);
  // --plan-category-include=cat1,cat2 restricts PR tables and CSV outputs to
  // the listed categories. `null` = no restriction. Accepts aliases (jsonld,
  // json-ld, legacy-redirects).
  const includeCats = parseCategoryInclude(
    argVal(argv, "plan-category-include") ?? process.env.SEO_ANN_PLAN_CATEGORY_INCLUDE ?? null,
  );



  // --compare-locale=<code> / --compare-variant=<name>: compute a second plan
  // using the alternate filter and write a diff report showing how planned
  // and skipped counts change between the two selections.
  const cmpLocale = argVal(argv, "compare-locale");
  const cmpVariant = argVal(argv, "compare-variant");
  const compareFilter: Filter | null =
    cmpLocale != null || cmpVariant != null
      ? { locale: cmpLocale ?? filter.locale, variant: cmpVariant ?? filter.variant }
      : null;
  const comparePlan = compareFilter
    ? selectAnnotations({ legacy, hydration, jsonld, robots, caps, filter: compareFilter }).plan
    : null;
  const planDiff = compareFilter && comparePlan
    ? diffPlans(plan, comparePlan, {
        a: `locale=${filter.locale ?? "*"},variant=${filter.variant ?? "*"}`,
        b: `locale=${compareFilter.locale ?? "*"},variant=${compareFilter.variant ?? "*"}`,
      })
    : null;

  if (dryRun) {
    process.stderr.write(
      `[gh-annotations dry-run${dryRunOutput ? "=output" : ""}] filter locale=${filter.locale ?? "*"} variant=${filter.variant ?? "*"}\n`,
    );
    process.stderr.write(
      `[gh-annotations dry-run] caps legacy=${caps.legacy} hydration=${caps.hydration} robots=${caps.robots} jsonLd=${caps.jsonLd}\n`,
    );
    for (const a of annotations) {
      process.stderr.write(`  WILL EMIT [${a.level}] ${a.file} — ${a.title}\n`);
    }
    for (const cat of ["legacy", "hydration", "jsonLd", "robots"] as const) {
      const p = plan.categories[cat];
      if (p.skippedByCap > 0 || p.filteredOut > 0) {
        process.stderr.write(
          `  SKIPPED  [${cat}] cap=${p.skippedByCap} filter=${p.filteredOut} (of ${p.rawFailures} raw, ${p.matched} matched, cap ${caps[cat]})\n`,
        );
      }
    }
    process.stderr.write(
      `[gh-annotations dry-run] would emit ${annotations.length}, skip ${plan.totalSkipped}\n`,
    );
  } else {
    for (const a of annotations) emit(a);
  }

  const violations = evaluateSkippedLimits(skipped, failOnSkipped);

  // Persist skipped/total counts for the PR-comment renderer.
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    resolve(REPORT_DIR, "annotation-skipped.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        caps, filter, totals, skipped,
        emitted: dryRun ? 0 : annotations.length,
        wouldEmit: annotations.length,
        dryRun,
        dryRunMode: dryRunOutput ? "output" : dryRun ? "preview" : null,
        failOnSkipped,
        failOnSkippedEnabled,
        violations,
      },
      null,
      2,
    ),
  );

  // annotation-plan.json — planned vs skipped counts + per-item details for
  // debugging. Always written so CI can upload it as a dedicated artifact;
  // `--dry-run=output` guarantees the plan file exists even when the caller
  // wants to skip emission entirely.
  if (emitPlanFile || dryRunOutput) {
    writeFileSync(
      resolve(REPORT_DIR, "annotation-plan.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          caps, filter, dryRun, dryRunMode: dryRunOutput ? "output" : dryRun ? "preview" : null,
          totals, skipped,
          totalEmitted: dryRun ? 0 : annotations.length,
          totalWouldEmit: annotations.length,
          totalSkipped: plan.totalSkipped,
          categories: plan.categories,
          annotations: plan.annotations,
        },
        null,
        2,
      ),
    );
  }

  // annotation-plan-summary.json — compact top-level totals + per-category
  // skipped-reason breakdowns for automated parsing (dashboards, alerts).
  // The number of reasons per category is bounded by --top-skipped-reasons=<n>
  // (same knob that controls per-category ::notice output).
  {
    const categoriesSummary: Record<string, {
      status: CategoryPlan["status"];
      rawFailures: number;
      matched: number;
      emitted: number;
      skippedByCap: number;
      filteredOut: number;
      topSkippedReasons: { reason: SkipReason | "filter"; summary: string }[];
    }> = {};
    const summaryCats: readonly Category[] = includeCats && includeCats.length
      ? includeCats
      : (["legacy", "hydration", "jsonLd", "robots"] as const);
    for (const cat of summaryCats) {
      const p = plan.categories[cat];
      // Prefer cap-skipped reasons first (they indicate CI-suppressed output),
      // then fill remaining slots with filter-skipped reasons.
      const reasons: { reason: SkipReason | "filter"; summary: string }[] = [];
      for (const s of p.topSkipped.slice(0, TOP_NOTICE)) reasons.push({ reason: s.reason, summary: s.summary });
      for (const s of p.topFiltered.slice(0, Math.max(0, TOP_NOTICE - reasons.length))) {
        reasons.push({ reason: s.reason, summary: s.summary });
      }
      categoriesSummary[cat] = {
        status: p.status,
        rawFailures: p.rawFailures,
        matched: p.matched,
        emitted: p.emitted,
        skippedByCap: p.skippedByCap,
        filteredOut: p.filteredOut,
        topSkippedReasons: reasons,
      };
    }
    const summaryDoc = {
      generatedAt: new Date().toISOString(),
      filter,
      caps,
      topSkippedReasons: TOP_NOTICE,
      totals: {
        planned: annotations.length,
        emitted: dryRun ? 0 : annotations.length,
        wouldEmit: annotations.length,
        skipped: plan.totalSkipped,
        skippedByCap: skipped.legacy + skipped.hydration + skipped.robots + skipped.jsonLd,
        rawFailures: totals.legacy + totals.hydration + totals.robots + totals.jsonLd,
      },
      categories: categoriesSummary,
    };
    writeFileSync(
      resolve(REPORT_DIR, "annotation-plan-summary.json"),
      JSON.stringify(summaryDoc, null, 2),
    );

    // --plan-summary-format=csv writes annotation-plan-summary.csv alongside
    // the JSON artifact for spreadsheet-friendly parsing.
    const planSummaryFormat = argVal(argv, "plan-summary-format");
    if (planSummaryFormat === "csv") {
      const esc = (v: unknown): string => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows: string[] = [];
      rows.push("category,status,rawFailures,matched,emitted,skippedByCap,filteredOut,topSkippedReasons");
      for (const [cat, c] of Object.entries(categoriesSummary)) {
        const reasons = c.topSkippedReasons.map((r) => `${r.reason}: ${r.summary}`).join(" | ");
        rows.push(
          [cat, c.status, c.rawFailures, c.matched, c.emitted, c.skippedByCap, c.filteredOut, reasons]
            .map(esc)
            .join(","),
        );
      }
      rows.push("");
      rows.push("metric,value");
      for (const [k, v] of Object.entries(summaryDoc.totals)) rows.push(`${esc(k)},${esc(v)}`);
      writeFileSync(resolve(REPORT_DIR, "annotation-plan-summary.csv"), rows.join("\n") + "\n");
    }
  }

  // --dry-run=output --plan-format=csv writes annotation-plan.csv alongside JSON.
  if (planFormat === "csv" || (dryRunOutput && planFormat === "csv")) {
    writeFileSync(
      resolve(REPORT_DIR, "annotation-plan.csv"),
      planToCsv(plan, {
        filterLabel: `locale=${filter.locale ?? "*"},variant=${filter.variant ?? "*"}`,
        include: includeCats,
      }),
    );
  }

  // --compare-locale / --compare-variant: write annotation-plan-diff.{json,md}.
  if (planDiff && comparePlan) {
    writeFileSync(
      resolve(REPORT_DIR, "annotation-plan-diff.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), diff: planDiff, a: plan, b: comparePlan }, null, 2),
    );
    const lines: string[] = [];
    lines.push(`# Annotation plan diff`);
    lines.push(``);
    lines.push(`- A: \`${planDiff.labels.a}\``);
    lines.push(`- B: \`${planDiff.labels.b}\``);
    lines.push(``);
    lines.push(`| Category | Emitted (A→B) | Δ | Cap-skipped (A→B) | Δ | Filter-skipped (A→B) | Δ | Status (A→B) |`);
    lines.push(`|---|---:|---:|---:|---:|---:|---:|---|`);
    const diffCats: readonly Category[] = includeCats && includeCats.length
      ? includeCats
      : (["legacy", "hydration", "jsonLd", "robots"] as const);
    for (const cat of diffCats) {
      const d = planDiff.categories[cat];
      const arrow = (n: number) => (n > 0 ? `+${n}` : `${n}`);
      lines.push(
        `| ${cat} | ${d.emitted.a}→${d.emitted.b} | ${arrow(d.emitted.delta)} | ${d.skippedByCap.a}→${d.skippedByCap.b} | ${arrow(d.skippedByCap.delta)} | ${d.filteredOut.a}→${d.filteredOut.b} | ${arrow(d.filteredOut.delta)} | ${d.status.a}${d.status.changed ? ` → **${d.status.b}**` : ""} |`,
      );
    }
    lines.push(``);
    lines.push(`Total emitted: ${planDiff.totalEmitted.a} → ${planDiff.totalEmitted.b} (Δ ${planDiff.totalEmitted.delta >= 0 ? "+" : ""}${planDiff.totalEmitted.delta})`);
    lines.push(`Total skipped: ${planDiff.totalSkipped.a} → ${planDiff.totalSkipped.b} (Δ ${planDiff.totalSkipped.delta >= 0 ? "+" : ""}${planDiff.totalSkipped.delta})`);
    writeFileSync(resolve(REPORT_DIR, "annotation-plan-diff.md"), lines.join("\n") + "\n");
    // Spreadsheet-friendly CSV of the same diff.
    writeFileSync(resolve(REPORT_DIR, "annotation-plan-diff.csv"), planDiffToCsv(planDiff, { include: includeCats }));
    process.stdout.write(
      `::notice title=SEO annotations diff::${planDiff.labels.a} vs ${planDiff.labels.b} — Δemitted=${planDiff.totalEmitted.delta} Δskipped=${planDiff.totalSkipped.delta}\n`,
    );
  }

  // --plan-regression-format=csv → write annotation-plan-regression.csv (needs
  // a compare selection; emitted whenever `planDiff` is available).
  const regressionFormat = argVal(argv, "plan-regression-format");

  // --fail-on-regression-severity=<band> — fail when any category's
  // deltaPercent exceeds the band's threshold (minor=1%, major=25%,
  // critical=50%). Runs independently of --fail-on-plan-regression.
  const severityArg = argVal(argv, "fail-on-regression-severity") ?? process.env.SEO_ANN_FAIL_ON_REGRESSION_SEVERITY;
  const severityBand = parseSeverityBand(severityArg);
  if (severityArg != null && !severityBand) {
    process.stdout.write(
      `::error title=SEO annotations severity::Invalid --fail-on-regression-severity=${severityArg} (expected minor|major|critical)\n`,
    );
    process.exit(2);
  }

  // --fail-on-plan-regression[=N|N%] — exit 1 when the compare selection's
  // totalSkipped grows more than the threshold (absolute count, default 0, or
  // a percentage of the base when suffixed with `%`).
  const regressionArg = argVal(argv, "fail-on-plan-regression");
  const regressionFlag = hasFlag(argv, "fail-on-plan-regression") || regressionArg != null;
  if (regressionFlag || severityBand) {
    if (!planDiff) {
      process.stdout.write(
        `::warning title=SEO annotations plan-regression::--fail-on-plan-regression/--fail-on-regression-severity set but no --compare-locale/--compare-variant provided; skipping.\n`,
      );
    } else {
      const threshold = parseRegressionThreshold(regressionArg);
      const regression = evaluateRegression(planDiff, threshold);
      // Persist per-category regression deltas so validator-summary.ts can
      // surface them in the PR comment even when we exit non-zero here.
      const severityEval = severityBand
        ? evaluateRegressionSeverity(planDiff, severityBand, includeCats)
        : null;
      writeFileSync(
        resolve(REPORT_DIR, "annotation-plan-regression.json"),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            labels: planDiff.labels,
            include: includeCats,
            ...regression,
            severity: severityEval,
          },
          null,
          2,
        ),
      );
      if (regressionFormat === "csv") {
        writeFileSync(
          resolve(REPORT_DIR, "annotation-plan-regression.csv"),
          regressionToCsv(regression, { include: includeCats, labels: planDiff.labels }),
        );
      }
      let shouldFail = false;
      if (regressionFlag && regression.triggered) {
        shouldFail = true;
        const tDesc = threshold.kind === "percent" ? `${threshold.value}%` : `${threshold.value}`;
        const pctDesc = Number.isFinite(regression.deltaPercent)
          ? `${regression.deltaPercent.toFixed(1)}%`
          : "∞%";
        process.stdout.write(
          `::error title=SEO annotations plan regression::totalSkipped ${regression.before} → ${regression.after} (Δ+${regression.delta}, ${pctDesc}) exceeds threshold ${tDesc}\n`,
        );
        for (const c of regression.perCategory) {
          if (includeCats && !includeCats.includes(c.category)) continue;
          if (c.delta === 0 && !c.exceeds) continue;
          const cPct = Number.isFinite(c.deltaPercent) ? `${c.deltaPercent.toFixed(1)}%` : "∞%";
          const level = c.exceeds ? "error" : "notice";
          process.stdout.write(
            `::${level} title=SEO annotations regression (${c.category})::skippedByCap ${c.before} → ${c.after} (Δ${c.delta >= 0 ? "+" : ""}${c.delta}, ${cPct}) threshold ${tDesc}\n`,
          );
        }
      }
      if (severityEval && severityEval.triggered) {
        shouldFail = true;
        process.stdout.write(
          `::error title=SEO annotations regression severity::band=${severityEval.band} (>${severityEval.thresholdPercent}%) exceeded\n`,
        );
        for (const c of severityEval.perCategory) {
          if (!c.exceeds) continue;
          const cPct = Number.isFinite(c.deltaPercent) ? `${c.deltaPercent.toFixed(1)}%` : "∞%";
          process.stdout.write(
            `::error title=SEO annotations severity (${c.category})::skippedByCap ${c.before} → ${c.after} (Δ${c.delta >= 0 ? "+" : ""}${c.delta}, ${cPct}) band ${severityEval.band} (>${severityEval.thresholdPercent}%)\n`,
          );
        }
      }
      if (shouldFail) process.exit(1);
    }
  }

  const filterDesc = filter.locale || filter.variant
    ? ` filter[locale=${filter.locale ?? "*"},variant=${filter.variant ?? "*"}]`
    : "";
  const capsDesc = `caps[legacy=${caps.legacy},hydration=${caps.hydration},robots=${caps.robots},jsonLd=${caps.jsonLd}]`;
  const skippedDesc = `skipped[legacy=${skipped.legacy},hydration=${skipped.hydration},robots=${skipped.robots},jsonLd=${skipped.jsonLd}]`;
  const dryDesc = dryRun ? (dryRunOutput ? " [dry-run=output]" : " [dry-run]") : "";
  process.stdout.write(
    `::notice title=SEO annotations${dryDesc}::${dryRun ? "would emit " : ""}${annotations.length} annotation(s) ` +
      `(legacy=${totals.legacy}, hydration=${totals.hydration}, jsonLd=${totals.jsonLd}, robots=${totals.robots}) ` +
      `${capsDesc} ${skippedDesc}${filterDesc}\n`,
  );

  // Per-category notices — always emit one per category with status + top N
  // skipped reasons so reviewers can debug omissions directly from Checks UI.
  // Count controlled by --top-skipped-reasons=<n> (default 3).
  for (const cat of ["legacy", "hydration", "jsonLd", "robots"] as const) {
    const p = plan.categories[cat];
    const reasonLabel: Record<CategoryPlan["status"], string> = {
      "ok": "all emitted",
      "cap-reached": `cap reached (cap ${caps[cat]})`,
      "filter-mismatch": `filter mismatch (locale=${filter.locale ?? "*"}, variant=${filter.variant ?? "*"})`,
      "no-matching-failures": "no matching failures",
      "partial": "partial",
    };
    const parts = [
      `${p.emitted}/${p.rawFailures} emitted`,
      `matched=${p.matched}`,
      `cap-skipped=${p.skippedByCap}`,
      `filter-skipped=${p.filteredOut}`,
      `status=${reasonLabel[p.status]}`,
    ];
    const samples: string[] = [];
    for (const s of p.topSkipped.slice(0, TOP_NOTICE)) samples.push(`cap: ${s.summary}`);
    for (const s of p.topFiltered.slice(0, Math.max(0, TOP_NOTICE - samples.length))) samples.push(`filter: ${s.summary}`);
    const samplesDesc = samples.length ? ` · top skipped: ${samples.join(" | ")}` : "";
    process.stdout.write(
      `::notice title=SEO annotations (${cat})::${parts.join(" ")}${samplesDesc}\n`,
    );
  }

  if (failOnSkippedEnabled && violations.length) {
    for (const v of violations) {
      process.stdout.write(
        `::error title=SEO annotations skipped cap exceeded::${v.category} skipped=${v.skipped} > limit=${v.limit}\n`,
      );
    }
    process.exit(1);
  }
}

