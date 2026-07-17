// Unit tests for scripts/gh-annotations.ts annotation-selection logic.
//
// Verifies:
//   - --locale / --variant filtering scopes legacyRedirects correctly
//   - per-category caps (--max-legacy, --max-hydration, --max-robots, --max-jsonld)
//     truncate output and report skipped counts
//   - global --max default is honored when per-category flags are omitted
//   - env-var fallbacks work

import { describe, it, expect } from "vitest";
import { parseConfig, passesFilter, selectAnnotations, evaluateSkippedLimits, validateConfig } from "./gh-annotations";

describe("parseConfig", () => {
  it("honors global --max default across categories", () => {
    const { caps } = parseConfig(["--max=3"], {});
    expect(caps).toEqual({ legacy: 3, hydration: 3, robots: 3, jsonLd: 3 });
  });

  it("per-category flags override --max", () => {
    const { caps } = parseConfig(["--max=3", "--max-legacy=10", "--max-jsonld=1"], {});
    expect(caps).toEqual({ legacy: 10, hydration: 3, robots: 3, jsonLd: 1 });
  });

  it("env vars override defaults but CLI wins", () => {
    const { caps, filter } = parseConfig(["--max-hydration=7"], {
      SEO_ANN_MAX_LEGACY: "4",
      SEO_ANN_MAX_HYDRATION: "99",
      SEO_BASELINE_LOCALE: "fr",
    });
    expect(caps.legacy).toBe(4);
    expect(caps.hydration).toBe(7); // CLI beats env
    expect(filter.locale).toBe("fr");
  });

  it("falls back to default 20 when nothing set", () => {
    const { caps } = parseConfig([], {});
    expect(caps.legacy).toBe(20);
  });

  it("ignores negative / non-numeric values", () => {
    const { caps } = parseConfig(["--max=-1", "--max-legacy=abc"], {});
    expect(caps.legacy).toBe(20);
  });
});

describe("parseConfig with config file", () => {
  it("uses config values when CLI/env are not set", () => {
    const { caps, filter, failOnSkipped } = parseConfig([], {}, {
      caps: { default: 5, legacy: 10 },
      filter: { locale: "en-CA", variant: "blog" },
      failOnSkipped: { legacy: 50, total: 100 },
    });
    expect(caps).toEqual({ legacy: 10, hydration: 5, robots: 5, jsonLd: 5 });
    expect(filter).toEqual({ locale: "en-CA", variant: "blog" });
    expect(failOnSkipped.legacy).toBe(50);
    expect(failOnSkipped.total).toBe(100);
  });

  it("CLI overrides config, env overrides config, config overrides default", () => {
    const { caps, filter } = parseConfig(
      ["--max-legacy=99"],
      { SEO_ANN_MAX_HYDRATION: "7", SEO_BASELINE_VARIANT: "envvariant" },
      { caps: { legacy: 10, hydration: 10, robots: 8 }, filter: { locale: "fr", variant: "cfg" } },
    );
    expect(caps.legacy).toBe(99); // CLI
    expect(caps.hydration).toBe(7); // env
    expect(caps.robots).toBe(8); // config
    expect(caps.jsonLd).toBe(20); // built-in default
    expect(filter.locale).toBe("fr"); // config (no CLI/env)
    expect(filter.variant).toBe("envvariant"); // env beats config
  });

  it("--fail-on-skipped flag toggles enforcement", () => {
    expect(parseConfig([], {}).failOnSkippedEnabled).toBe(false);
    expect(parseConfig(["--fail-on-skipped"], {}).failOnSkippedEnabled).toBe(true);
    expect(parseConfig([], { SEO_ANN_FAIL_ON_SKIPPED: "1" }).failOnSkippedEnabled).toBe(true);
  });
});

