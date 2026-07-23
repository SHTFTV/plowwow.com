import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { blogPosts } from "@/generated/blog-posts";
import HomeBlogDiagnostics from "@/components/HomeBlogDiagnostics";

const latestHeroPosts = blogPosts.filter((post) => post.hasCustomHero).slice(0, 4);
const fallbackSlugs = latestHeroPosts.map((p) => p.slug);
const postBySlug = new Map(blogPosts.map((post) => [post.slug, post]));

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

type SyncStatus = {
  source: "blog-index" | "sitemap" | "build-fallback";
  generatedAt?: string;
  error?: string;
};

const HomeBlog = () => {
  const [carouselSlugs, setCarouselSlugs] = useState<string[]>(fallbackSlugs);
  const [imageVersion, setImageVersion] = useState<string>(String(Date.now()));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ source: "build-fallback" });

  useEffect(() => {
    let cancelled = false;

    const apply = (
      slugs: string[],
      source: SyncStatus["source"],
      generatedAt?: string,
      error?: string,
    ) => {
      if (cancelled) return;
      const fresh = slugs.filter((slug) => postBySlug.has(slug)).slice(0, 4);
      if (fresh.length === 4) setCarouselSlugs(fresh);
      if (generatedAt) setImageVersion(encodeURIComponent(generatedAt));
      setSyncStatus({ source, generatedAt, error });
    };

    // Cached, parsed sitemap fallback. sessionStorage keeps it across route
    // navigations without re-fetching or re-parsing XML. TTL = 10 minutes.
    const SITEMAP_CACHE_KEY = "plowwow.homeblog.sitemap.v1";
    const SITEMAP_CACHE_TTL_MS = 10 * 60 * 1000;

    type SitemapCache = { slugs: string[]; lastmod?: string; cachedAt: number };

    const readSitemapCache = (): SitemapCache | null => {
      try {
        const raw = sessionStorage.getItem(SITEMAP_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as SitemapCache;
        if (Date.now() - parsed.cachedAt > SITEMAP_CACHE_TTL_MS) return null;
        return parsed;
      } catch { return null; }
    };
    const writeSitemapCache = (cache: SitemapCache) => {
      try { sessionStorage.setItem(SITEMAP_CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
    };

    const loadFromSitemap = async (rootError: string) => {
      const cached = readSitemapCache();
      if (cached) {
        apply(cached.slugs, "sitemap", cached.lastmod, `${rootError} (cached)`);
        return;
      }
      try {
        const res = await fetch(`/sitemap-blog.xml?_cb=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
        const xml = await res.text();
        const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];
        const parsed = urlBlocks
          .map((m) => {
            const loc = m[1].match(/<loc>([^<]+)<\/loc>/)?.[1] ?? "";
            const lastmod = m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
            const slug = loc.replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "");
            return { slug, lastmod };
          })
          .filter((p) => postBySlug.has(p.slug));
        const slugs = parsed.map((p) => p.slug);
        const lastmod = parsed[0]?.lastmod;
        writeSitemapCache({ slugs, lastmod, cachedAt: Date.now() });
        apply(slugs, "sitemap", lastmod, rootError);
      } catch (err) {
        if (!cancelled) {
          setSyncStatus({ source: "build-fallback", error: `${rootError}; sitemap: ${String(err)}` });
        }
      }
    };

    fetch(`/blog-index.json?_cb=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((index: { carousel?: string[]; generatedAt?: string }) => {
        if (cancelled) return;
        if (!Array.isArray(index.carousel)) {
          return loadFromSitemap("blog-index.json missing carousel");
        }
        apply(index.carousel, "blog-index", index.generatedAt);
      })
      .catch((err) => {
        void loadFromSitemap(`blog-index.json: ${String(err?.message ?? err)}`);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const latestPosts = useMemo(
    () => carouselSlugs.map((slug) => postBySlug.get(slug)).filter(Boolean).slice(0, 4),
    [carouselSlugs],
  );
  const renderedSlugs = latestPosts.map((p) => p!.slug);

  return (
    <section className="py-16 md:py-24 bg-muted/30" aria-labelledby="home-blog-heading">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-14">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">
              From the PlowWow Blog
            </p>
            <h2
              id="home-blog-heading"
              className="text-3xl md:text-5xl font-black text-foreground leading-tight"
            >
              Local snow & ice insights from across Greater Vancouver
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Neighborhood-specific guides on bylaws, response times, pricing, and how
              PlowWow keeps strata, commercial, and residential properties safe all winter.
            </p>
          </div>
          <Link
            to="/blog"
            className="self-start md:self-auto inline-flex items-center text-sm font-semibold text-primary hover:underline"
          >
            View all posts →
          </Link>
        </div>

        <div
          data-testid="blog-sync-status"
          className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold"
          aria-live="polite"
        >
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              syncStatus.source === "blog-index"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : syncStatus.source === "sitemap"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-destructive/10 text-destructive"
            }`}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {syncStatus.source === "blog-index" && "Blog index synced"}
            {syncStatus.source === "sitemap" && "Sitemap fallback"}
            {syncStatus.source === "build-fallback" && "Using build snapshot"}
          </span>
          {syncStatus.generatedAt && (
            <span className="text-muted-foreground">
              Last blog index sync:{" "}
              <time dateTime={syncStatus.generatedAt}>
                {new Date(syncStatus.generatedAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </span>
          )}
          {syncStatus.error && (
            <span className="text-muted-foreground" title={syncStatus.error}>
              ({syncStatus.error.slice(0, 60)})
            </span>
          )}
        </div>

        <div
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Latest blog posts"
        >
          {latestPosts.map((p) => p && (
            <Link
              key={p.slug}
              to={`/${p.slug}`}
              className="group flex min-w-[82%] snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50 hover:shadow-lg sm:min-w-[calc(50%-0.75rem)] lg:min-w-[calc(25%-1.125rem)]"
            >
              <div className="aspect-video overflow-hidden bg-muted">
                <img
                  src={`${p.image ?? "/og-default.jpg"}?v=${imageVersion}`}
                  alt={p.alt}
                  title={p.title}
                  loading="lazy"
                  width={1280}
                  height={720}
                  onError={(e) => {
                    // Build-time fallback: any stale/missing hero URL swaps to
                    // the mascot-composited default so the carousel never
                    // shows a non-mascot placeholder.
                    const img = e.currentTarget;
                    const fallback = `/og-default.jpg?v=${imageVersion}`;
                    if (!img.src.includes("/og-default.jpg")) img.src = fallback;
                  }}
                  className="h-full w-full object-cover object-right-bottom transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
                    Published · {formatDate(p.publishedAt)}
                  </span>
                  {p.updatedAt && p.updatedAt !== p.publishedAt && (
                    <span
                      title={`Updated on ${formatDate(p.updatedAt)} (originally published ${formatDate(p.publishedAt)})`}
                      aria-label={`Updated on ${formatDate(p.updatedAt)}`}
                      className="inline-flex items-center gap-1 rounded-full border border-secondary/40 bg-secondary/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-secondary-foreground cursor-help"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
                      Updated · {formatDate(p.updatedAt)}
                    </span>
                  )}
                </div>
                <time dateTime={p.publishedAt} className="sr-only">
                  Published {formatDate(p.publishedAt)}
                </time>
                {p.updatedAt && p.updatedAt !== p.publishedAt && (
                  <time dateTime={p.updatedAt} className="sr-only">
                    Updated {formatDate(p.updatedAt)}
                  </time>
                )}
                <h3 className="mt-1 text-lg font-bold text-foreground leading-snug">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground flex-1">{p.blurb}</p>
                <span className="mt-4 text-sm font-semibold text-primary group-hover:underline">
                  Read more →
                </span>
              </div>
            </Link>
          ))}
        </div>
        <HomeBlogDiagnostics renderedSlugs={renderedSlugs} />
      </div>
    </section>
  );
};

export default HomeBlog;
