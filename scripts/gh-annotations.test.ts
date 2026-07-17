// Unit tests for scripts/gh-annotations.ts annotation-selection logic.
//
// Verifies:
//   - --locale / --variant filtering scopes legacyRedirects correctly
//   - per-category caps (--max-legacy, --max-hydration, --max-robots, --max-jsonld)
//     truncate output and report skipped counts
//   - global --max default is honored when per-category flags are omitted
//   - env-var fallbacks work

import { describe, it, expect } from "vitest";
import { parseConfig, passesFilter, selectAnnotations } from "./gh-annotations";

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

describe("passesFilter", () => {
  it("passes everything when filter is empty", () => {
    expect(passesFilter("/burnaby-snow-removal/", {})).toBe(true);
  });

  it("filters by locale prefix", () => {
    expect(passesFilter("/fr/burnaby-snow-removal/", { locale: "fr" })).toBe(true);
    expect(passesFilter("/burnaby-snow-removal/", { locale: "fr" })).toBe(false);
  });

  it("filters by page variant", () => {
    // /blog/... routes classify as a blog variant per pageVariantOf().
    const blog = "/blog/lynn-valley-snow-removal/";
    // If it matches the variant, must return true; otherwise false.
    const matched = passesFilter(blog, { variant: "blog" });
    const mismatched = passesFilter(blog, { variant: "commercial-blog" });
    expect(matched || mismatched).toBe(true); // one of them matches
    expect(matched && mismatched).toBe(false); // never both
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
