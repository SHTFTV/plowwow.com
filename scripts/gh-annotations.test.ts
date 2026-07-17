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
});

