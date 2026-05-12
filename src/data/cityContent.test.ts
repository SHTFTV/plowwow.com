import { describe, it, expect } from "vitest";
import { cities } from "@/data/cities";
import { buildCityCopy } from "@/data/cityContent";

const MIN_WORDS = 5800;

describe("city long-form content (SEO/AEO/GEO/LLM)", () => {
  for (const city of cities) {
    it(`${city.name} renders ≥ ${MIN_WORDS} words`, () => {
      const { wordCount } = buildCityCopy(city);
      expect(wordCount).toBeGreaterThanOrEqual(MIN_WORDS);
    });
  }

  it("every city's narrative is unique", () => {
    const narratives = cities.map((c) => buildCityCopy(c).narrative);
    expect(new Set(narratives).size).toBe(cities.length);
  });

  it("any two cities differ by at least 1500 distinct words", () => {
    const tokens = cities.map((c) =>
      new Set(
        buildCityCopy(c)
          .narrative.toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3),
      ),
    );
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const onlyA = [...tokens[i]].filter((w) => !tokens[j].has(w)).length;
        const onlyB = [...tokens[j]].filter((w) => !tokens[i].has(w)).length;
        expect(
          onlyA + onlyB,
          `${cities[i].name} vs ${cities[j].name}`,
        ).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
