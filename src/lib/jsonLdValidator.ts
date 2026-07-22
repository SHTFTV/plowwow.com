// Lightweight JSON-LD validator for the in-page dev badge.
// Not a full schema.org validator — asserts the required fields we ship
// on city pages for LocalBusiness, FAQPage, BreadcrumbList, and Service.

export type JsonLdIssue = {
  block: string; // @type
  path: string; // JSON pointer-ish
  message: string;
  severity: "error" | "warn";
};

const requiredByType: Record<string, string[]> = {
  LocalBusiness: ["name", "url", "telephone", "address", "areaServed"],
  SnowRemovalService: ["name", "url", "telephone", "address", "areaServed"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  Service: ["name", "provider", "areaServed"],
};

function typeOf(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const t = (node as Record<string, unknown>)["@type"];
  if (Array.isArray(t)) return t.map(String);
  if (typeof t === "string") return [t];
  return [];
}

function isHttpUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

export function validateJsonLdBlock(raw: string): JsonLdIssue[] {
  const issues: JsonLdIssue[] = [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    issues.push({
      block: "unknown",
      path: "$",
      severity: "error",
      message: `Invalid JSON: ${(e as Error).message}`,
    });
    return issues;
  }

  const nodes = Array.isArray(data) ? data : [data];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const types = typeOf(node);
    const label = types.join("|") || "Thing";
    const rec = node as Record<string, unknown>;

    // required fields
    for (const t of types) {
      const reqs = requiredByType[t];
      if (!reqs) continue;
      for (const key of reqs) {
        if (rec[key] === undefined || rec[key] === null || rec[key] === "") {
          issues.push({
            block: label,
            path: `$.${key}`,
            severity: "error",
            message: `${t} missing required field "${key}"`,
          });
        }
      }
    }

    // type-specific checks
    if (types.includes("FAQPage")) {
      const entities = rec.mainEntity;
      if (!Array.isArray(entities) || entities.length === 0) {
        issues.push({
          block: label,
          path: "$.mainEntity",
          severity: "error",
          message: "FAQPage.mainEntity must be a non-empty array",
        });
      } else {
        entities.forEach((q, i) => {
          const qr = q as Record<string, unknown>;
          if (!qr?.name) {
            issues.push({
              block: label,
              path: `$.mainEntity[${i}].name`,
              severity: "error",
              message: "Question missing 'name'",
            });
          }
          const ans = qr?.acceptedAnswer as Record<string, unknown> | undefined;
          if (!ans?.text) {
            issues.push({
              block: label,
              path: `$.mainEntity[${i}].acceptedAnswer.text`,
              severity: "error",
              message: "Question missing acceptedAnswer.text",
            });
          }
        });
      }
    }

    if (types.includes("BreadcrumbList")) {
      const items = rec.itemListElement;
      if (!Array.isArray(items) || items.length === 0) {
        issues.push({
          block: label,
          path: "$.itemListElement",
          severity: "error",
          message: "BreadcrumbList.itemListElement must be a non-empty array",
        });
      } else {
        items.forEach((it, i) => {
          const r = it as Record<string, unknown>;
          if (r.position !== i + 1) {
            issues.push({
              block: label,
              path: `$.itemListElement[${i}].position`,
              severity: "warn",
              message: `Expected position ${i + 1}, got ${String(r.position)}`,
            });
          }
          if (!r.name) {
            issues.push({
              block: label,
              path: `$.itemListElement[${i}].name`,
              severity: "error",
              message: "Breadcrumb item missing name",
            });
          }
          if (!isHttpUrl(r.item)) {
            issues.push({
              block: label,
              path: `$.itemListElement[${i}].item`,
              severity: "error",
              message: "Breadcrumb item.item must be an absolute URL",
            });
          }
        });
      }
    }

    if (types.some((t) => t === "LocalBusiness" || t === "SnowRemovalService")) {
      if (rec.url && !isHttpUrl(rec.url)) {
        issues.push({
          block: label,
          path: "$.url",
          severity: "error",
          message: "url must be an absolute URL",
        });
      }
      const addr = rec.address as Record<string, unknown> | undefined;
      if (addr && !addr.addressCountry) {
        issues.push({
          block: label,
          path: "$.address.addressCountry",
          severity: "warn",
          message: "address.addressCountry recommended",
        });
      }
    }
  }

  return issues;
}

export function collectPageJsonLdIssues(): {
  blocks: number;
  issues: JsonLdIssue[];
} {
  if (typeof document === "undefined") return { blocks: 0, issues: [] };
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]'
  );
  const issues: JsonLdIssue[] = [];
  scripts.forEach((s) => {
    for (const issue of validateJsonLdBlock(s.textContent || "")) {
      issues.push(issue);
    }
  });
  return { blocks: scripts.length, issues };
}

export function countMainWords(): number {
  if (typeof document === "undefined") return 0;
  const main = document.querySelector("main");
  if (!main) return 0;
  const text = (main as HTMLElement).innerText || main.textContent || "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}
