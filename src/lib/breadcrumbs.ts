// Site-wide BreadcrumbList JSON-LD builder. Every page can produce
// a schema.org BreadcrumbList that terminates at its own canonical URL.

const BASE_URL = "https://www.plowwow.com";

export type Crumb = { name: string; path: string };

export function breadcrumbSchema(crumbs: Crumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${BASE_URL}${c.path}`,
    })),
  };
}

export const HOME_CRUMB: Crumb = { name: "Home", path: "/" };
