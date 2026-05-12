import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { legacyBlogSlugs } from "./LegacyPage";

const blogFiles = import.meta.glob("/src/content/legacy/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const titleFor = (slug: string) => {
  const path = Object.keys(blogFiles).find((p) => p.endsWith(`/${slug}.md`));
  if (!path) return slug;
  const raw = blogFiles[path];
  const m = raw.match(/^Title:\s*(.+)$/m);
  return (m?.[1] ?? slug).replace(/\s*\|\s*PlowWow.*$/i, "").trim();
};

const PAGE_SIZE = 8;

const BlogIndex = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const allPosts = useMemo(() => [...legacyBlogSlugs].sort(), []);

  const query = (searchParams.get("q") ?? "").trim();
  const normalizedQuery = query.toLowerCase();

  const posts = useMemo(() => {
    if (!normalizedQuery) return allPosts;
    return allPosts.filter((slug) => {
      const title = titleFor(slug).toLowerCase();
      return title.includes(normalizedQuery) || slug.includes(normalizedQuery);
    });
  }, [allPosts, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));

  const requested = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(requested)
    ? Math.min(Math.max(1, requested), totalPages)
    : 1;

  const start = (page - 1) * PAGE_SIZE;
  const visible = posts.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    document.title =
      page === 1
        ? "PlowWow Blog — Snow Removal Insights, Neighborhoods & Strata Tips"
        : `PlowWow Blog — Page ${page} of ${totalPages}`;
  }, [page, totalPages]);

  const goTo = (next: number) => {
    const params = new URLSearchParams(searchParams);
    if (next === 1) params.delete("page");
    else params.set("page", String(next));
    setSearchParams(params);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setQuery = (next: string) => {
    const params = new URLSearchParams(searchParams);
    const trimmed = next.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    // Searching always resets pagination back to page 1.
    params.delete("page");
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-16 md:py-20 bg-gradient-to-b from-muted/40 to-background">
          <div className="container max-w-4xl">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">
              PlowWow Journal
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-3">
              Blog
            </h1>
            <p className="text-muted-foreground text-lg">
              Neighborhood guides, strata snow-removal playbooks, and field notes from
              every PlowWow storm response.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container max-w-4xl">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts by title or slug…"
                aria-label="Search blog posts"
                className="w-full rounded-full border border-border bg-card pl-11 pr-11 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mb-6 text-sm text-muted-foreground flex-wrap gap-2">
              <span>
                {posts.length === 0 ? (
                  <>No posts match <strong className="text-foreground">"{query}"</strong></>
                ) : (
                  <>
                    Showing <strong className="text-foreground">{start + 1}</strong>–
                    <strong className="text-foreground">
                      {Math.min(start + PAGE_SIZE, posts.length)}
                    </strong>{" "}
                    of <strong className="text-foreground">{posts.length}</strong>
                    {query ? <> matching <strong className="text-foreground">"{query}"</strong></> : " posts"}
                  </>
                )}
              </span>
              <span>
                Page <strong className="text-foreground">{page}</strong> / {totalPages}
              </span>
            </div>

            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <p className="text-muted-foreground">
                  Try a different keyword, or{" "}
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="text-primary font-semibold hover:underline"
                  >
                    clear the search
                  </button>
                  .
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {visible.map((slug) => (
                  <Link
                    key={slug}
                    to={`/${slug}`}
                    className="group block rounded-2xl border border-border bg-card p-5 hover:border-primary hover:shadow-md transition-all"
                  >
                  <h2 className="font-heading font-bold text-lg text-foreground group-hover:text-primary leading-snug">
                    {titleFor(slug)}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    /{slug} →
                  </p>
                </Link>
              ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav
                aria-label="Blog pagination"
                className="mt-10 flex items-center justify-center gap-2 flex-wrap"
              >
                <button
                  type="button"
                  onClick={() => goTo(page - 1)}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                  const isActive = n === page;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => goTo(n)}
                      aria-current={isActive ? "page" : undefined}
                      className={`min-w-9 rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => goTo(page + 1)}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-4 h-4" />
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

export default BlogIndex;
