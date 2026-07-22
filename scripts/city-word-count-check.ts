/*
 * Build-time gate for city pages.
 *
 * Fails CI when any city page's aggregate rendered content drops below
 * the 5,800-word floor, or when any city's JSON-LD payload
 * (LocalBusiness, FAQPage, BreadcrumbList) reports validation errors.
 *
 * The word count sums text that CityPage renders:
 *   - hero: tagline + intro
 *   - buildCityCopy narrative
 *   - neighborhood notes
 *   - FAQ entries
 *   - LocationDeepData prose (intro/conditions/prep/mistakes), FAQ,
 *     neighbourhoods, testimonials — same content the deep-dive component
 *     renders.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { cities } from "../src/data/cities";
import { buildCityCopy } from "../src/data/cityContent";
import { getLocationDeep } from "../src/data/locations";
import { validateJsonLdBlock } from "../src/lib/jsonLdValidator";

const MIN_WORDS = 5800;

// Burnaby is rendered by src/pages/Burnaby.tsx (not CityPage) but consumes
// the same LocationDeepData and must meet the same bar.
const BURNABY_META = {
  slug: "burnaby",
  name: "Burnaby",
  province: "BC",
  tagline: "Burnaby Snow Removal & De-icing",
  intro:
    "24/7 plowing, salting and ice control across Burnaby — Metrotown, Brentwood, Lougheed, SFU-adjacent, Big Bend, and every strata block in between.",
  neighborhoods: [] as { name: string; note: string }[],
  faqs: [] as { q: string; a: string }[],
};

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

type CityTextInput = {
  slug: string;
  name: string;
  province: string;
  tagline: string;
  intro: string;
  neighborhoods: { name: string; note: string }[];
  faqs: { q: string; a: string }[];
};

function countCityWords(city: CityTextInput): number {
  const deep = getLocationDeep(city.slug);
  const parts: string[] = [];
  parts.push(city.tagline, city.intro);
  for (const n of city.neighborhoods) parts.push(n.name, n.note);
  for (const f of city.faqs) parts.push(f.q, f.a);

  // buildCityCopy is only defined for entries in cities[] — skip for burnaby.
  const cityRecord = cities.find((c) => c.slug === city.slug);
  if (cityRecord) {
    const copy = buildCityCopy(cityRecord);
    parts.push(copy.narrative);
  }

  if (deep) {
    parts.push(
      deep.terrain_note,
      deep.snowfall_note,
      deep.strata_note,
      deep.commercial_note,
      deep.residential_note,
      deep.intro_long,
      deep.conditions_long,
      deep.prep_long,
      deep.mistakes_long,
    );
    for (const n of deep.neighbourhoods) parts.push(n.name, n.note);
    for (const f of deep.faq) parts.push(f.q, f.a);
    for (const t of deep.testimonials)
      parts.push(t.quote, `${t.name} ${t.role} ${t.neighbourhood}`);
    parts.push(deep.bylaw.rule, deep.bylaw.authority);
    for (const r of deep.transit_routes)
      parts.push(r.route, r.corridor, r.operator);
    for (const l of deep.landmarks) parts.push(l.name);
  }

  return parts.reduce((sum, s) => sum + wc(s), 0);
}

function buildCityJsonLd(city: CityTextInput) {
  const url = `https://plowwow.com/${city.slug}`;
  const deep = getLocationDeep(city.slug);
  const faqs = [...(deep?.faq ?? []), ...city.faqs];

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SnowRemovalService"],
    name: `PlowWow Snow Removal — ${city.name}`,
    url,
    telephone: "+1-604-761-1518",
    address: {
      "@type": "PostalAddress",
      addressLocality: city.name,
      addressRegion: city.province,
      addressCountry: "CA",
    },
    areaServed: { "@type": "City", name: `${city.name}, ${city.province}` },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://plowwow.com/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Service Areas",
        item: "https://plowwow.com/locations",
      },
      { "@type": "ListItem", position: 3, name: city.name, item: url },
    ],
  };

  return { localBusiness, faqPage, breadcrumbs };
}

type Row = { slug: string; words: number; jsonldErrors: number; issues: string[] };

const inputs: CityTextInput[] = [
  BURNABY_META,
  ...cities.map((c) => ({
    slug: c.slug,
    name: c.name,
    province: c.province,
    tagline: c.tagline,
    intro: c.intro,
    neighborhoods: c.neighborhoods,
    faqs: c.faqs,
  })),
];

const rows: Row[] = [];
let hasFailure = false;

for (const city of inputs) {
  const words = countCityWords(city);
  const { localBusiness, faqPage, breadcrumbs } = buildCityJsonLd(city);
  const allIssues: string[] = [];
  for (const [label, block] of [
    ["LocalBusiness", localBusiness],
    ["FAQPage", faqPage],
    ["BreadcrumbList", breadcrumbs],
  ] as const) {
    if (label === "FAQPage" && faqPage.mainEntity.length === 0) {
      // No FAQPage rendered when there are no FAQs — skip validating an empty
      // stub that we would not emit at runtime.
      continue;
    }
    const issues = validateJsonLdBlock(JSON.stringify(block));
    for (const iss of issues) {
      if (iss.severity === "error") {
        allIssues.push(`${label} ${iss.path}: ${iss.message}`);
      }
    }
  }
  const row: Row = {
    slug: city.slug,
    words,
    jsonldErrors: allIssues.length,
    issues: allIssues,
  };
  rows.push(row);
  if (words < MIN_WORDS || allIssues.length > 0) hasFailure = true;
}

const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - s.length));

console.log("\nCity page word-count & JSON-LD gate\n");
console.log(pad("slug", 22), pad("words", 8), pad("min", 6), pad("jsonld", 8), "status");
console.log("-".repeat(60));
for (const r of rows) {
  const wOk = r.words >= MIN_WORDS;
  const jOk = r.jsonldErrors === 0;
  const status = wOk && jOk ? "PASS" : "FAIL";
  console.log(
    pad(r.slug, 22),
    pad(String(r.words), 8),
    pad(String(MIN_WORDS), 6),
    pad(String(r.jsonldErrors), 8),
    status,
  );
  if (r.issues.length > 0) {
    for (const i of r.issues) console.log("   -", i);
  }
}

if (hasFailure) {
  console.error(
    "\n✗ city-word-count-check FAILED — one or more cities are under 5,800 words or have JSON-LD errors.\n",
  );
  process.exit(1);
} else {
  console.log("\n✓ all cities meet the 5,800-word bar and emit valid JSON-LD.\n");
}
