// Shared source of truth for every prerendered/public route.
// Consumed by scripts/generate-sitemap.ts and scripts/prerender.ts.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cities } from "../src/data/cities";

export const BASE_URL = "https://plowwow.com";

export type RouteMeta = {
  path: string; // "/vancouver" (no trailing slash, no origin)
  title: string;
  description: string;
  ogImage?: string;
  kind: "static" | "city" | "legacy-page" | "legacy-blog";
};

const CONTENT_DIR = resolve(process.cwd(), "src/content/legacy");

function readSlugs(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

function parseLegacy(raw: string) {
  const title = raw.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? "PlowWow";
  const desc = raw.match(/^Description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const body = raw.match(/Markdown Content:\s*\n([\s\S]*)$/)?.[1] ?? raw;
  const fallback = body
    .replace(/[#>*_`\[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);
  return { title, description: desc || fallback };
}

const truncate = (s: string, n = 155) =>
  s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,;:.\-—]+$/, "") + "…";

export function collectRoutes(): RouteMeta[] {
  const routes: RouteMeta[] = [];

  // Static / hand-built pages
  const staticRoutes: RouteMeta[] = [
    {
      path: "/",
      title: "PlowWow — Snow Removal & De-Icing in Greater Vancouver",
      description:
        "PlowWow delivers 24/7 snow plowing, salting, and de-icing for residential, strata, and commercial properties across Greater Vancouver, BC.",
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "static",
    },
    {
      path: "/burnaby",
      title: "Burnaby Snow Removal & De-Icing | PlowWow",
      description:
        "24/7 Burnaby snow plowing and salting — Metrotown, Brentwood, Lougheed, Highgate. WorkSafeBC insured strata & commercial crews on standby.",
      ogImage: `${BASE_URL}/og-burnaby.jpg`,
      kind: "static",
    },
    {
      path: "/blog",
      title: "Snow Removal Blog & Neighborhood Guides | PlowWow",
      description:
        "Neighborhood-by-neighborhood snow removal guides, strata liability tips, seasonal contract advice for Greater Vancouver properties.",
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "static",
    },
    {
      path: "/intelligence",
      title: "PlowWow Intelligence — Snow Ops Software | PlowWow",
      description:
        "AI-assisted routing, salt-scan and GPS-tracked fleet dashboards for professional snow removal contractors.",
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "static",
    },
    {
      path: "/advanced-technology",
      title: "Advanced Snow Removal Technology | PlowWow",
      description:
        "How PlowWow uses real-time weather triggers, GPS tracking and geofenced routing to keep Greater Vancouver strata and commercial lots clear.",
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "static",
    },
    {
      path: "/takeoff",
      title: "Snow Contract Takeoff & Estimate Tool | PlowWow",
      description:
        "Signed-in contractors can build snow-contract takeoffs — plow, salt, per-visit pricing — and export branded PDF estimates in one click.",
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "static",
    },
    {
      path: "/quote",
      title: "Get a Snow Removal Quote | PlowWow Metro Vancouver",
      description:
        "Request a fixed seasonal snow removal quote for your Metro Vancouver strata, commercial or industrial property. 24/7 dispatch, GPS-logged salt runs.",
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "static",
    },
    {
      path: "/locations",
      title: "Snow Removal Service Areas | PlowWow Metro Vancouver",
      description:
        "Every city and neighborhood PlowWow services across Metro Vancouver and the Fraser Valley — 24/7 strata, commercial and residential snow removal.",
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "static",
    },
    {
      path: "/guest-post",
      title: "Submit a Guest Post | PlowWow Snow Removal Blog",
      description:
        "Pitch a guest post to PlowWow: share snow removal, strata liability, or winter ops expertise with contractors and property managers across BC.",
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "static",
    },
    {
      path: "/seo-report",
      title: "City SEO Report — Canonicals & OG URLs | PlowWow",
      description:
        "Internal SEO audit report comparing canonical and og:url tags across every PlowWow city route and neighborhood landing page.",
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "static",
    },
  ];
  routes.push(...staticRoutes);

  // Cities (from src/data/cities.ts)
  for (const c of cities) {
    routes.push({
      path: `/${c.slug}`,
      title: `${c.tagline} | PlowWow`,
      description: truncate(c.intro),
      ogImage: c.ogImage,
      kind: "city",
    });
  }

  // Legacy content pages
  for (const slug of readSlugs(resolve(CONTENT_DIR, "pages"))) {
    if (slug === "home") continue;
    const raw = readFileSync(resolve(CONTENT_DIR, "pages", `${slug}.md`), "utf8");
    const { title, description } = parseLegacy(raw);
    routes.push({
      path: `/${slug}`,
      title,
      description: truncate(description),
      ogImage: `${BASE_URL}/og-default.jpg`,
      kind: "legacy-page",
    });
  }

  // Legacy blog posts
  for (const slug of readSlugs(resolve(CONTENT_DIR, "blog"))) {
    const raw = readFileSync(resolve(CONTENT_DIR, "blog", `${slug}.md`), "utf8");
    const { title, description } = parseLegacy(raw);
    const heroPath = resolve(process.cwd(), "public/blog-images", `${slug}.jpg`);
    const ogImage = existsSync(heroPath)
      ? `${BASE_URL}/blog-images/${slug}.jpg`
      : `${BASE_URL}/og-default.jpg`;
    routes.push({
      path: `/${slug}`,
      title,
      description: truncate(description),
      ogImage,
      kind: "legacy-blog",
    });
  }

  return routes;
}
