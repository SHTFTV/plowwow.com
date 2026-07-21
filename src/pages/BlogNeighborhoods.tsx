// Neighborhood blog index. Filters all blog posts by parent city (or "Citywide"
// for posts with no city hub match). BreadcrumbList + ItemList JSON-LD included.

import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { blogPosts } from "@/generated/blog-posts";
import { cityForBlogSlug, cityHubs } from "@/lib/internalLinks";

const ALL = "all";
const CITYWIDE = "citywide";

const BlogNeighborhoods = () => {
  const [params, setParams] = useSearchParams();
  const active = params.get("city") ?? ALL;

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

  const filters = useMemo(() => {
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

  const visible = useMemo(() => {
    if (active === ALL) return blogPosts.slice().sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
    return grouped.get(active) ?? [];
  }, [active, grouped]);

  useEffect(() => {
    const title = "Neighborhood Snow Removal Blog | PlowWow";
    const desc =
      "Browse PlowWow's snow-removal guides by neighborhood across Metro Vancouver — Burnaby, Vancouver, Richmond, Coquitlam, Surrey and more.";
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
    const url = "https://plowwow.com/blog/neighborhoods/";
    setMeta("description", desc);
    setProp("og:title", title);
    setProp("og:description", desc);
    setProp("og:url", url);
    setProp("og:type", "website");
    let canon = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = url;

    const id = "blog-neighborhoods-jsonld";
    document.getElementById(id)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = id;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://plowwow.com/" },
            { "@type": "ListItem", position: 2, name: "Blog", item: "https://plowwow.com/blog/" },
            { "@type": "ListItem", position: 3, name: "Neighborhoods", item: url },
          ],
        },
        {
          "@type": "ItemList",
          itemListElement: visible.slice(0, 50).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `https://plowwow.com/${p.slug}/`,
            name: p.title.replace(/\s*\|\s*PlowWow.*$/i, ""),
          })),
        },
      ],
    });
    document.head.appendChild(ld);
    return () => { document.getElementById(id)?.remove(); };
  }, [visible]);

  const setCity = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === ALL) next.delete("city");
    else next.set("city", key);
    setParams(next, { replace: false });
  };

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
              Every PlowWow neighborhood guide, grouped by city. Filter by area, or view
              citywide topics that apply across Metro Vancouver.
            </p>

            <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by neighborhood">
              {filters.map((f) => {
                const isActive = active === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setCity(f.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
        </section>

        <section className="py-8 md:py-12">
          <div className="container max-w-6xl">
            {visible.length === 0 ? (
              <p className="text-muted-foreground">No posts in this neighborhood yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visible.map((p) => {
                  const hub = cityForBlogSlug(p.slug);
                  return (
                    <Link
                      key={p.slug}
                      to={`/${p.slug}`}
                      className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary transition-colors"
                    >
                      {p.image && (
                        <img
                          src={p.image}
                          alt={p.alt}
                          loading="lazy"
                          width={1200}
                          height={630}
                          className="aspect-[1200/630] w-full object-cover"
                        />
                      )}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">
                          {hub?.name ?? "Citywide"}
                        </div>
                        <h2 className="font-black text-foreground leading-snug group-hover:text-primary">
                          {p.title.replace(/\s*\|\s*PlowWow.*$/i, "")}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.blurb}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BlogNeighborhoods;
