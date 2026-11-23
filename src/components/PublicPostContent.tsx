import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PostSummary, PublicPost } from "../lib/public-posts";

export function PublicPostCards({ posts }: { posts: PostSummary[] }) {
  return <div id="public-blog-posts">
    {posts.length > 0 && (
      <section className="container max-w-6xl pt-12" aria-label="Latest posts">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <a key={post.slug} href={`/blog/${post.slug}`} className="overflow-hidden rounded-xl border bg-card text-card-foreground hover:border-primary">
              <img src={post.image_url} alt={post.image_alt ?? ""} loading="lazy" className="aspect-[3/2] w-full object-cover" />
              <div className="p-5">
                <h2 className="text-xl font-bold">{post.title}</h2>
                {post.excerpt && <p className="mt-2 text-muted-foreground">{post.excerpt}</p>}
              </div>
            </a>
          ))}
        </div>
      </section>
    )}
  </div>;
}

export function PublicPostArticle({ post }: { post: PublicPost }) {
  const sources = (post.sources ?? []).filter(({ url }) => /^https?:\/\//i.test(url));
  return (
    <main id="main-content" tabIndex={-1} className="py-12">
      <article>
        <header className="container max-w-3xl">
          <a href="/blog" className="font-bold text-primary">← Blog</a>
          <h1 className="my-4 text-4xl font-black md:text-5xl">{post.title}</h1>
          <time dateTime={post.published_at} className="text-muted-foreground">
            {new Intl.DateTimeFormat("en-CA", { dateStyle: "long", timeZone: "America/Vancouver" }).format(new Date(post.published_at))}
          </time>
          <img src={post.image_url} alt={post.image_alt ?? ""} width={1536} height={1024} className="my-8 w-full rounded-xl" fetchPriority="high" />
        </header>
        <div className="container prose prose-slate dark:prose-invert lg:prose-lg !max-w-3xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body_md}</ReactMarkdown>
          {!!post.faq?.length && (
            <section aria-labelledby="post-faq">
              <h2 id="post-faq">Frequently asked questions</h2>
              {post.faq.map(({ q, a }) => (
                <details key={q} className="mb-3">
                  <summary className="cursor-pointer font-semibold">{q}</summary>
                  <ReactMarkdown>{a}</ReactMarkdown>
                </details>
              ))}
            </section>
          )}
          {sources.length > 0 && (
            <section aria-labelledby="post-sources">
              <h2 id="post-sources">Sources</h2>
              <ul>{sources.map(({ title, url }) => <li key={url}><a href={url}>{title || url}</a></li>)}</ul>
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
