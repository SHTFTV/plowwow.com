import { describe, it, expect } from "vitest";
import { cities } from "@/data/cities";
import { truncateForMeta } from "@/lib/seo";

const MAX = 155;
const MIN = 70;

describe("truncateForMeta", () => {
  it("returns short input unchanged", () => {
    expect(truncateForMeta("Short text.")).toBe("Short text.");
  });

  it("never exceeds the max length", () => {
    const long = "a ".repeat(200).trim(); // 399 chars
    expect(truncateForMeta(long).length).toBeLessThanOrEqual(MAX);
  });

  it("ends with an ellipsis when truncated", () => {
    const long = "word ".repeat(60).trim();
    expect(truncateForMeta(long).endsWith("…")).toBe(true);
  });

  it("does not cut mid-word", () => {
    const long =
      "Vancouver snow removal covers Downtown, Kitsilano, Mount Pleasant, " +
      "East Vancouver, UBC and Point Grey. Priority dispatch for strata, " +
      "retail and residential properties 24/7.";
    const out = truncateForMeta(long);
    // The text just before the ellipsis must be a complete word: the character
    // immediately preceding "…" must be a letter/number, and the next char in
    // the source after that word must be a non-word boundary (space/punct).
    const body = out.slice(0, -1);
    expect(/[\p{L}\p{N})\]"']$/u.test(body)).toBe(true);
    const idx = long.indexOf(body);
    expect(idx).toBe(0); // matched from the start
    const nextChar = long.charAt(body.length);
    expect(/[\s.,;:!?—\-]/.test(nextChar) || nextChar === "").toBe(true);
  });

  it("strips trailing punctuation before the ellipsis", () => {
    const out = truncateForMeta(
      "Plowing, salting, sanding, scraping, shoveling, deicing, clearing, " +
        "and removing all forms of winter precipitation, every hour, every day.",
    );
    expect(out).not.toMatch(/[,;:.\-—\s]…$/);
  });
});

describe("city meta descriptions", () => {
  it("has cities to test", () => {
    expect(cities.length).toBeGreaterThan(0);
  });

  for (const c of cities) {
    describe(`${c.slug}`, () => {
      const desc = truncateForMeta(c.intro);

      it("is at most 155 characters", () => {
        expect(desc.length).toBeLessThanOrEqual(MAX);
      });

      it("is long enough to be useful (>= 70 chars)", () => {
        expect(desc.length).toBeGreaterThanOrEqual(MIN);
      });

      it("does not end mid-word", () => {
        if (!desc.endsWith("…")) return; // not truncated
        const body = desc.slice(0, -1);
        // last char of the body must be a word/closing char, not whitespace/punct
        expect(/[\p{L}\p{N})\]"']$/u.test(body)).toBe(true);
        // and the next char in the original intro must be a separator
        const nextChar = c.intro.charAt(body.length);
        expect(/[\s.,;:!?—\-]/.test(nextChar) || nextChar === "").toBe(true);
      });

      it("does not have orphan punctuation before the ellipsis", () => {
        expect(desc).not.toMatch(/[,;:.\-—\s]…$/);
      });

      it("ellipsis is only at the end (if present)", () => {
        const inner = desc.endsWith("…") ? desc.slice(0, -1) : desc;
        expect(inner.includes("…")).toBe(false);
      });
    });
  }
});