describe("evaluateSkippedLimits", () => {
  it("returns empty when no limits set", () => {
    expect(evaluateSkippedLimits({ legacy: 5, hydration: 5, robots: 5, jsonLd: 5 }, {})).toEqual([]);
  });

  it("flags per-category violations", () => {
    const v = evaluateSkippedLimits(
      { legacy: 30, hydration: 2, robots: 0, jsonLd: 0 },
      { legacy: 10, hydration: 5 },
    );
    expect(v).toEqual([{ category: "legacy", skipped: 30, limit: 10 }]);
  });

  it("flags total violations independently", () => {
    const v = evaluateSkippedLimits(
      { legacy: 10, hydration: 10, robots: 10, jsonLd: 10 },
      { total: 20 },
    );
    expect(v).toEqual([{ category: "total", skipped: 40, limit: 20 }]);
  });

  it("does not flag equal-to-limit counts", () => {
    expect(evaluateSkippedLimits({ legacy: 5, hydration: 0, robots: 0, jsonLd: 0 }, { legacy: 5 })).toEqual([]);
  });
});

describe("passesFilter", () => {
  it("passes everything when filter is empty", () => {
    expect(passesFilter("/burnaby-snow-removal/", {})).toBe(true);
  });

  it("filters by locale prefix", () => {
    expect(passesFilter("/fr/burnaby-snow-removal/", { locale: "fr" })).toBe(true);
    expect(passesFilter("/burnaby-snow-removal/", { locale: "fr" })).toBe(false);
  });

  it("filters by page variant", () => {
    const blog = "/blog/lynn-valley-snow-removal/";
    expect(passesFilter(blog, { variant: "neighborhood-blog" })).toBe(true);
    expect(passesFilter(blog, { variant: "commercial-blog" })).toBe(false);
  });
});

describe("selectAnnotations caps + skipped counts", () => {
  const legacy = {
    checks: [
      { source: "/a", expected: "/a/", ok: false, reason: "200" },
      { source: "/b", expected: "/b/", ok: false, reason: "200" },
      { source: "/c", expected: "/c/", ok: false, reason: "200" },
      { source: "/d", expected: "/d/", ok: true },
    ],
  };
  const hydration = {
    results: [
      { url: "https://plowwow.com/x", issues: ["missing og:image", "missing og:title"] },
      { url: "https://plowwow.com/y", issues: ["missing twitter:card"] },
    ],
  };
  const jsonld = {
    findings: [
      { path: "/x/", message: "invalid FAQ" },
      { path: "/y/", message: "missing @context" },
    ],
  };
  const robots = { failures: ["Bad Disallow", "Bad Allow", "Bad Sitemap"] };

  it("caps each category independently and reports skipped counts", () => {
    const { annotations, skipped, totals } = selectAnnotations({
      legacy, hydration, jsonld, robots,
      caps: { legacy: 2, hydration: 1, robots: 1, jsonLd: 1 },
      filter: {},
    });
    // Emitted = sum of caps (bounded by totals)
    expect(annotations.length).toBe(2 + 1 + 1 + 1);
    expect(totals).toEqual({ legacy: 3, hydration: 3, robots: 3, jsonLd: 2 });
    expect(skipped).toEqual({ legacy: 1, hydration: 2, robots: 2, jsonLd: 1 });
  });

  it("skipped is zero when caps exceed totals", () => {
    const { skipped } = selectAnnotations({
      legacy, hydration, jsonld, robots,
      caps: { legacy: 100, hydration: 100, robots: 100, jsonLd: 100 },
      filter: {},
    });
    expect(skipped).toEqual({ legacy: 0, hydration: 0, robots: 0, jsonLd: 0 });
  });

  it("filter narrows legacy failures before capping", () => {
    const legacyLocalized = {
      checks: [
        { source: "/fr/a", expected: "/fr/a/", ok: false, reason: "200" },
        { source: "/fr/b", expected: "/fr/b/", ok: false, reason: "200" },
        { source: "/a", expected: "/a/", ok: false, reason: "200" },
      ],
    };
    const { annotations, totals, skipped } = selectAnnotations({
      legacy: legacyLocalized, caps: { legacy: 10, hydration: 10, robots: 10, jsonLd: 10 },
      filter: { locale: "fr" },
    });
    expect(totals.legacy).toBe(2); // only the two /fr/… entries
    expect(annotations.filter((a) => a.title.startsWith("Legacy")).length).toBe(2);
    expect(skipped.legacy).toBe(0);
  });

  it("handles empty input gracefully", () => {
    const { annotations, skipped, totals } = selectAnnotations({
      caps: { legacy: 10, hydration: 10, robots: 10, jsonLd: 10 },
      filter: {},
    });
    expect(annotations).toEqual([]);
    expect(totals).toEqual({ legacy: 0, hydration: 0, robots: 0, jsonLd: 0 });
    expect(skipped).toEqual({ legacy: 0, hydration: 0, robots: 0, jsonLd: 0 });
  });
});

