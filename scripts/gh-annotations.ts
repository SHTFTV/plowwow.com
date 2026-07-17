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
//   --config=<path>           Load defaults from a JSON config file
//                             (default: ./seo-annotations.config.json if present).
//                             CLI > env > config > built-in defaults.
//   --fail-on-skipped         Exit 1 when any per-category or total skipped
//                             count exceeds `failOnSkipped` limits from config
//                             (or SEO_ANN_FAIL_ON_SKIPPED_* env vars).
//
// Env fallbacks: SEO_ANN_MAX_LEGACY / _HYDRATION / _ROBOTS / _JSONLD, plus
// SEO_BASELINE_LOCALE and SEO_BASELINE_VARIANT for the filter (shared with
// the baseline tooling). SEO_ANN_CONFIG overrides the config file path.
// SEO_ANN_FAIL_ON_SKIPPED_{LEGACY,HYDRATION,ROBOTS,JSONLD,TOTAL} set per-run
// caps on skipped failures without editing the config file.

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

/**
 * Validate a parsed config object. Throws an Error with a friendly, actionable
 * message when values are the wrong type or out of range. Exported for tests.
 */
export function validateConfig(raw: unknown, source = "config"): AnnotationsConfig {
  const errs: string[] = [];
  const isObj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  if (raw != null && !isObj(raw)) {
    throw new Error(`[${source}] must be a JSON object, got ${Array.isArray(raw) ? "array" : typeof raw}`);
  }
  const cfg = (raw ?? {}) as Record<string, unknown>;
  const checkNonNegInt = (v: unknown, path: string) => {
    if (v == null) return;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || Math.floor(v) !== v) {
      errs.push(`${path} must be a non-negative integer (got ${JSON.stringify(v)})`);
    }
  };
  if (cfg.caps != null) {
    if (!isObj(cfg.caps)) errs.push(`caps must be an object`);
    else {
      const allowed = new Set(["default", "legacy", "hydration", "robots", "jsonLd"]);
      for (const [k, v] of Object.entries(cfg.caps)) {
        if (!allowed.has(k)) errs.push(`caps.${k} is not a recognized key (allowed: ${[...allowed].join(", ")})`);
        else checkNonNegInt(v, `caps.${k}`);
      }
    }
  }
  if (cfg.filter != null) {
    if (!isObj(cfg.filter)) errs.push(`filter must be an object`);
    else {
      for (const [k, v] of Object.entries(cfg.filter)) {
        if (k !== "locale" && k !== "variant") {
          errs.push(`filter.${k} is not recognized (allowed: locale, variant)`);
        } else if (v != null && (typeof v !== "string" || !v.trim())) {
          errs.push(`filter.${k} must be a non-empty string`);
        }
      }
    }
  }
  if (cfg.failOnSkipped != null) {
    if (!isObj(cfg.failOnSkipped)) errs.push(`failOnSkipped must be an object`);
    else {
      const allowed = new Set(["legacy", "hydration", "robots", "jsonLd", "total"]);
      for (const [k, v] of Object.entries(cfg.failOnSkipped)) {
        if (!allowed.has(k)) errs.push(`failOnSkipped.${k} is not recognized (allowed: ${[...allowed].join(", ")})`);
        else checkNonNegInt(v, `failOnSkipped.${k}`);
      }
    }
  }
  if (errs.length) {
    throw new Error(
      `Invalid ${source}:\n  - ${errs.join("\n  - ")}\n` +
        `See seo-annotations.config.schema.json for the expected shape.`,
    );
  }
  return cfg as AnnotationsConfig;
}

/** Load a JSON config file. Missing file → `{}`. Invalid shape → throws. */
export function loadConfigFile(path?: string): AnnotationsConfig {
  const p = path ?? DEFAULT_CONFIG_PATH;
  if (!existsSync(p)) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    throw new Error(`Failed to parse ${p} as JSON: ${(e as Error).message}`);
  }
  return validateConfig(raw, p);
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

