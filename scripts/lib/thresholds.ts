// Configurable failure thresholds for SEO validators.
//
// Category → { max, severity }. When failures ≤ max, the category is a "warn"
// (logged but not fatal). Above max, it fails the build only if severity is
// "critical". Load order: env `SEO_THRESHOLDS_FILE` → `seo-report/thresholds.json`
// → repo default at `seo-thresholds.json` → hard-coded defaults.
//
// Every load runs through a strict schema validator: any invalid file, missing
// per-category `max`/`severity`, or malformed env override throws with a clear
// error message so misconfiguration fails fast instead of silently coercing.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type Severity = "critical" | "warn";
export type Threshold = { max: number; severity: Severity };
export type Thresholds = Record<string, Threshold>;

export const DEFAULT_THRESHOLDS: Thresholds = {
  legacyRedirects: { max: 0, severity: "critical" },
  jsonLd: { max: 0, severity: "critical" },
  robots: { max: 0, severity: "critical" },
  hydration: { max: 2, severity: "warn" },
  ogTwitter: { max: 3, severity: "warn" },
  ogImage: { max: 2, severity: "warn" },
  htmlLang: { max: 0, severity: "critical" },
  sitemap: { max: 0, severity: "critical" },
  validation: { max: 5, severity: "warn" },
};

export class ThresholdConfigError extends Error {
  constructor(msg: string, public source: string) {
    super(`[thresholds:${source}] ${msg}`);
    this.name = "ThresholdConfigError";
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Strict schema: every entry must be `{ max: int>=0, severity: "critical"|"warn" }`. */
export function validateThresholds(raw: unknown, source: string): Thresholds {
  if (!isPlainObject(raw)) {
    throw new ThresholdConfigError(
      `expected top-level JSON object mapping category → { max, severity }, got ${Array.isArray(raw) ? "array" : typeof raw}`,
      source,
    );
  }
  const out: Thresholds = {};
  for (const [cat, val] of Object.entries(raw)) {
    if (!isPlainObject(val)) {
      throw new ThresholdConfigError(
        `category "${cat}" must be an object with { max, severity }, got ${typeof val}`,
        source,
      );
    }
    const { max, severity, ...extra } = val as Record<string, unknown>;
    if (Object.keys(extra).length) {
      throw new ThresholdConfigError(
        `category "${cat}" has unknown keys: ${Object.keys(extra).join(", ")} (only "max" and "severity" are allowed)`,
        source,
      );
    }
    if (typeof max !== "number" || !Number.isInteger(max) || max < 0) {
      throw new ThresholdConfigError(
        `category "${cat}".max must be a non-negative integer, got ${JSON.stringify(max)}`,
        source,
      );
    }
    if (severity !== "critical" && severity !== "warn") {
      throw new ThresholdConfigError(
        `category "${cat}".severity must be "critical" or "warn", got ${JSON.stringify(severity)}`,
        source,
      );
    }
    out[cat] = { max, severity };
  }
  return out;
}

/**
 * Env overrides: `SEO_THRESHOLD_<CATEGORY>` = `<max>:<severity>`
 *   e.g. SEO_THRESHOLD_HYDRATION="5:warn"
 * Invalid overrides throw immediately.
 */
function applyEnvOverrides(base: Thresholds): Thresholds {
  const merged: Thresholds = { ...base };
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith("SEO_THRESHOLD_") || v == null) continue;
    const catKey = k.slice("SEO_THRESHOLD_".length);
    // Map ENV_CASE → camelCase category id present in defaults.
    const category = Object.keys(DEFAULT_THRESHOLDS).find(
      (c) => c.toLowerCase() === catKey.toLowerCase().replace(/_/g, ""),
    ) ?? catKey;
    const m = /^\s*(\d+)\s*:\s*(critical|warn)\s*$/i.exec(v);
    if (!m) {
      throw new ThresholdConfigError(
        `env override ${k}="${v}" must match "<max>:<critical|warn>" (e.g. "5:warn")`,
        `env:${k}`,
      );
    }
    merged[category] = { max: Number(m[1]), severity: m[2].toLowerCase() as Severity };
  }
  // Re-validate the merged result to catch anything weird.
  return validateThresholds(merged, "env-merged");
}

export function loadThresholds(): Thresholds {
  const candidates = [
    process.env.SEO_THRESHOLDS_FILE,
    resolve("seo-report/thresholds.json"),
    resolve("seo-thresholds.json"),
  ].filter(Boolean) as string[];

  let base: Thresholds = { ...DEFAULT_THRESHOLDS };
  let loadedFrom = "defaults";
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(p, "utf8"));
    } catch (err) {
      throw new ThresholdConfigError(`invalid JSON: ${(err as Error).message}`, p);
    }
    const validated = validateThresholds(parsed, p);
    base = { ...DEFAULT_THRESHOLDS, ...validated };
    loadedFrom = p;
    break;
  }
  const final = applyEnvOverrides(base);
  if (process.env.SEO_THRESHOLDS_DEBUG) {
    console.log(`  thresholds: loaded from ${loadedFrom}`);
  }
  return final;
}

export type CategoryOutcome = {
  category: string;
  failures: number;
  threshold: Threshold;
  status: "pass" | "warn" | "fail";
};

export function evaluate(category: string, failures: number, t: Thresholds): CategoryOutcome {
  const threshold = t[category] ?? { max: 0, severity: "critical" as const };
  let status: "pass" | "warn" | "fail" = "pass";
  if (failures > threshold.max) status = threshold.severity === "critical" ? "fail" : "warn";
  return { category, failures, threshold, status };
}

// CLI: `bun scripts/lib/thresholds.ts validate` — verify current config, exit 1 on error.
if (import.meta.main) {
  try {
    const t = loadThresholds();
    console.log(`✓ thresholds valid (${Object.keys(t).length} categories)`);
    console.log(JSON.stringify(t, null, 2));
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }
}
