import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { blogPosts } from "@/generated/blog-posts";
import { fetchPublicPosts, type PostSummary } from "@/lib/public-posts";

const legacyPosts = blogPosts.map((post) => ({
  slug: post.slug,
  href: `/${post.slug}`,
  title: post.title,
  publishedAt: post.publishedAt,
  updatedAt: post.updatedAt || null,
  image: post.image,
  alt: post.alt,
  excerpt: post.blurb,
}));

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "America/Vancouver",
});

export default function HomeBlog() {
  const [publicPosts, setPublicPosts] = useState<PostSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicPosts(undefined, controller.signal).then(setPublicPosts).catch((error) => {
      if (!controller.signal.aborted) console.error("Could not load homepage articles", error);
    });
    return () => controller.abort();
  }, []);

  const posts = new Map(legacyPosts.map((post) => [post.slug, post]));
  for (const post of publicPosts) {
    if (!posts.has(post.slug)) {
      posts.set(post.slug, {
        slug: post.slug,
        href: `/blog/${post.slug}`,
        title: post.title,
        publishedAt: post.published_at,
        updatedAt: null,
        image: post.image_url,
        alt: post.image_alt ?? "",
        excerpt: post.excerpt ?? "",
      });
    }
  }
  const latest = [...posts.values()]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 4);

  return (
    <section className="py-16 md:py-24 bg-muted/30" aria-labelledby="home-blog-heading">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">FROM THE PLOWWOW BLOG</p>
            <h2 id="home-blog-heading" className="text-3xl md:text-5xl font-bold">Fresh tracks. Useful reads.</h2>
            {latest[0] && (
              <p className="mt-4 text-sm font-semibold">
                Latest article: <time dateTime={latest[0].publishedAt}>{formatDate(latest[0].publishedAt)}</time>
              </p>
            )}
          </div>
          <Link to="/blog" className="text-primary font-bold">Explore all stories →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {latest.map((post) => (
            <Link key={post.slug} to={post.href} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card hover:shadow-lg">
              <img
                src={post.image ?? "/og-default.jpg"}
                alt={post.alt}
                loading="lazy"
                width="1280"
                height="720"
                className={post.slug === "abbotsford-snow-estimate-sharing-review"
                  ? "aspect-video w-full object-contain bg-[#071b35]"
                  : "aspect-video w-full object-cover"}
              />
              <div className="p-5 flex flex-col flex-1">
                <p className="text-sm font-bold text-primary">
                  Published <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                </p>
                {post.updatedAt && post.updatedAt !== post.publishedAt && (
                  <p className="text-xs mt-2">Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time></p>
                )}
                <h3 className="mt-4 text-xl font-bold leading-tight">{post.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground flex-1">{post.excerpt}</p>
                <span className="mt-5 text-primary font-semibold">Read the story →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
