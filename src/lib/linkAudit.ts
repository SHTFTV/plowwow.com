// Shared internal-link audit — usable at build time (Node) and at runtime.
// Detects: orphan blog posts (no matching city hub) and cities with 0 posts.

import type { blogPosts as BlogPostsT } from "@/generated/blog-posts";
import type { cities as CitiesT } from "@/data/cities";

type BlogPost = (typeof BlogPostsT)[number];
type City = (typeof CitiesT)[number];
type CityHub = { slug: string; name: string; path: string };

export type LinkAuditReport = {
  generatedAt: string;
  totals: {
    posts: number;
    cities: number;
    orphanPosts: number;
    citiesWithoutPosts: number;
  };
  orphanPosts: { slug: string; title: string }[];
  citiesWithoutPosts: { slug: string; name: string; path: string }[];
  cityPostCounts: { slug: string; name: string; count: number }[];
};

export function runLinkAudit(
  posts: Pick<BlogPost, "slug" | "title">[],
  hubs: CityHub[],
): LinkAuditReport {
  const matchOrder = [...hubs].sort((a, b) => b.slug.length - a.slug.length);

  const cityFor = (slug: string) =>
    matchOrder.find((h) => slug.includes(h.slug)) ?? null;

  const countBySlug: Record<string, number> = Object.fromEntries(
    hubs.map((h) => [h.slug, 0]),
  );

  const orphanPosts: { slug: string; title: string }[] = [];
  for (const p of posts) {
    const hub = cityFor(p.slug);
    if (!hub) orphanPosts.push({ slug: p.slug, title: p.title });
    else countBySlug[hub.slug] = (countBySlug[hub.slug] ?? 0) + 1;
  }

  const cityPostCounts = hubs
    .map((h) => ({ slug: h.slug, name: h.name, count: countBySlug[h.slug] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const citiesWithoutPosts = hubs
    .filter((h) => (countBySlug[h.slug] ?? 0) === 0)
    .map((h) => ({ slug: h.slug, name: h.name, path: h.path }));

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      posts: posts.length,
      cities: hubs.length,
      orphanPosts: orphanPosts.length,
      citiesWithoutPosts: citiesWithoutPosts.length,
    },
    orphanPosts,
    citiesWithoutPosts,
    cityPostCounts,
  };
}

export function hubsFromCities(cities: Pick<City, "slug" | "name">[]): CityHub[] {
  return [
    { slug: "burnaby", name: "Burnaby", path: "/burnaby" },
    ...cities.map((c) => ({ slug: c.slug, name: c.name, path: `/${c.slug}` })),
  ];
}
