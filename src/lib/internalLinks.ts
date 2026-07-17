// Maps every blog slug to its parent city hub, and provides sibling
// neighborhood-post lookups so we can inject internal links from
// LegacyPage (blog posts) into their city hub, and from CityPage
// into their neighborhood posts. This is the crawl-graph glue.

import { blogPosts } from "@/generated/blog-posts";
import { cities } from "@/data/cities";

// Known city hubs. Burnaby uses the bespoke /burnaby route; the rest
// live at /:citySlug via CityPage.
export const cityHubs: { slug: string; name: string; path: string }[] = [
  { slug: "burnaby", name: "Burnaby", path: "/burnaby" },
  ...cities.map((c) => ({ slug: c.slug, name: c.name, path: `/${c.slug}` })),
];

// Longest-first so "port-coquitlam" wins over "coquitlam" and
// "west-vancouver"/"north-vancouver" win over "vancouver".
const matchOrder = [...cityHubs].sort((a, b) => b.slug.length - a.slug.length);

export type BlogPostLite = (typeof blogPosts)[number];

export function cityForBlogSlug(slug: string): (typeof cityHubs)[number] | null {
  for (const hub of matchOrder) {
    if (slug.includes(hub.slug)) return hub;
  }
  return null;
}

// All neighborhood posts that belong to a given city slug, sorted
// newest-first. Used by CityPage to render a "Latest guides" grid.
export function postsForCity(citySlug: string): BlogPostLite[] {
  return blogPosts
    .filter((p) => cityForBlogSlug(p.slug)?.slug === citySlug)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
}

// Sibling posts in the same city, excluding the current one.
export function siblingsForBlogSlug(slug: string, limit = 4): BlogPostLite[] {
  const hub = cityForBlogSlug(slug);
  if (!hub) return [];
  return postsForCity(hub.slug)
    .filter((p) => p.slug !== slug)
    .slice(0, limit);
}