describe("validateConfig", () => {
  it("accepts a valid config", () => {
    expect(() => validateConfig({ caps: { default: 20, legacy: 5 }, filter: { locale: "en-CA" } })).not.toThrow();
  });

  it("accepts an empty/undefined config", () => {
    expect(validateConfig(undefined)).toEqual({});
    expect(validateConfig({})).toEqual({});
  });

  it("rejects non-object root", () => {
    expect(() => validateConfig([1, 2, 3])).toThrow(/expected JSON object/);
    expect(() => validateConfig("nope")).toThrow(/expected JSON object/);
  });

  it("rejects negative or non-integer caps with a friendly message", () => {
    expect(() => validateConfig({ caps: { legacy: -1 } })).toThrow(/\$\.caps\.legacy.*non-negative integer.*example:/s);
    expect(() => validateConfig({ caps: { hydration: 1.5 } })).toThrow(/\$\.caps\.hydration.*non-negative integer/);
    expect(() => validateConfig({ caps: { jsonLd: "20" } })).toThrow(/\$\.caps\.jsonLd.*non-negative integer/);
  });

  it("rejects unknown caps keys", () => {
    expect(() => validateConfig({ caps: { bogus: 5 } })).toThrow(/\$\.caps\.bogus.*unknown key/);
  });

  it("rejects empty filter strings and unknown filter keys", () => {
    expect(() => validateConfig({ filter: { locale: "" } })).toThrow(/\$\.filter\.locale.*non-empty string/);
    expect(() => validateConfig({ filter: { region: "us" } })).toThrow(/\$\.filter\.region.*unknown key/);
  });

  it("rejects invalid failOnSkipped values", () => {
    expect(() => validateConfig({ failOnSkipped: { total: -3 } })).toThrow(/\$\.failOnSkipped\.total/);
    expect(() => validateConfig({ failOnSkipped: { weird: 5 } })).toThrow(/\$\.failOnSkipped\.weird.*unknown key/);
  });

  it("aggregates multiple errors in one message", () => {
    try {
      validateConfig({ caps: { legacy: -1, jsonLd: "x" }, filter: { locale: "" } });
      expect.fail("expected validateConfig to throw");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/caps\.legacy/);
      expect(msg).toMatch(/caps\.jsonLd/);
      expect(msg).toMatch(/filter\.locale/);
    }
  });

  it("includes JSON path, expected type, and example snippet in error", () => {
    try {
      validateConfig({ caps: { legacy: -1 } });
      expect.fail("expected throw");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/\$\.caps\.legacy/);
      expect(msg).toMatch(/non-negative integer/);
      expect(msg).toMatch(/example:.*"caps".*"legacy":\s*20/);
    }
  });
});