/** Pure annotation-selection function — used by CLI and unit tests. */
export function selectAnnotations(input: {
  legacy?: LegacyDoc | null;
  hydration?: HydrationDoc | null;
  jsonld?: JsonLdDoc | null;
  robots?: RobotsDoc | null;
  caps: Caps;
  filter: Filter;
}): { annotations: Annotation[]; skipped: SkippedCounts; totals: SkippedCounts } {
  const annotations: Annotation[] = [];
  const skipped: SkippedCounts = { legacy: 0, hydration: 0, robots: 0, jsonLd: 0 };
  const totals: SkippedCounts = { legacy: 0, hydration: 0, robots: 0, jsonLd: 0 };

  // Legacy
  const legacyFailing = (input.legacy?.checks ?? []).filter((c) => !c.ok);
  const legacyFiltered = legacyFailing.filter((c) => passesFilter(c.expected || c.source, input.filter));
  totals.legacy = legacyFiltered.length;
  for (const c of legacyFiltered.slice(0, input.caps.legacy)) {
    annotations.push({
      level: "error",
      file: fileForRoute(c.source),
      title: `Legacy redirect failing: ${c.source}`,
      message: `Expected 301 → ${c.expected} but got: ${c.reason ?? "unknown"}`,
    });
  }
  skipped.legacy = Math.max(0, legacyFiltered.length - input.caps.legacy);

  // Hydration
  const hydrationIssues: { url: string; issue: string }[] = [];
  for (const r of input.hydration?.results ?? []) {
    for (const issue of r.issues) hydrationIssues.push({ url: r.url, issue });
  }
  totals.hydration = hydrationIssues.length;
  for (const { url, issue } of hydrationIssues.slice(0, input.caps.hydration)) {
    annotations.push({
      level: "warning",
      file: fileForRoute(url),
      title: `Hydration issue: ${(() => { try { return new URL(url).pathname; } catch { return url; } })()}`,
      message: issue,
    });
  }
  skipped.hydration = Math.max(0, hydrationIssues.length - input.caps.hydration);

  // JSON-LD
  const findings = input.jsonld?.findings ?? [];
  totals.jsonLd = findings.length;
  for (const f of findings.slice(0, input.caps.jsonLd)) {
    annotations.push({
      level: "error",
      file: fileForRoute(f.path ?? f.url ?? "/"),
      title: `JSON-LD: ${f.path ?? f.url ?? "?"}`,
      message: f.message,
    });
  }
  skipped.jsonLd = Math.max(0, findings.length - input.caps.jsonLd);

  // Robots
  const robotsMsgs: string[] = [
    ...(input.robots?.failures ?? []),
    ...(input.robots?.missingSitemaps ?? []).map((s) => `missing Sitemap: ${s}`),
    ...(input.robots?.missingUserAgents ?? []).map((s) => `missing User-agent: ${s}`),
    ...(input.robots?.blockMisses ?? []).flatMap((b) => b.missing.map((m) => `${b.userAgent}: missing "${m}"`)),
  ];
  totals.robots = robotsMsgs.length;
  for (const msg of robotsMsgs.slice(0, input.caps.robots)) {
    annotations.push({
      level: "error",
      file: "public/robots.txt",
      title: `robots.txt directive failing`,
      message: msg,
    });
  }
  skipped.robots = Math.max(0, robotsMsgs.length - input.caps.robots);

  return { annotations, skipped, totals };
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
  const configPath = argVal(argv, "config") ?? process.env.SEO_ANN_CONFIG;
  const config = loadConfigFile(configPath);
  const { caps, filter, failOnSkipped, failOnSkippedEnabled } = parseConfig(argv, process.env, config);
  const legacy = readJson<LegacyDoc>("legacy-redirects.json");
  const hydration = readJson<HydrationDoc>("hydration.json");
  const jsonld = readJson<JsonLdDoc>("jsonld-preflight.json");
  const robots = readJson<RobotsDoc>("robots-directives.json");

  const { annotations, skipped, totals } = selectAnnotations({
    legacy, hydration, jsonld, robots, caps, filter,
  });

  for (const a of annotations) emit(a);

  const violations = evaluateSkippedLimits(skipped, failOnSkipped);

  // Persist skipped/total counts for the PR-comment renderer.
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    resolve(REPORT_DIR, "annotation-skipped.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        caps, filter, totals, skipped,
        emitted: annotations.length,
        failOnSkipped,
        failOnSkippedEnabled,
        violations,
      },
      null,
      2,
    ),
  );

  const filterDesc = filter.locale || filter.variant
    ? ` filter[locale=${filter.locale ?? "*"},variant=${filter.variant ?? "*"}]`
    : "";
  const capsDesc = `caps[legacy=${caps.legacy},hydration=${caps.hydration},robots=${caps.robots},jsonLd=${caps.jsonLd}]`;
  const skippedDesc = `skipped[legacy=${skipped.legacy},hydration=${skipped.hydration},robots=${skipped.robots},jsonLd=${skipped.jsonLd}]`;
  process.stdout.write(
    `::notice title=SEO annotations::${annotations.length} annotation(s) emitted ` +
      `(legacy=${totals.legacy}, hydration=${totals.hydration}, jsonLd=${totals.jsonLd}, robots=${totals.robots}) ` +
      `${capsDesc} ${skippedDesc}${filterDesc}\n`,
  );

  if (failOnSkippedEnabled && violations.length) {
    for (const v of violations) {
      process.stdout.write(
        `::error title=SEO annotations skipped cap exceeded::${v.category} skipped=${v.skipped} > limit=${v.limit}\n`,
      );
    }
    process.exit(1);
  }
}
