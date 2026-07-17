// Post-build prerender: for every route, take dist/index.html and inject a
// route-specific <title>, meta description, canonical, hreflang, OG tags, and
// full JSON-LD (BreadcrumbList + FAQPage + LocalBusiness/BlogPosting) into the
// static <head>, then write it to dist/<path>/index.html.
//
// The client-side React app still runs on load — this only guarantees that
// curl / view-source / non-JS crawlers see unique per-route metadata and rich
// structured data without needing to execute JavaScript.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { BASE_URL, collectRoutes, type RouteMeta } from "./routes";
import { cities } from "../src/data/cities";
import { SUPPORTED_LOCALES, X_DEFAULT_LOCALE, localizedUrl } from "./lib/locales";

const DIST = resolve("dist");
const TEMPLATE_PATH = resolve(DIST, "index.html");
const CONTENT_BLOG_DIR = resolve("src/content/legacy/blog");

if (!existsSync(TEMPLATE_PATH)) {
  console.error("dist/index.html not found — run `vite build` first.");
  process.exit(1);
}
const template = readFileSync(TEMPLATE_PATH, "utf8");

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ---------------------------------------------------------------------------
// Blog markdown parsing (FAQs + hero image) — mirrors src/pages/LegacyPage.tsx
// ---------------------------------------------------------------------------
type Faq = { q: string; a: string };

function readBlog(slug: string): { body: string; heroPath: string | null } | null {
  const p = resolve(CONTENT_BLOG_DIR, `${slug}.md`);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  const body = (raw.match(/Markdown Content:\s*\n([\s\S]*)$/)?.[1] ?? raw).trim();
  const heroMatch = body.match(/!\[[^\]]*\]\((\/[^)\s]+)\)/);
  return { body, heroPath: heroMatch?.[1] ?? null };
}

function extractFaqs(body: string): Faq[] {
  const sec = body.match(
    /(?:^|\n)##\s+Frequently Asked Questions\s*\n([\s\S]*?)(?=\n##\s|\n#\s(?!#)|$(?![\s\S]))/,
  );
  if (!sec) return [];
  const out: Faq[] = [];
  const re = /(?:^|\n)###\s+(.+?)\s*\n([\s\S]*?)(?=\n###\s|\n##\s|$(?![\s\S]))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sec[1])) !== null) {
    const q = m[1].trim();
    const a = m[2].replace(/[#>*_`]/g, " ").replace(/\s+/g, " ").trim();
    if (q && a) out.push({ q, a });
  }
  return out;
}

// ---------------------------------------------------------------------------
// JSON-LD builders
// ---------------------------------------------------------------------------
type LD = Record<string, unknown>;

function breadcrumb(route: RouteMeta, url: string, headline: string): LD {
  if (route.kind === "legacy-blog") {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog/` },
        { "@type": "ListItem", position: 3, name: headline, item: url },
      ],
    };
  }
  if (route.kind === "city") {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Service Areas", item: `${BASE_URL}/locations/` },
        { "@type": "ListItem", position: 3, name: headline, item: url },
      ],
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: headline, item: url },
    ],
  };
}

function faqPage(faqs: Faq[]): LD | null {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function cityLocalBusiness(route: RouteMeta, url: string): LD | null {
  const city = cities.find((c) => `/${c.slug}` === route.path);
  if (!city) return null;
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SnowRemovalService"],
    "@id": `${url}#localbusiness`,
    name: `PlowWow Snow Removal — ${city.name}`,
    image: city.ogImage,
    logo: `${BASE_URL}/icon-192.png`,
    url,
    telephone: "+1-604-761-1518",
    priceRange: "$$",
    areaServed: { "@type": "City", name: `${city.name}, ${city.province}` },
    address: {
      "@type": "PostalAddress",
      addressLocality: city.name,
      addressRegion: city.province,
      addressCountry: "CA",
    },
    provider: { "@id": `${BASE_URL}/#organization` },
    serviceType: "Snow Removal, De-Icing & Salting",
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "47" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${city.name} Snow & Ice Services`,
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Commercial Snow Plowing" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Strata & HOA Snow Removal" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "De-Icing & Salting" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Residential Driveway Clearing" } },
      ],
    },
  };
}

function blogPosting(route: RouteMeta, url: string, headline: string, heroAbs: string): LD {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description: route.description,
    url,
    image: heroAbs,
    author: { "@type": "Organization", name: "PlowWow", url: `${BASE_URL}/` },
    publisher: {
      "@type": "Organization",
      name: "PlowWow",
      url: `${BASE_URL}/`,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/icon-192.png` },
    },
    inLanguage: "en-CA",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

function blogLocalBusiness(url: string, headline: string, heroAbs: string): LD {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SnowRemovalService"],
    "@id": `${url}#localbusiness`,
    name: `PlowWow Snow Removal — ${headline}`,
    url,
    telephone: "+1-604-761-1518",
    priceRange: "$$",
    image: heroAbs,
    logo: `${BASE_URL}/icon-192.png`,
    areaServed: { "@type": "Place", name: headline },
    provider: { "@id": `${BASE_URL}/#organization` },
    serviceType: "Snow Removal, De-Icing & Salting",
    address: { "@type": "PostalAddress", addressRegion: "BC", addressCountry: "CA" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "47" },
  };
}

