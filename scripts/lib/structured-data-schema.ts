// AJV JSON Schemas for the structured-data snapshots emitted by
// scripts/seo-report.ts. Shared by:
//   - src/test/structured-data.fields.test.ts (asserts every city + every
//     on-disk snapshot payload matches these schemas)
//   - scripts/seo-report.ts (can validate before writing snapshots)
//
// Schemas are intentionally strict: additionalProperties=false so any new
// field surfaces as a schema failure until the schema catches up.
import Ajv, { type ValidateFunction, type SchemaObject } from "ajv";
import addFormats from "ajv-formats";

export type LocalBusinessSnapshot = {
  name: string;
  url: string;
  image: string;
  telephone: string;
  areaServed: string;
  priceRange: string;
};

export type FaqEntry = { q: string; a: string };
export type FaqPageSnapshot = {
  questionCount: number;
  entries: FaqEntry[];
};

export type StructuredDataSnapshot = {
  localBusiness?: LocalBusinessSnapshot;
  faqPage?: FaqPageSnapshot;
};

export const localBusinessSchema: SchemaObject = {
  $id: "plowwow://schemas/local-business.json",
  type: "object",
  required: ["name", "url", "image", "telephone", "areaServed", "priceRange"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    url: { type: "string", format: "uri", pattern: "^https://plowwow\\.com(/|$)" },
    image: { type: "string", format: "uri", pattern: "^https://plowwow\\.com/" },
    telephone: { type: "string", pattern: "^\\+?[0-9\\-\\s().]+$", minLength: 7 },
    areaServed: { type: "string", minLength: 1 },
    priceRange: { type: "string", minLength: 1 },
  },
};

export const faqEntrySchema: SchemaObject = {
  $id: "plowwow://schemas/faq-entry.json",
  type: "object",
  required: ["q", "a"],
  additionalProperties: false,
  properties: {
    q: { type: "string", minLength: 1 },
    a: { type: "string", minLength: 1 },
  },
};

export const faqPageSchema: SchemaObject = {
  $id: "plowwow://schemas/faq-page.json",
  type: "object",
  required: ["questionCount", "entries"],
  additionalProperties: false,
  properties: {
    questionCount: { type: "integer", minimum: 1 },
    entries: { type: "array", minItems: 1, items: faqEntrySchema },
  },
};

export const structuredDataSchema: SchemaObject = {
  $id: "plowwow://schemas/structured-data.json",
  type: "object",
  additionalProperties: false,
  properties: {
    localBusiness: localBusinessSchema,
    faqPage: faqPageSchema,
  },
};

let cached: {
  ajv: Ajv;
  localBusiness: ValidateFunction<LocalBusinessSnapshot>;
  faqPage: ValidateFunction<FaqPageSnapshot>;
  structuredData: ValidateFunction<StructuredDataSnapshot>;
} | null = null;

export function getValidators() {
  if (cached) return cached;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  cached = {
    ajv,
    localBusiness: ajv.compile<LocalBusinessSnapshot>(localBusinessSchema),
    faqPage: ajv.compile<FaqPageSnapshot>(faqPageSchema),
    structuredData: ajv.compile<StructuredDataSnapshot>(structuredDataSchema),
  };
  return cached;
}

export function formatErrors(v: ValidateFunction<any>): string {
  return (v.errors ?? [])
    .map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}${e.params ? " " + JSON.stringify(e.params) : ""}`)
    .join("; ");
}
