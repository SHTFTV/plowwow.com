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

const CANONICAL_HOST = new URL(BASE_URL).hostname;

// Cross-validate that every URL embedded in a LocalBusiness payload matches
// the canonical host, and (when we know the expected route slug) that
// `url` resolves to exactly that route. `image` is host-checked only —
// individual og images can live under /og-*.jpg or /blog-images/*.jpg.
function crossValidateLocalBusinessUrls(
  lb: any,
  ctx: string,
  expected?: { url?: string; imageStartsWith?: string },
) {
  const parse = (raw: string, field: string) => {
    let u: URL | null = null;
    try {
      u = new URL(raw);
    } catch {
      expect.fail(`${ctx}: LocalBusiness.${field} not a valid URL: "${raw}"`);
    }
    return u!;
  };
  const urlU = parse(String(lb.url), "url");
  expect(urlU.protocol, `${ctx}: LocalBusiness.url must be https, got "${urlU.protocol}"`).toBe("https:");
  expect(urlU.hostname, `${ctx}: LocalBusiness.url host must be ${CANONICAL_HOST}, got "${urlU.hostname}"`).toBe(CANONICAL_HOST);
  if (expected?.url) {
    expect(lb.url, `${ctx}: LocalBusiness.url must equal "${expected.url}"`).toBe(expected.url);
  }
  const imgU = parse(String(lb.image), "image");
  expect(imgU.protocol, `${ctx}: LocalBusiness.image must be https, got "${imgU.protocol}"`).toBe("https:");
  expect(imgU.hostname, `${ctx}: LocalBusiness.image host must be ${CANONICAL_HOST}, got "${imgU.hostname}"`).toBe(CANONICAL_HOST);
  if (expected?.imageStartsWith) {
    expect(
      String(lb.image).startsWith(expected.imageStartsWith),
      `${ctx}: LocalBusiness.image must start with "${expected.imageStartsWith}", got "${lb.image}"`,
    ).toBe(true);
  }
}

function validateLocalBusiness(
  lb: unknown,
  ctx: string,
  expected?: { url?: string; imageStartsWith?: string },
) {
  const normalized = normalizeJson(lb as any);
  const ok = validateLB(normalized);
  expect(ok, `${ctx}: LocalBusiness schema\n  ${formatErrors(validateLB)}`).toBe(true);
  crossValidateLocalBusinessUrls(normalized, ctx, expected);
}

function validateFaqPage(faq: unknown, ctx: string) {
  const normalized = normalizeJson(faq as any);
  const ok = validateFAQ(normalized);
  expect(ok, `${ctx}: FAQPage schema\n  ${formatErrors(validateFAQ)}`).toBe(true);
  // Extra structural rule the AJV schema can't express: FAQ answers' embedded
  // URLs must parse, and any plowwow.com URLs must use the canonical host
  // (no trailing "www.", no http://) so LLM crawlers see one source of truth.
  for (const [i, e] of (normalized as any).entries.entries()) {
    for (const m of String(e.a).matchAll(/https?:\/\/\S+/g)) {
      const raw = m[0].replace(/[.,;:)]+$/, "");
      let parsed: URL | null = null;
      try {
        parsed = new URL(raw);
      } catch {
        expect.fail(`${ctx}: FAQ[${i}].a bad URL "${raw}"`);
      }
      if (parsed && parsed.hostname.endsWith("plowwow.com")) {
        expect(parsed.protocol, `${ctx}: FAQ[${i}].a must use https for plowwow.com URL "${raw}"`).toBe("https:");
        expect(parsed.hostname, `${ctx}: FAQ[${i}].a must use canonical host plowwow.com, got "${parsed.hostname}"`).toBe("plowwow.com");
      }
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
      expect(ok, `/${city.slug}: StructuredData schema\n  ${formatErrors(validateSD)}`).toBe(true);
      validateLocalBusiness(payload.localBusiness, `/${city.slug}`, {
        url,
        imageStartsWith: `${BASE_URL}/`,
      });
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
      // Reverse the sanitize() used by seo-report.ts: "__" ↔ "/", "root" ↔ "/"
      const routePath = d === "root" ? "/" : "/" + d.replace(/__/g, "/");
      const expectedUrl = routePath === "/" ? BASE_URL : `${BASE_URL}${routePath}`;
      if (payload?.localBusiness)
        validateLocalBusiness(payload.localBusiness, `snapshot ${d}`, {
          url: expectedUrl,
          imageStartsWith: `${BASE_URL}/`,
        });
      if (payload?.faqPage) validateFaqPage(payload.faqPage, `snapshot ${d}`);
    });
  }
});