describe("selectAnnotations plan output", () => {
  const caps = { legacy: 2, hydration: 2, robots: 2, jsonLd: 2 };
  const filter = {};

  it("returns per-category plan with rawFailures/matched/emitted/status", () => {
    const { plan } = selectAnnotations({
      legacy: { checks: [
        { source: "/a", expected: "/a/", ok: false, reason: "200" },
        { source: "/b", expected: "/b/", ok: false, reason: "200" },
        { source: "/c", expected: "/c/", ok: false, reason: "200" },
      ] },
      caps, filter,
    });
    expect(plan.categories.legacy.rawFailures).toBe(3);
    expect(plan.categories.legacy.matched).toBe(3);
    expect(plan.categories.legacy.emitted).toBe(2);
    expect(plan.categories.legacy.skippedByCap).toBe(1);
    expect(plan.categories.legacy.status).toBe("cap-reached");
    expect(plan.categories.legacy.topSkipped[0].reason).toBe("cap");
    expect(plan.categories.legacy.topSkipped[0].summary).toContain("/c");
  });

  it("marks status=no-matching-failures when nothing failed", () => {
    const { plan } = selectAnnotations({ caps, filter });
    expect(plan.categories.legacy.status).toBe("no-matching-failures");
    expect(plan.categories.hydration.status).toBe("no-matching-failures");
  });

  it("marks status=filter-mismatch when filter drops all matches", () => {
    const { plan } = selectAnnotations({
      legacy: { checks: [{ source: "/x", expected: "/y", ok: false, reason: "z" }] },
      caps, filter: { locale: "fr-CA" },
    });
    expect(plan.categories.legacy.rawFailures).toBe(1);
    expect(plan.categories.legacy.matched).toBe(0);
    expect(plan.categories.legacy.filteredOut).toBe(1);
    expect(plan.categories.legacy.status).toBe("filter-mismatch");
    expect(plan.categories.legacy.topFiltered[0].reason).toBe("filter");
  });

  it("totalEmitted/totalSkipped roll up across categories", () => {
    const { plan } = selectAnnotations({
      legacy: { checks: [{ source: "/a", expected: "/a/", ok: false }] },
      hydration: { results: [{ url: "http://x/1", issues: ["i1", "i2", "i3"] }] },
      caps: { legacy: 5, hydration: 2, robots: 5, jsonLd: 5 },
      filter,
    });
    expect(plan.totalEmitted).toBe(1 + 2);
    expect(plan.totalSkipped).toBe(1);
  });
});



import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as pathResolve } from "node:path";
import {
  planToCsv,
  planDiffToCsv,
  diffPlans,
  selectAnnotations as _sa,
  writeSampleConfig,
  SAMPLE_CONFIG_TEMPLATE,
  validateSampleConfigTemplate,
  stripJsonComments,
  validateAgainstSchema,
  parseRegressionThreshold,
  evaluateRegression,
} from "./gh-annotations";

const CAPS = { legacy: 5, hydration: 5, robots: 5, jsonLd: 5 };
const legacyDoc = {
  checks: [
    { source: "/a", expected: "/a/", ok: false, reason: "200" },
    { source: "/b", expected: "/b/", ok: false, reason: "200" },
  ],
};

describe("planToCsv", () => {
  it("emits header + one row per category with correct fields", () => {
    const { plan } = selectAnnotations({ legacy: legacyDoc, caps: CAPS, filter: {} });
    const csv = planToCsv(plan);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("category,rawFailures,matched,emitted,skippedByCap,filteredOut,status,topSkipped,topFiltered");
    expect(lines.length).toBe(5); // header + 4 categories
    const legacyRow = lines.find((l) => l.startsWith("legacy,"))!;
    expect(legacyRow).toContain(",2,2,2,0,0,ok,");
  });

  it("prepends filterLabel comment when supplied", () => {
    const { plan } = selectAnnotations({ caps: CAPS, filter: {} });
    const csv = planToCsv(plan, { filterLabel: "locale=fr,variant=blog" });
    expect(csv.startsWith("# filter: locale=fr,variant=blog\n")).toBe(true);
  });

  it("CSV-escapes summaries containing commas or quotes", () => {
    const plan = selectAnnotations({
      legacy: { checks: [{ source: "/x,y", expected: "/x,y/", ok: false, reason: 'said "hi"' }] },
      caps: { legacy: 0, hydration: 0, robots: 0, jsonLd: 0 }, filter: {},
    }).plan;
    const csv = planToCsv(plan);
    expect(csv).toMatch(/"\/x,y → \/x,y\/"/);
  });
});

