// Structured-data field validation for every route that emits LocalBusiness /
// FAQPage JSON-LD. Guards required fields and validates every embedded URL.
//
// Scope: mirrors the snapshot set built by scripts/seo-report.ts — currently
// all /:citySlug city routes. Also validates any structured-data snapshots
// already on disk under seo-report/structured-data-snapshots/*/after.json
// so intentional regenerations stay well-formed.
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { cities } from "@/data/cities";
import { BASE_URL } from "../../scripts/routes";

const REQUIRED_LB = ["name", "url", "image", "telephone", "areaServed", "priceRange"] as const;

function assertValidUrl(u: unknown, ctx: string) {
  expect(typeof u, `${ctx}: url must be string`).toBe("string");
  const s = String(u);
  expect(() => new URL(s), `${ctx}: not parseable as URL — "${s}"`).not.toThrow();
  const parsed = new URL(s);
  expect(["http:", "https:"].includes(parsed.protocol), `${ctx}: bad protocol ${parsed.protocol}`).toBe(true);
  expect(s.startsWith(BASE_URL), `${ctx}: expected plowwow.com absolute URL — got "${s}"`).toBe(true);
}

function validateLocalBusiness(lb: Record<string, unknown>, ctx: string) {
  for (const f of REQUIRED_LB) {
    expect(lb[f], `${ctx}: LocalBusiness.${f} missing`).toBeTruthy();
    expect(String(lb[f]).trim().length, `${ctx}: LocalBusiness.${f} empty`).toBeGreaterThan(0);
  }
  assertValidUrl(lb.url, `${ctx} LocalBusiness.url`);
  assertValidUrl(lb.image, `${ctx} LocalBusiness.image`);
  expect(String(lb.telephone)).toMatch(/^\+?[0-9\-\s().]+$/);
}

function validateFaqPage(faq: any, ctx: string) {
  expect(typeof faq.questionCount, `${ctx}: FAQPage.questionCount must be number`).toBe("number");
  expect(faq.questionCount, `${ctx}: FAQPage.questionCount must be > 0`).toBeGreaterThan(0);
  expect(Array.isArray(faq.entries), `${ctx}: FAQPage.entries must be array`).toBe(true);
  expect(faq.entries.length, `${ctx}: FAQPage.entries length mismatch`).toBe(faq.questionCount);
  faq.entries.forEach((e: any, i: number) => {
    expect(typeof e.q === "string" && e.q.trim().length > 0, `${ctx}: FAQ[${i}].q empty`).toBe(true);
    expect(typeof e.a === "string" && e.a.trim().length > 0, `${ctx}: FAQ[${i}].a empty`).toBe(true);
    // URL-looking substrings inside FAQ answers must be well-formed.
    for (const m of e.a.matchAll(/https?:\/\/\S+/g)) {
      expect(() => new URL(m[0].replace(/[.,;:)]+$/, "")), `${ctx}: FAQ[${i}].a bad URL "${m[0]}"`).not.toThrow();
    }
  });
}

describe("structured data: city LocalBusiness + FAQPage required fields", () => {
  for (const city of cities) {
    it(`/${city.slug} — LocalBusiness + FAQPage fields valid`, () => {
      const url = `${BASE_URL}/${city.slug}`;
      const lb = {
        name: `PlowWow Snow Removal — ${city.name}`,
        url,
        image: city.ogImage,
        telephone: "+1-604-761-1518",
        areaServed: `${city.name}, ${city.province}`,
        priceRange: "$$",
      };
      validateLocalBusiness(lb, `/${city.slug}`);
      validateFaqPage(
        { questionCount: city.faqs.length, entries: city.faqs.map((f) => ({ q: f.q, a: f.a })) },
        `/${city.slug}`,
      );
    });
  }
});

// If a fresh seo-report has been generated locally (or in CI before this
// test runs), also validate the snapshot payloads on disk so a bad
// regeneration is caught before it becomes the new baseline.
const SNAP_DIR = resolve(process.cwd(), "seo-report", "structured-data-snapshots");
const hasSnapshots =
  existsSync(SNAP_DIR) &&
  readdirSync(SNAP_DIR).some((n) => {
    const p = resolve(SNAP_DIR, n);
    return statSync(p).isDirectory() && existsSync(resolve(p, "after.json"));
  });

describe.runIf(hasSnapshots)("structured data: on-disk snapshot payloads", () => {
  const dirs = readdirSync(SNAP_DIR).filter((n) => statSync(resolve(SNAP_DIR, n)).isDirectory());
  for (const d of dirs) {
    const afterPath = resolve(SNAP_DIR, d, "after.json");
    if (!existsSync(afterPath)) continue;
    it(`snapshot ${d}/after.json — valid LocalBusiness + FAQPage payload`, () => {
      const payload = JSON.parse(readFileSync(afterPath, "utf8"));
      if (payload?.localBusiness) validateLocalBusiness(payload.localBusiness, `snapshot ${d}`);
      if (payload?.faqPage) validateFaqPage(payload.faqPage, `snapshot ${d}`);
    });
  }
});
