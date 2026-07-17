// Configurable failure thresholds for SEO validators.
//
// Category → { max, severity }. When failures ≤ max, the category is a "warn"
// (logged but not fatal). Above max, it fails the build only if severity is
// "critical". Load order: env `SEO_THRESHOLDS_FILE` → `seo-report/thresholds.json`
// → repo default at `seo-thresholds.json` → hard-coded defaults.

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

export function loadThresholds(): Thresholds {
  const candidates = [
    process.env.SEO_THRESHOLDS_FILE,
    resolve("seo-report/thresholds.json"),
    resolve("seo-thresholds.json"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<Thresholds>;
        return { ...DEFAULT_THRESHOLDS, ...raw };
      } catch { /* fall through */ }
    }
  }
  return { ...DEFAULT_THRESHOLDS };
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
