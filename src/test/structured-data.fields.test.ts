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

import { getValidators, formatErrors } from "../../scripts/lib/structured-data-schema";
import { normalizeJson } from "../../scripts/lib/normalize";

const { localBusiness: validateLB, faqPage: validateFAQ, structuredData: validateSD } = getValidators();

function validateLocalBusiness(lb: unknown, ctx: string) {
  const normalized = normalizeJson(lb as any);
  const ok = validateLB(normalized);
  expect(ok, `${ctx}: LocalBusiness schema — ${formatErrors(validateLB)}`).toBe(true);
}

function validateFaqPage(faq: unknown, ctx: string) {
  const normalized = normalizeJson(faq as any);
  const ok = validateFAQ(normalized);
  expect(ok, `${ctx}: FAQPage schema — ${formatErrors(validateFAQ)}`).toBe(true);
  // Extra structural rule the AJV schema can't express: FAQ answers' embedded
  // URLs must parse. Cheaper here than a per-item schema keyword.
  for (const [i, e] of (normalized as any).entries.entries()) {
    for (const m of String(e.a).matchAll(/https?:\/\/\S+/g)) {
      expect(() => new URL(m[0].replace(/[.,;:)]+$/, "")), `${ctx}: FAQ[${i}].a bad URL "${m[0]}"`).not.toThrow();
    }
  }
}

describe("structured data: city LocalBusiness + FAQPage schemas (AJV)", () => {
  for (const city of cities) {
    it(`/${city.slug} — schema-valid LocalBusiness + FAQPage`, () => {
      const url = `${BASE_URL}/${city.slug}`;
      const payload = {
        localBusiness: {
          name: `PlowWow Snow Removal — ${city.name}`,
          url,
          image: city.ogImage,
          telephone: "+1-604-761-1518",
          areaServed: `${city.name}, ${city.province}`,
          priceRange: "$$",
        },
        faqPage: {
          questionCount: city.faqs.length,
          entries: city.faqs.map((f) => ({ q: f.q, a: f.a })),
        },
      };
      const normalized = normalizeJson(payload);
      const ok = validateSD(normalized);
      expect(ok, `/${city.slug}: StructuredData schema — ${formatErrors(validateSD)}`).toBe(true);
      validateLocalBusiness(payload.localBusiness, `/${city.slug}`);
      validateFaqPage(payload.faqPage, `/${city.slug}`);
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
  const dirs = hasSnapshots
    ? readdirSync(SNAP_DIR).filter((n) => statSync(resolve(SNAP_DIR, n)).isDirectory())
    : [];
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
