import { Link } from "react-router-dom";
import { blogPosts } from "@/generated/blog-posts";

const latestPosts = blogPosts.filter((post) => post.image).slice(0, 4);
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const HomeBlog = () => (
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {latestPosts.map((p) => (
          <Link
            key={p.slug}
            to={`/${p.slug}`}
            className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/50 hover:shadow-lg transition"
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img
                src={p.image ?? "/og-default.jpg"}
                alt={p.alt}
                title={p.title}
                loading="lazy"
                width={1280}
                height={720}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
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
    </div>
  </section>
);

export default HomeBlog;
