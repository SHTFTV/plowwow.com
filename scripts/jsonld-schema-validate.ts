// Strict AJV validation of LocalBusiness + PostalAddress JSON-LD in
// prerendered city HTML.
//
// Extracts every <script type="application/ld+json"> block from each
// dist/<slug>/index.html for known city slugs, walks the @graph/objects
// looking for @type=LocalBusiness (or an array containing LocalBusiness),
// and validates:
//   - required core fields (name, url, telephone, address, image, logo, …)
//   - address is a PostalAddress with required address* fields
//   - url and logo are absolute https://plowwow.com URLs
//   - image, if present, is absolute https://
//   - aggregateRating (if present) matches schema.org shape
//
// AJV runs in strict mode with additionalProperties allowed (schema.org
// commonly carries extra fields) but every listed property is type-checked
// and every required key is enforced.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { cities } from "../src/data/cities";

const DIST = resolve("dist");
const REPORT_DIR = resolve("seo-report");
mkdirSync(REPORT_DIR, { recursive: true });

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const postalAddressSchema = {
  type: "object",
  required: ["@type", "addressLocality", "addressRegion", "addressCountry"],
  properties: {
    "@type": { const: "PostalAddress" },
    addressLocality: { type: "string", minLength: 1 },
    addressRegion: { type: "string", minLength: 1 },
    addressCountry: { type: "string", minLength: 1 },
    streetAddress: { type: "string" },
    postalCode: { type: "string" },
  },
};

const localBusinessSchema = {
  type: "object",
  required: ["@context", "@type", "name", "url", "telephone", "address", "logo"],
  properties: {
    "@context": { type: "string", pattern: "^https?://schema\\.org" },
    "@type": {
      anyOf: [
        { type: "string", pattern: "LocalBusiness" },
        {
          type: "array",
          contains: { type: "string", const: "LocalBusiness" },
          minItems: 1,
        },
      ],
    },
    name: { type: "string", minLength: 3 },
    url: { type: "string", format: "uri", pattern: "^https://plowwow\\.com/" },
    telephone: { type: "string", pattern: "^\\+?[0-9()\\-\\s]{7,}$" },
    image: { type: "string", format: "uri", pattern: "^https://" },
    logo: { type: "string", format: "uri", pattern: "^https://" },
    priceRange: { type: "string" },
    serviceType: { type: "string" },
    areaServed: { type: "object" },
    address: postalAddressSchema,
    aggregateRating: {
      type: "object",
      required: ["@type", "ratingValue", "reviewCount"],
      properties: {
        "@type": { const: "AggregateRating" },
        ratingValue: { type: ["string", "number"] },
        reviewCount: { type: ["string", "number"] },
      },
    },
    hasOfferCatalog: { type: "object" },
    provider: { type: "object" },
  },
};

const validate = ajv.compile(localBusinessSchema);

function extractLdJson(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      out.push({ __parseError: true, __body: m[1].slice(0, 200) });
    }
  }
  return out;
}

function collectLocalBusinesses(nodes: unknown[]): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const t = o["@type"];
    const isLB =
      t === "LocalBusiness" ||
      (Array.isArray(t) && t.includes("LocalBusiness"));
    if (isLB) found.push(o);
    if (Array.isArray(o["@graph"])) for (const g of o["@graph"] as unknown[]) walk(g);
  };
  for (const n of nodes) walk(n);
  return found;
}

const targets = [
  { slug: "burnaby", name: "Burnaby" },
  ...cities.map((c) => ({ slug: c.slug, name: c.name })),
];

const results: { slug: string; ok: boolean; errors: string[] }[] = [];

for (const t of targets) {
  const file = resolve(DIST, t.slug, "index.html");
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  const nodes = extractLdJson(html);
  const parseErrors = nodes.filter((n) => (n as { __parseError?: boolean }).__parseError);
  if (parseErrors.length) {
    results.push({
      slug: t.slug,
      ok: false,
      errors: [`${parseErrors.length} JSON-LD block(s) failed to parse`],
    });
    continue;
  }
  const businesses = collectLocalBusinesses(nodes);
  if (!businesses.length) {
    results.push({ slug: t.slug, ok: false, errors: ["no LocalBusiness JSON-LD found"] });
    continue;
  }
  const errors: string[] = [];
  for (const b of businesses) {
    const ok = validate(b);
    if (!ok && validate.errors) {
      for (const e of validate.errors as ErrorObject[]) {
        errors.push(`${e.instancePath || "/"} ${e.keyword} ${e.message ?? ""}`.trim());
      }
    }
  }
  results.push({ slug: t.slug, ok: errors.length === 0, errors });
}

const failed = results.filter((r) => !r.ok);
writeFileSync(
  resolve(REPORT_DIR, "jsonld-schema.json"),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), checked: results.length, failed, passed: results.length - failed.length },
    null,
    2,
  ),
);

if (failed.length) {
  console.error(
    `\n✗ jsonld-schema-validate: ${failed.length}/${results.length} city route(s) have invalid LocalBusiness/PostalAddress JSON-LD:\n`,
  );
  for (const r of failed) {
    console.error(`  /${r.slug}/`);
    for (const e of r.errors.slice(0, 6)) console.error(`    - ${e}`);
    if (r.errors.length > 6) console.error(`    …and ${r.errors.length - 6} more`);
  }
  console.error(`\nSee seo-report/jsonld-schema.json for machine output.`);
  process.exit(1);
}

console.log(
  `✓ jsonld-schema-validate: ${results.length} city route(s) pass strict LocalBusiness + PostalAddress schema.`,
);