describe("planDiffToCsv", () => {
  it("emits header + 4 category rows + totalEmitted + totalSkipped rows", () => {
    const a = selectAnnotations({ legacy: legacyDoc, caps: CAPS, filter: {} }).plan;
    const b = selectAnnotations({ legacy: legacyDoc, caps: CAPS, filter: { locale: "fr" } }).plan;
    const diff = diffPlans(a, b, { a: "en", b: "fr" });
    const csv = planDiffToCsv(diff);
    expect(csv.startsWith("# A: en\n# B: fr\n")).toBe(true);
    const lines = csv.trim().split("\n").filter((l) => !l.startsWith("#"));
    expect(lines[0]).toContain("category,emitted_a,emitted_b,emitted_delta");
    expect(lines.length).toBe(1 + 4 + 2);
    expect(lines.some((l) => l.startsWith("__totalEmitted__,"))).toBe(true);
    expect(lines.some((l) => l.startsWith("__totalSkipped__,"))).toBe(true);
    const legacyRow = lines.find((l) => l.startsWith("legacy,"))!;
    // A had 2 emitted, B filtered all out → delta -2
    expect(legacyRow).toContain("2,0,-2");
  });
});

describe("writeSampleConfig", () => {
  it("writes a documented template that parses as JSONC-like content", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-ann-"));
    const dest = writeSampleConfig(join(dir, "sample.json"));
    const text = readFileSync(dest, "utf8");
    expect(text).toBe(SAMPLE_CONFIG_TEMPLATE);
    expect(text).toMatch(/"caps"/);
    expect(text).toMatch(/"filter"/);
    expect(text).toMatch(/"failOnSkipped"/);
    expect(text).toMatch(/\$schema/);
    // Contains explanatory comments (not strict JSON — documented template).
    expect(text).toMatch(/\/\//);
  });
});