// ---------------------------------------------------------------------------
// Head builder
// ---------------------------------------------------------------------------
function renderHead(route: RouteMeta): string {
  const canonicalPath = route.path === "/" ? "/" : route.path.endsWith("/") ? route.path : `${route.path}/`;
  const url = `${BASE_URL}${canonicalPath}`;
  const title = esc(route.title);
  const desc = esc(route.description);
  const img = esc(route.ogImage ?? `${BASE_URL}/og-default.jpg`);
  const headline = route.title.replace(/\s*\|\s*PlowWow.*$/i, "").trim();

  let html = template;

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

  // meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${desc}" />`,
  );

  // canonical
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${url}" />`,
  );

  // OG tags
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${title}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${desc}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${url}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${img}" />`,
  );

  // Twitter
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${desc}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:image" content="${img}" />`,
  );

  // -------------------------------------------------------------------------
  // Inject hreflang + full JSON-LD graph, immediately before </head>.
  // Self-referencing hreflang (en-CA + x-default) — this is a single-locale
  // property today but the tag surface is validated so we can add locales
  // without another prerender rewrite.
  // -------------------------------------------------------------------------
  const hreflang = [
    `<link rel="alternate" hreflang="en-CA" href="${url}" />`,
    `<link rel="alternate" hreflang="x-default" href="${url}" />`,
  ].join("\n    ");

  const graph: LD[] = [];
  graph.push(breadcrumb(route, url, headline));

  if (route.kind === "city") {
    const lb = cityLocalBusiness(route, url);
    if (lb) graph.push(lb);
    const city = cities.find((c) => `/${c.slug}` === route.path);
    if (city?.faqs?.length) {
      const fp = faqPage(city.faqs.map((f) => ({ q: f.q, a: f.a })));
      if (fp) graph.push(fp);
    }
  } else if (route.kind === "legacy-blog") {
    const slug = route.path.replace(/^\/+/, "");
    const blog = readBlog(slug);
    const heroCandidate =
      blog?.heroPath ||
      (existsSync(resolve("public/blog-images", `${slug}.jpg`)) ? `/blog-images/${slug}.jpg` : null) ||
      route.ogImage ||
      `${BASE_URL}/og-default.jpg`;
    const heroAbs = heroCandidate.startsWith("http") ? heroCandidate : `${BASE_URL}${heroCandidate}`;
    graph.push(blogPosting(route, url, headline, heroAbs));
    graph.push(blogLocalBusiness(url, headline, heroAbs));
    if (blog) {
      const fp = faqPage(extractFaqs(blog.body));
      if (fp) graph.push(fp);
    }
  }

  const ldBlocks = graph
    .map(
      (g) =>
        `<script type="application/ld+json">${JSON.stringify(g)
          .replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n    ");

  html = html.replace(
    "</head>",
    `    ${hreflang}\n    ${ldBlocks}\n  </head>`,
  );

  // Body marker so curl/grep can prove distinct HTML content per route.
  html = html.replace(
    "</body>",
    `<script type="application/ld+json" data-prerendered-route="${route.path}">${JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": route.kind === "legacy-blog" ? "Article" : "WebPage",
        name: route.title,
        headline: route.title,
        description: route.description,
        url,
        image: route.ogImage,
      },
    )}</script>\n</body>`,
  );

  return html;
}

const routes = collectRoutes();
let written = 0;

for (const route of routes) {
  const html = renderHead(route);
  if (route.path === "/") {
    writeFileSync(TEMPLATE_PATH, html);
  } else {
    const outPath = resolve(DIST, route.path.replace(/^\//, ""), "index.html");
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
  }
  written++;
}

console.log(`✓ prerendered ${written} routes into dist/ (hreflang + JSON-LD graph baked)`);
