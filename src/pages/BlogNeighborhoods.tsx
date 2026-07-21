// Neighborhood blog index. Filters all blog posts by parent city (or "Citywide"
// for posts with no city hub match) AND by topic tag. Includes CollectionPage +
// BreadcrumbList + ItemList JSON-LD for each filtered view, self-referencing
// canonical URLs, and accessible pagination.

import { useMemo, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { blogPosts } from "@/generated/blog-posts";
import { cityForBlogSlug, cityHubs } from "@/lib/internalLinks";

const ALL = "all";
const CITYWIDE = "citywide";
const PAGE_SIZE = 12;
const BASE = "https://plowwow.com";

const BlogNeighborhoods = () => {
  const [params, setParams] = useSearchParams();
  const activeCity = params.get("city") ?? ALL;
  const activeTag = params.get("tag") ?? ALL;
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  // Group posts by city hub once.
  const grouped = useMemo(() => {
    const map = new Map<string, typeof blogPosts>();
    for (const p of blogPosts) {
      const hub = cityForBlogSlug(p.slug);
      const key = hub?.slug ?? CITYWIDE;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    for (const [, arr] of map)
      arr.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
    return map;
  }, []);

  // City filter chips.
  const cityFilters = useMemo(() => {
    const items: { key: string; label: string; count: number }[] = [
      { key: ALL, label: "All neighborhoods", count: blogPosts.length },
    ];
    for (const hub of cityHubs) {
      const count = grouped.get(hub.slug)?.length ?? 0;
      if (count > 0) items.push({ key: hub.slug, label: hub.name, count });
    }
    const citywide = grouped.get(CITYWIDE)?.length ?? 0;
    if (citywide > 0) items.push({ key: CITYWIDE, label: "Citywide", count: citywide });
    return items;
  }, [grouped]);

  // Posts scoped by the current city selection (before tag filter).
  const cityScoped = useMemo(() => {
    if (activeCity === ALL) {
      return blogPosts.slice().sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
    }
    return grouped.get(activeCity) ?? [];
  }, [activeCity, grouped]);

  // Tag filter chips — dynamic to the current city scope so counts stay honest.
  const tagFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of cityScoped) for (const t of (p.tags ?? [])) counts.set(t, (counts.get(t) ?? 0) + 1);
    const items = [{ key: ALL, label: "All topics", count: cityScoped.length }];
    for (const [tag, count] of [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
      items.push({ key: tag, label: tag, count });
    }
    return items;
  }, [cityScoped]);

  const filtered = useMemo(() => {
    if (activeTag === ALL) return cityScoped;
    return cityScoped.filter((p) => (p.tags ?? []).includes(activeTag));
  }, [cityScoped, activeTag]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // If activeTag isn't valid for the current city scope, drop it silently.
  useEffect(() => {
    if (activeTag !== ALL && !tagFilters.some((t) => t.key === activeTag)) {
      const next = new URLSearchParams(params);
      next.delete("tag");
      next.delete("page");
      setParams(next, { replace: true });
    }
  }, [activeTag, tagFilters, params, setParams]);

  // Build a canonical URL for the current filter combination.
  const canonical = useMemo(() => {
    const qs = new URLSearchParams();
    if (activeCity !== ALL) qs.set("city", activeCity);
    if (activeTag !== ALL) qs.set("tag", activeTag);
    if (currentPage > 1) qs.set("page", String(currentPage));
    const q = qs.toString();
    return `${BASE}/blog/neighborhoods/${q ? `?${q}` : ""}`;
  }, [activeCity, activeTag, currentPage]);

  const cityLabel = cityFilters.find((c) => c.key === activeCity)?.label ?? "All neighborhoods";
  const tagLabel = activeTag === ALL ? null : activeTag;

  // Per-filter title/description.
  const { title, description } = useMemo(() => {
    const cityPart = activeCity === ALL ? "Metro Vancouver" : cityLabel;
    const tagPart = tagLabel ? ` — ${tagLabel}` : "";
    const pagePart = currentPage > 1 ? ` (Page ${currentPage})` : "";
    return {
      title: `${cityPart} Snow Removal Blog${tagPart}${pagePart} | PlowWow`,
      description:
        tagLabel
          ? `PlowWow snow-removal guides for ${cityPart} filtered by ${tagLabel} — strata liability, seasonal contracts, storm response and neighborhood tips.`
          : `Browse PlowWow's ${cityPart} snow-removal guides — neighborhood-by-neighborhood coverage of strata, commercial and residential winter service.`,
    };
  }, [activeCity, cityLabel, tagLabel, currentPage]);

  // Update head tags + inject CollectionPage / BreadcrumbList / ItemList JSON-LD.
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const setProp = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", description);
    setProp("og:title", title);
    setProp("og:description", description);
    setProp("og:url", canonical);
    setProp("og:type", "website");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    let canon = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = canonical;

    // Pagination rel=prev/next.
    document.querySelector('link[rel="prev"]')?.remove();
    document.querySelector('link[rel="next"]')?.remove();
    const relLink = (rel: string, pageN: number) => {
      const qs = new URLSearchParams();
      if (activeCity !== ALL) qs.set("city", activeCity);
      if (activeTag !== ALL) qs.set("tag", activeTag);
      if (pageN > 1) qs.set("page", String(pageN));
      const q = qs.toString();
      const el = document.createElement("link");
      el.rel = rel;
      el.href = `${BASE}/blog/neighborhoods/${q ? `?${q}` : ""}`;
      document.head.appendChild(el);
    };
    if (currentPage > 1) relLink("prev", currentPage - 1);
    if (currentPage < totalPages) relLink("next", currentPage + 1);

    // Rich JSON-LD graph for the filtered view.
    const id = "blog-neighborhoods-jsonld";
    document.getElementById(id)?.remove();
    const breadcrumbs: { name: string; item: string }[] = [
      { name: "Home", item: `${BASE}/` },
      { name: "Blog", item: `${BASE}/blog/` },
      { name: "Neighborhoods", item: `${BASE}/blog/neighborhoods/` },
    ];
    if (activeCity !== ALL) breadcrumbs.push({ name: cityLabel, item: `${BASE}/blog/neighborhoods/?city=${activeCity}` });
    if (tagLabel) breadcrumbs.push({ name: tagLabel, item: canonical });

    const graph: Record<string, unknown>[] = [
      {
        "@type": "CollectionPage",
        "@id": canonical,
        url: canonical,
        name: title,
        description,
        isPartOf: { "@type": "WebSite", "@id": `${BASE}/#website`, url: `${BASE}/`, name: "PlowWow" },
        inLanguage: "en-CA",
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
        mainEntity: { "@id": `${canonical}#itemlist` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: breadcrumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
      },
      {
        "@type": "ItemList",
        "@id": `${canonical}#itemlist`,
        name: title,
        numberOfItems: filtered.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: visible.map((p, i) => ({
          "@type": "ListItem",
          position: (currentPage - 1) * PAGE_SIZE + i + 1,
          url: `${BASE}/${p.slug}/`,
          name: p.title.replace(/\s*\|\s*PlowWow.*$/i, ""),
        })),
      },
    ];
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = id;
    ld.text = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
    document.head.appendChild(ld);
    return () => {
      document.getElementById(id)?.remove();
      document.querySelector('link[rel="prev"]')?.remove();
      document.querySelector('link[rel="next"]')?.remove();
    };
  }, [title, description, canonical, currentPage, totalPages, filtered.length, visible, activeCity, activeTag, cityLabel, tagLabel]);

  const setFilter = (key: "city" | "tag", value: string) => {
    const next = new URLSearchParams(params);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    next.delete("page"); // any filter change resets pagination
    setParams(next, { replace: false });
  };

  const goToPage = (n: number) => {
    const next = new URLSearchParams(params);
    if (n <= 1) next.delete("page");
    else next.set("page", String(n));
    setParams(next, { replace: false });
    // Return keyboard focus to the pagination heading for screen readers.
    requestAnimationFrame(() => resultsHeadingRef.current?.focus());
  };

  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  // Compact page-number window: always show 1, current-1, current, current+1, last.
  const pageWindow = useMemo(() => {
    const s = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return [...s].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-12 md:py-16 bg-gradient-to-b from-muted/40 to-background">
          <div className="container max-w-6xl">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link to="/" className="hover:text-primary hover:underline">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link to="/blog" className="hover:text-primary hover:underline">Blog</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-foreground font-semibold">Neighborhoods</li>
              </ol>
            </nav>
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
              Snow Removal by Neighborhood
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Every PlowWow neighborhood guide, grouped by city. Filter by area, or by topic
              within a city, to narrow down to what you need.
            </p>

            <div className="mt-6" role="group" aria-label="Filter by neighborhood">
              <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Neighborhood</div>
              <div className="flex flex-wrap gap-2">
                {cityFilters.map((f) => {
                  const isActive = activeCity === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setFilter("city", f.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {f.label}
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                      }`}>{f.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {tagFilters.length > 1 && (
              <div className="mt-4" role="group" aria-label="Filter by topic">
                <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Topic</div>
                <div className="flex flex-wrap gap-2">
                  {tagFilters.map((f) => {
                    const isActive = activeTag === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setFilter("tag", f.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        {f.label}
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                          isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                        }`}>{f.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="py-8 md:py-12" aria-labelledby="results-heading">
          <div className="container max-w-6xl">
            <h2
              id="results-heading"
              ref={resultsHeadingRef}
              tabIndex={-1}
              className="sr-only"
              aria-live="polite"
            >
              {filtered.length} post{filtered.length === 1 ? "" : "s"} — page {currentPage} of {totalPages}
            </h2>
            {visible.length === 0 ? (
              <p className="text-muted-foreground">No posts match that filter yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visible.map((p) => {
                  const hub = cityForBlogSlug(p.slug);
                  return (
                    <Link
                      key={p.slug}
                      to={`/${p.slug}`}
                      className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <img
                        src={p.image}
                        alt={p.alt}
                        loading="lazy"
                        width={1200}
                        height={630}
                        className="aspect-[1200/630] w-full object-cover"
                      />
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">
                          {hub?.name ?? "Citywide"}
                        </div>
                        <h3 className="font-black text-foreground leading-snug group-hover:text-primary">
                          {p.title.replace(/\s*\|\s*PlowWow.*$/i, "")}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.blurb}</p>
                        {p.tags?.length > 0 && (
                          <ul className="mt-3 flex flex-wrap gap-1" aria-label="Topics">
                            {p.tags.slice(0, 3).map((t) => (
                              <li key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {t}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <nav
                aria-label="Blog pagination"
                className="mt-8 flex flex-wrap items-center justify-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  ← Prev
                </button>
                <ol className="flex flex-wrap items-center gap-1">
                  {pageWindow.map((n, i) => {
                    const prev = pageWindow[i - 1];
                    const gap = prev !== undefined && n - prev > 1;
                    return (
                      <li key={n} className="flex items-center gap-1">
                        {gap && <span aria-hidden="true" className="px-1 text-muted-foreground">…</span>}
                        <button
                          type="button"
                          onClick={() => goToPage(n)}
                          aria-current={n === currentPage ? "page" : undefined}
                          aria-label={`Go to page ${n}`}
                          className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                            n === currentPage
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
                          }`}
                        >
                          {n}
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Next →
                </button>
              </nav>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BlogNeighborhoods;
