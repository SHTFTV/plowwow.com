import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { legacyBlogSlugs } from "@/legacy-slug-list";
import NotFound from "./NotFound";

// Currently a single team author. Adding another author is as easy as
// adding an entry here and (optionally) tagging posts via a `postsBy` map.
const AUTHORS: Record<
  string,
  {
    name: string;
    role: string;
    bio: string;
    twitter?: string;
  }
> = {
  "plowwow-team": {
    name: "PlowWow Team",
    role: "Snow operations & strata liability writers",
    bio: "The PlowWow editorial team writes about neighborhood snow contracts, strata liability, and seasonal operations across Metro Vancouver and the Fraser Valley. Guides are reviewed by our field operations leads before publishing.",
    twitter: "@plowwow",
  },
};

const humanize = (slug: string) =>
  slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const AuthorPage = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const author = AUTHORS[slug];

  const posts = useMemo(() => {
    if (!author) return [];
    // All blog posts are currently authored by the team.
    return legacyBlogSlugs.slice().sort();
  }, [author]);

  useEffect(() => {
    if (!author) return;
    const url = `https://plowwow.com/author/${slug}/`;
    document.title = `${author.name} — PlowWow`;
    const setMeta = (name: string, content: string, property = false) => {
      const key = property ? "property" : "name";
      let el = document.head.querySelector(
        `meta[${key}="${name}"]`,
      ) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(key, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    const desc = `${author.name} — ${author.role}. ${author.bio.slice(0, 140)}`;
    setMeta("description", desc);
    setMeta("og:title", `${author.name} — PlowWow`, true);
    setMeta("og:description", desc, true);
    setMeta("og:url", url, true);
    setMeta("og:type", "profile", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", `${author.name} — PlowWow`);
    setMeta("twitter:description", desc);

    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": "Person",
        name: author.name,
        description: author.bio,
        url,
        jobTitle: author.role,
        worksFor: { "@type": "Organization", name: "PlowWow", url: "https://plowwow.com/" },
        ...(author.twitter ? { sameAs: [`https://twitter.com/${author.twitter.replace(/^@/, "")}`] } : {}),
      },
      url,
    };
    const scriptId = "author-jsonld";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      script?.remove();
    };
  }, [author, slug]);

  if (!author) return <NotFound />;

  return (
    <>
      <Navbar />
      <main className="container py-16 max-w-4xl">
        <nav aria-label="Breadcrumb" className="text-sm opacity-70 mb-4">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span aria-hidden="true"> / </span>
          <Link to="/blog" className="hover:text-primary">Blog</Link>
          <span aria-hidden="true"> / </span>
          <span>{author.name}</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">{author.name}</h1>
          <p className="text-lg opacity-80">{author.role}</p>
          <p className="mt-4 max-w-2xl">{author.bio}</p>
        </header>

        <section aria-labelledby="posts-heading">
          <h2 id="posts-heading" className="text-2xl font-heading font-bold mb-4">
            Posts by {author.name}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {posts.map((s) => (
              <li key={s}>
                <Link
                  to={`/${s}/`}
                  className="block p-4 rounded-md border border-border hover:border-primary transition-colors"
                >
                  {humanize(s)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AuthorPage;
export const authorSlugs = Object.keys(AUTHORS);