// End-to-end CLI: spawn the script against a temp cwd with seeded inputs and
// verify the plan JSON/CSV and diff JSON/MD/CSV artifacts are written correctly.
describe("gh-annotations CLI (end-to-end)", () => {
  const SCRIPT = pathResolve(__dirname, "gh-annotations.ts");

  function runCli(args: string[], cwd: string) {
    return spawnSync("bunx", ["tsx", SCRIPT, ...args], {
      cwd,
      env: { ...process.env, SEO_ANN_CONFIG: "" },
      encoding: "utf8",
    });
  }

  function seed(cwd: string) {
    const reportDir = join(cwd, "seo-report");
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(join(reportDir, "legacy-redirects.json"), JSON.stringify({
      checks: [
        { source: "/en-CA/blog/x", expected: "/en-CA/blog/x/", ok: false, reason: "200" },
        { source: "/fr/blog/y", expected: "/fr/blog/y/", ok: false, reason: "200" },
        { source: "/a", expected: "/a/", ok: true },
      ],
    }));
  }

  it("--dry-run=output writes annotation-plan.json without emitting ::error lines", () => {
    const cwd = mkdtempSync(join(tmpdir(), "gh-ann-cli-"));
    seed(cwd);
    const r = runCli(["--dry-run=output", "--max=10"], cwd);
    expect(r.status).toBe(0);
    // Dry-run must NOT emit ::error workflow commands.
    expect(r.stdout).not.toMatch(/^::error /m);
    const planPath = join(cwd, "seo-report", "annotation-plan.json");
    expect(existsSync(planPath)).toBe(true);
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    expect(plan.dryRun).toBe(true);
    expect(plan.dryRunMode).toBe("output");
    expect(plan.categories.legacy.rawFailures).toBe(2);
    expect(plan.totalEmitted).toBe(0);
    expect(plan.totalWouldEmit).toBe(2);
  }, 30_000);

  it("--plan-format=csv writes annotation-plan.csv with the header row", () => {
    const cwd = mkdtempSync(join(tmpdir(), "gh-ann-cli-"));
    seed(cwd);
    const r = runCli(["--dry-run=output", "--plan-format=csv"], cwd);
    expect(r.status).toBe(0);
    const csvPath = join(cwd, "seo-report", "annotation-plan.csv");
    expect(existsSync(csvPath)).toBe(true);
    const csv = readFileSync(csvPath, "utf8");
    expect(csv).toMatch(/^# filter:/m);
    expect(csv).toMatch(/^category,rawFailures,matched,emitted,skippedByCap/m);
    expect(csv).toMatch(/^legacy,/m);
  }, 30_000);

  it("--compare-locale writes plan-diff .json/.md/.csv artifacts", () => {
    const cwd = mkdtempSync(join(tmpdir(), "gh-ann-cli-"));
    seed(cwd);
    const r = runCli(
      ["--dry-run=output", "--locale=en-CA", "--variant=blog", "--compare-locale=fr"],
      cwd,
    );
    expect(r.status).toBe(0);
    const jsonPath = join(cwd, "seo-report", "annotation-plan-diff.json");
    const mdPath = join(cwd, "seo-report", "annotation-plan-diff.md");
    const csvPath = join(cwd, "seo-report", "annotation-plan-diff.csv");
    expect(existsSync(jsonPath)).toBe(true);
    expect(existsSync(mdPath)).toBe(true);
    expect(existsSync(csvPath)).toBe(true);
    const md = readFileSync(mdPath, "utf8");
    expect(md).toMatch(/# Annotation plan diff/);
    expect(md).toMatch(/locale=en-CA/);
    expect(md).toMatch(/locale=fr/);
    const csv = readFileSync(csvPath, "utf8");
    expect(csv).toMatch(/^# A: locale=en-CA/m);
    expect(csv).toMatch(/^# B: locale=fr/m);
    expect(csv).toMatch(/^category,emitted_a,emitted_b,emitted_delta/m);
    expect(csv).toMatch(/^__totalSkipped__,/m);
  }, 30_000);

  it("--fail-on-plan-regression=0 exits 1 when totalSkipped grows", () => {
    const cwd = mkdtempSync(join(tmpdir(), "gh-ann-cli-"));
    // Seed with enough failures that a tight cap causes cap-skips in A but the
    // compare selection filters everything out (so B has 0 skipped-by-cap).
    // Using low cap + filter=en-CA vs compare=fr where fr has no failures →
    // A has cap-skips, B has none → delta is negative → no regression.
    // To force a regression, invert: A filter with no failures (0 skipped),
    // compare with matches over the cap (>0 skipped).
    mkdirSync(join(cwd, "seo-report"), { recursive: true });
    // fr-locale paths with page-variant "other". A=en-CA drops all → 0 skipped;
    // B=fr keeps all → 3 matched, cap=1 → 2 cap-skipped. Δskipped=+2 > 0.
    writeFileSync(join(cwd, "seo-report", "legacy-redirects.json"), JSON.stringify({
      checks: [
        { source: "/fr/xa", expected: "/fr/xa/", ok: false, reason: "200" },
        { source: "/fr/xb", expected: "/fr/xb/", ok: false, reason: "200" },
        { source: "/fr/xc", expected: "/fr/xc/", ok: false, reason: "200" },
      ],
    }));
    const r = runCli(
      [
        "--dry-run=output",
        "--locale=en-CA",
        "--compare-locale=fr",
        "--max-legacy=1",
        "--fail-on-plan-regression=0",
      ],
      cwd,
    );
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/plan regression/i);
  }, 30_000);

  it("--write-sample-config writes template and exits 0", () => {
    const cwd = mkdtempSync(join(tmpdir(), "gh-ann-cli-"));
    const dest = join(cwd, "cfg.json");
    const r = runCli([`--write-sample-config=${dest}`], cwd);
    expect(r.status).toBe(0);
    expect(existsSync(dest)).toBe(true);
    const text = readFileSync(dest, "utf8");
    expect(text).toMatch(/"caps"/);
    expect(text).toMatch(/"failOnSkipped"/);
  }, 30_000);
});
