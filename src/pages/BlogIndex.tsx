import { Link } from "react-router-dom";
import { useEffect } from "react";
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

const BlogIndex = () => {
  useEffect(() => {
    document.title = "PlowWow Blog — Snow Removal Insights, Neighborhoods & Strata Tips";
  }, []);

  const posts = [...legacyBlogSlugs].sort();

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
          <div className="container max-w-4xl grid md:grid-cols-2 gap-4">
            {posts.map((slug) => (
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
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BlogIndex;
