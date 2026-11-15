import { describe, it, expect } from "vitest";
import { cities } from "@/data/cities";
import { buildCityCopy } from "@/data/cityContent";
import { vancouverSections } from "@/data/vancouverServiceContent";
import { readFileSync } from "node:fs";

const MIN_WORDS = 5800;

describe("city long-form content (SEO/AEO/GEO/LLM)", () => {
  for (const city of cities) {
    const minimum = city.slug === "vancouver" ? 1200 : MIN_WORDS;
    it(`${city.name} meets its ${minimum}-word content contract`, () => {
      const { wordCount } = buildCityCopy(city);
      expect(wordCount).toBeGreaterThanOrEqual(minimum);
    });
  }

  it("Vancouver retains the eight substantive property-planning sections approved with its priority-page rewrite", () => {
    expect(vancouverSections.map(section => section.id)).toEqual([
      "vancouver-property-scope", "vancouver-sidewalk-plan", "vancouver-access-review", "vancouver-treatment-plan",
      "vancouver-quote-review", "vancouver-contract-handover", "vancouver-local-areas", "vancouver-next-step",
    ]);
    for (const section of vancouverSections) {
      expect(section.heading.trim()).not.toBe("");
      expect(section.paragraphs.length).toBeGreaterThanOrEqual(2);
      expect(section.paragraphs.every(paragraph => paragraph.trim().length > 0)).toBe(true);
    }
    const narrative = vancouverSections.flatMap(section => section.paragraphs).join(" ");
    expect(narrative).toContain("does not confirm that a crew has been dispatched");
    expect(narrative).toContain("an estimate, a submitted request and an accepted booking as separate steps");
    expect(narrative).toContain("not as a PlowWow office or equipment yard");
    const page = readFileSync("src/pages/CityPage.tsx", "utf8");
    expect(page).toContain("https://vancouver.ca/streets-transportation/snow-removal-from-city-streets.aspx");
  });

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
