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
export function planToCsv(plan: AnnotationPlan, meta: { filterLabel?: string } = {}): string {
  const header = [
    "category", "rawFailures", "matched", "emitted", "skippedByCap",
    "filteredOut", "status", "topSkipped", "topFiltered",
  ];
  const rows: string[][] = [header];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  for (const cat of ["legacy", "hydration", "jsonLd", "robots"] as const) {
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
export function planDiffToCsv(diff: ReturnType<typeof diffPlans>): string {
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
  for (const cat of ["legacy", "hydration", "jsonLd", "robots"] as const) {
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
  minLength?: number;
};

/** Minimal JSON Schema (draft-07 subset) validator: type, properties,
 *  additionalProperties, minimum, minLength. Sufficient for our config schema.
 */
export function validateAgainstSchema(value: unknown, schema: JsonSchema, path = "$"): string[] {
  const errs: string[] = [];
  const typeOf = (v: unknown): string => {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    if (Number.isInteger(v as number)) return "integer";
    return typeof v;
  };
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const t = typeOf(value);
    const ok = allowed.some((a) => a === t || (a === "number" && t === "integer"));
    if (!ok) errs.push(`${path} — expected type ${allowed.join("|")} (got ${t})`);
  }
  if (typeof value === "number" && typeof schema.minimum === "number" && value < schema.minimum) {
    errs.push(`${path} — expected >= ${schema.minimum} (got ${value})`);
  }
  if (typeof value === "string" && typeof schema.minLength === "number" && value.length < schema.minLength) {
    errs.push(`${path} — expected minLength ${schema.minLength} (got ${value.length})`);
  }
  if (schema.properties && value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const [k, sub] of Object.entries(schema.properties)) {
      if (k in obj) errs.push(...validateAgainstSchema(obj[k], sub, `${path}.${k}`));
    }
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(obj)) {
        if (!(k in schema.properties)) errs.push(`${path}.${k} — unknown property (additionalProperties=false)`);
      }
    }
  }
  return errs;
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
  const errs = validateAgainstSchema(parsed, schema);
  if (errs.length) {
    throw new Error(
      `SAMPLE_CONFIG_TEMPLATE has drifted from ${sp}:\n  - ${errs.join("\n  - ")}\n` +
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
    for (const cat of ["legacy", "hydration", "jsonLd", "robots"] as const) {
      const p = plan.categories[cat];
      categoriesSummary[cat] = {
        status: p.status,
        rawFailures: p.rawFailures,
        matched: p.matched,
        emitted: p.emitted,
        skippedByCap: p.skippedByCap,
        filteredOut: p.filteredOut,
        topSkippedReasons: [
          ...p.topSkipped.map((s) => ({ reason: s.reason, summary: s.summary })),
          ...p.topFiltered.map((s) => ({ reason: s.reason, summary: s.summary })),
        ],
      };
    }
    writeFileSync(
      resolve(REPORT_DIR, "annotation-plan-summary.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          filter,
          caps,
          totals: {
            planned: annotations.length,
            emitted: dryRun ? 0 : annotations.length,
            wouldEmit: annotations.length,
            skipped: plan.totalSkipped,
            skippedByCap: skipped.legacy + skipped.hydration + skipped.robots + skipped.jsonLd,
            rawFailures: totals.legacy + totals.hydration + totals.robots + totals.jsonLd,
          },
          categories: categoriesSummary,
        },
        null,
        2,
      ),
    );
  }

  // --dry-run=output --plan-format=csv writes annotation-plan.csv alongside JSON.
  if (planFormat === "csv" || (dryRunOutput && planFormat === "csv")) {
    writeFileSync(
      resolve(REPORT_DIR, "annotation-plan.csv"),
      planToCsv(plan, { filterLabel: `locale=${filter.locale ?? "*"},variant=${filter.variant ?? "*"}` }),
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
    for (const cat of ["legacy", "hydration", "jsonLd", "robots"] as const) {
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
    writeFileSync(resolve(REPORT_DIR, "annotation-plan-diff.csv"), planDiffToCsv(planDiff));
    process.stdout.write(
      `::notice title=SEO annotations diff::${planDiff.labels.a} vs ${planDiff.labels.b} — Δemitted=${planDiff.totalEmitted.delta} Δskipped=${planDiff.totalSkipped.delta}\n`,
    );
  }

  // --fail-on-plan-regression[=N|N%] — exit 1 when the compare selection's
  // totalSkipped grows more than the threshold (absolute count, default 0, or
  // a percentage of the base when suffixed with `%`).
  const regressionArg = argVal(argv, "fail-on-plan-regression");
  const regressionFlag = hasFlag(argv, "fail-on-plan-regression") || regressionArg != null;
  if (regressionFlag) {
    if (!planDiff) {
      process.stdout.write(
        `::warning title=SEO annotations plan-regression::--fail-on-plan-regression set but no --compare-locale/--compare-variant provided; skipping.\n`,
      );
    } else {
      const threshold = parseRegressionThreshold(regressionArg);
      const regression = evaluateRegression(planDiff, threshold);
      // Persist per-category regression deltas so validator-summary.ts can
      // surface them in the PR comment even when we exit non-zero here.
      writeFileSync(
        resolve(REPORT_DIR, "annotation-plan-regression.json"),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            labels: planDiff.labels,
            ...regression,
          },
          null,
          2,
        ),
      );
      if (regression.triggered) {
        const tDesc = threshold.kind === "percent" ? `${threshold.value}%` : `${threshold.value}`;
        const pctDesc = Number.isFinite(regression.deltaPercent)
          ? `${regression.deltaPercent.toFixed(1)}%`
          : "∞%";
        process.stdout.write(
          `::error title=SEO annotations plan regression::totalSkipped ${regression.before} → ${regression.after} (Δ+${regression.delta}, ${pctDesc}) exceeds threshold ${tDesc}\n`,
        );
        for (const c of regression.perCategory) {
          if (c.delta === 0 && !c.exceeds) continue;
          const cPct = Number.isFinite(c.deltaPercent) ? `${c.deltaPercent.toFixed(1)}%` : "∞%";
          const level = c.exceeds ? "error" : "notice";
          process.stdout.write(
            `::${level} title=SEO annotations regression (${c.category})::skippedByCap ${c.before} → ${c.after} (Δ${c.delta >= 0 ? "+" : ""}${c.delta}, ${cPct}) threshold ${tDesc}\n`,
          );
        }
        process.exit(1);
      }
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

