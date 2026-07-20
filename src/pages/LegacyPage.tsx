import { useLocation, Navigate, Link } from "react-router-dom";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import { truncateForMeta } from "@/lib/seo";
import { blogPosts } from "@/generated/blog-posts";
import { cityForBlogSlug, siblingsForBlogSlug } from "@/lib/internalLinks";

const blogDatesBySlug: Record<string, { publishedAt: string; updatedAt: string }> =
  Object.fromEntries(
    blogPosts.map((p) => [p.slug, { publishedAt: p.publishedAt, updatedAt: p.updatedAt }]),
  );

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// Extract a "## Changelog" section as a list of { date, note } entries.
// Each H3 (### 2026-07-17) is the date; following text (until next H3/H2) is
// the note. Falls back to bullet list items ("- 2026-07-17: note").
const extractChangelog = (body: string): { date: string; note: string }[] => {
  const secMatch = body.match(
    /(?:^|\n)##\s+(?:Changelog|What(?:'s|s)?\s+Changed|Revision(?:\s+History)?)\s*\n([\s\S]*?)(?=\n##\s|\n#\s(?!#)|$(?![\s\S]))/i,
  );
  if (!secMatch) return [];
  const section = secMatch[1];
  const entries: { date: string; note: string }[] = [];
  const h3Re = /(?:^|\n)###\s+(.+?)\s*\n([\s\S]*?)(?=\n###\s|\n##\s|$(?![\s\S]))/g;
  let m: RegExpExecArray | null;
  while ((m = h3Re.exec(section)) !== null) {
    const note = m[2].replace(/[#>*_`]/g, " ").replace(/\s+/g, " ").trim();
    entries.push({ date: m[1].trim(), note });
  }
  if (entries.length === 0) {
    const bulletRe = /^[-*]\s+(\d{4}-\d{2}-\d{2})\s*[:—-]\s*(.+)$/gm;
    let b: RegExpExecArray | null;
    while ((b = bulletRe.exec(section)) !== null) {
      entries.push({ date: b[1].trim(), note: b[2].trim() });
    }
  }
  return entries;
};

// Eagerly import every preserved markdown file as raw text at build time.
const pageFiles = import.meta.glob("/src/content/legacy/pages/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const blogFiles = import.meta.glob("/src/content/legacy/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const slugFromPath = (p: string) => p.split("/").pop()!.replace(/\.md$/, "");

const pageBySlug: Record<string, string> = {};
for (const [path, content] of Object.entries(pageFiles)) {
  pageBySlug[slugFromPath(path)] = content;
}
const blogBySlug: Record<string, string> = {};
for (const [path, content] of Object.entries(blogFiles)) {
  blogBySlug[slugFromPath(path)] = content;
}

export const legacyPageSlugs = Object.keys(pageBySlug).filter((s) => s !== "home");
export const legacyBlogSlugs = Object.keys(blogBySlug);

const parseFrontmatter = (raw: string) => {
  // Jina Reader emits "Title: ...\nURL Source: ...\n\nMarkdown Content:\n<body>"
  // Optional "Description: ..." line is honored when present.
  const titleMatch = raw.match(/^Title:\s*(.+)$/m);
  const urlMatch = raw.match(/^URL Source:\s*(.+)$/m);
  const descMatch = raw.match(/^Description:\s*(.+)$/m);
  const bodyMatch = raw.match(/Markdown Content:\s*\n([\s\S]*)$/);
  return {
    title: titleMatch?.[1]?.trim() ?? "PlowWow",
    sourceUrl: urlMatch?.[1]?.trim() ?? "",
    metaDescription: descMatch?.[1]?.trim() ?? "",
    body: (bodyMatch?.[1] ?? raw).trim(),
  };
};

// Extract Q/A pairs from a "## Frequently Asked Questions" section.
// Each H3 (### question) is a question; following paragraphs (until the next
// H3 or H2) are the answer.
const extractFaqs = (body: string): { question: string; answer: string }[] => {
  const faqSectionMatch = body.match(
    /(?:^|\n)##\s+Frequently Asked Questions\s*\n([\s\S]*?)(?=\n##\s|\n#\s(?!#)|$(?![\s\S]))/,
  );
  if (!faqSectionMatch) return [];
  const section = faqSectionMatch[1];
  const faqs: { question: string; answer: string }[] = [];
  const re = /(?:^|\n)###\s+(.+?)\s*\n([\s\S]*?)(?=\n###\s|\n##\s|$(?![\s\S]))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const question = m[1].trim();
    const answer = m[2]
      .replace(/[#>*_`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (question && answer) faqs.push({ question, answer });
  }
  return faqs;
};

type LegacyPageProps = { kind: "page" | "blog" };

const LegacyPage = ({ kind }: LegacyPageProps) => {
  const location = useLocation();
  const slug = location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  const map = kind === "blog" ? blogBySlug : pageBySlug;
  const raw = map[slug];

  if (!raw) return <Navigate to="/" replace />;

  const { title, body, metaDescription } = parseFrontmatter(raw);
  const description = metaDescription
    ? truncateForMeta(metaDescription)
    : truncateForMeta(
        body.replace(/[#>*_`\[\]()!]/g, " ").replace(/\s+/g, " ").trim(),
      );
  const faqs = extractFaqs(body);
  const changelog = kind === "blog" ? extractChangelog(body) : [];
  const dates = kind === "blog" ? blogDatesBySlug[slug] : undefined;
  const wasUpdated =
    !!dates && !!dates.updatedAt && dates.updatedAt !== dates.publishedAt;
  const readingMinutes =
    kind === "blog"
      ? Math.max(
          1,
          Math.round(
            body.replace(/[#>*_`\[\]()!]/g, " ").trim().split(/\s+/).filter(Boolean).length / 220,
          ),
        )
      : 0;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const setProp = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const setCanonical = (href: string) => {
      let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.rel = "canonical";
        document.head.appendChild(el);
      }
      el.href = href;
    };
    setMeta("description", description);
    const origin =
      typeof window !== "undefined"
        ? window.location.origin.replace(/\/+$/, "")
        : "https://plowwow.com";
    const path = `/${slug}/`;
    const absoluteUrl = `${origin}${path}`;
    // Prefer the post's inline hero image; fall back to a per-slug hero, then a
    // guaranteed-reachable branded OG default so every share always resolves an image.
    const heroFromBody = body.match(/!\[[^\]]*\]\((\/[^)\s]+)\)/)?.[1];
    const heroCandidate =
      heroFromBody ||
      (kind === "blog" ? `/blog-images/${slug}.jpg` : null) ||
      "/og-default.jpg";
    const absoluteImage = heroCandidate.startsWith("http")
      ? heroCandidate
      : `${origin}${heroCandidate}`;
    // Guarantee non-empty title/description for every share card.
    const safeTitle = (title && title.trim()) || "PlowWow — Snow Removal in Greater Vancouver";
    const safeDescription =
      (description && description.trim()) ||
      "24/7 snow plowing, salting, and de-icing for homes, strata, and commercial properties across Greater Vancouver, BC.";
    setMeta("description", safeDescription);
    setProp("og:title", safeTitle);
    setProp("og:description", safeDescription);
    setProp("og:url", absoluteUrl);
    setProp("og:type", kind === "blog" ? "article" : "website");
    setProp("og:site_name", "PlowWow");
    setProp("og:locale", "en_CA");
    setProp("og:image", absoluteImage);
    setProp("og:image:secure_url", absoluteImage);
    setProp("og:image:width", "1200");
    setProp("og:image:height", "630");
    setProp("og:image:alt", safeTitle);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:site", "@plowwow");
    setMeta("twitter:creator", "@plowwow");
    setMeta("twitter:title", safeTitle);
    setMeta("twitter:description", safeDescription);
    setMeta("twitter:image", absoluteImage);
    setMeta("twitter:image:alt", safeTitle);
    setCanonical(absoluteUrl);

    // Remove any stale article time meta so non-blog pages don't inherit them.
    document
      .querySelectorAll('meta[property="article:published_time"], meta[property="article:modified_time"]')
      .forEach((el) => el.remove());
    const dates = kind === "blog" ? blogDatesBySlug[slug] : undefined;
    if (dates) {
      setProp("article:published_time", dates.publishedAt);
      setProp("article:modified_time", dates.updatedAt || dates.publishedAt);
    }


    // FAQPage JSON-LD for SEO / AEO / LLM grounding.
    const ldId = "legacy-page-faq-jsonld";
    document.getElementById(ldId)?.remove();
    if (faqs.length > 0) {
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.id = ldId;
      ld.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      });
      document.head.appendChild(ld);
    }

    // Article + BreadcrumbList JSON-LD for blog posts. Hero image (when a
    // matching /blog-images/<slug>.jpg exists in /public) is included on the
    // Article for richer SEO/AEO/LLM grounding.
    const articleId = "legacy-page-article-jsonld";
    const crumbId = "legacy-page-breadcrumb-jsonld";
    document.getElementById(articleId)?.remove();
    document.getElementById(crumbId)?.remove();
    if (kind === "blog") {
      // Detect inline hero image from the markdown body (first `![alt](path)`).
      const imgMatch = body.match(/!\[([^\]]*)\]\((\/[^)\s]+)\)/);
      const heroPath = imgMatch?.[2];
      const heroAlt = imgMatch?.[1] ?? title;
      const art = document.createElement("script");
      art.type = "application/ld+json";
      art.id = articleId;
      art.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title.replace(/\s*\|\s*PlowWow.*$/i, ""),
        description,
        url: absoluteUrl,
        ...(heroPath
          ? {
              image: {
                "@type": "ImageObject",
                url: heroPath.startsWith("http") ? heroPath : `${origin}${heroPath}`,
                caption: heroAlt,
              },
            }
          : { image: absoluteImage }),
        author: {
          "@type": "Person",
          name: "PlowWow Team",
          url: "https://plowwow.com/author/plowwow-team/",
        },
        publisher: {
          "@type": "Organization",
          name: "PlowWow",
          url: "https://plowwow.com/",
          logo: {
            "@type": "ImageObject",
            url: "https://plowwow.com/icon-192.png",
          },
        },
        inLanguage: "en-CA",
        ...(dates
          ? {
              datePublished: dates.publishedAt,
              dateModified: dates.updatedAt || dates.publishedAt,
            }
          : {}),
        mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl },
        timeRequired: `PT${readingMinutes}M`,
      });
      document.head.appendChild(art);

      const crumb = document.createElement("script");
      crumb.type = "application/ld+json";
      crumb.id = crumbId;
      crumb.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://plowwow.com/" },
          { "@type": "ListItem", position: 2, name: "Blog", item: "https://plowwow.com/blog/" },
          {
            "@type": "ListItem",
            position: 3,
            name: title.replace(/\s*\|\s*PlowWow.*$/i, ""),
            item: absoluteUrl,
          },
        ],
      });
      document.head.appendChild(crumb);

      // SnowRemovalService / LocalBusiness block for neighborhood posts.
      const svcId = "legacy-page-service-jsonld";
      document.getElementById(svcId)?.remove();
      const areaMatch = title.match(/^(.*?)(?:\s*[-–|]\s*|\s+in\s+|\s+snow)/i);
      const areaName = areaMatch?.[1]?.trim() || title.replace(/\s*\|\s*PlowWow.*$/i, "");
      const svc = document.createElement("script");
      svc.type = "application/ld+json";
      svc.id = svcId;
      svc.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": ["LocalBusiness", "SnowRemovalService"],
        "@id": `${absoluteUrl}#localbusiness`,
        name: `PlowWow Snow Removal — ${areaName}`,
        url: absoluteUrl,
        telephone: "+1-604-761-1518",
        priceRange: "$$",
        image: heroPath ? (heroPath.startsWith("http") ? heroPath : `${origin}${heroPath}`) : absoluteImage,
        logo: "https://plowwow.com/icon-192.png",
        areaServed: { "@type": "Place", name: areaName },
        provider: { "@id": "https://plowwow.com/#organization" },
        serviceType: "Snow Removal, De-Icing & Salting",
        address: { "@type": "PostalAddress", addressRegion: "BC", addressCountry: "CA" },
        aggregateRating: (() => {
          try {
            const raw = typeof window !== "undefined" ? window.localStorage.getItem("plowwow.seoSettings.v1") : null;
            const s = raw ? JSON.parse(raw) : null;
            return {
              "@type": "AggregateRating",
              ratingValue: s?.ratingValue || "4.9",
              reviewCount: s?.reviewCount || "47",
            };
          } catch {
            return { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "47" };
          }
        })(),
        sameAs: (() => {
          try {
            const raw = typeof window !== "undefined" ? window.localStorage.getItem("plowwow.seoSettings.v1") : null;
            const s = raw ? JSON.parse(raw) : null;
            const arr = Array.isArray(s?.sameAs) ? s.sameAs.filter((u: string) => /^https?:\/\//i.test(u)) : [];
            return arr.length ? arr : undefined;
          } catch {
            return undefined;
          }
        })(),
      });
      document.head.appendChild(svc);
    }
    return () => {
      document.getElementById(ldId)?.remove();
      document.getElementById(articleId)?.remove();
      document.getElementById(crumbId)?.remove();
      document.getElementById("legacy-page-service-jsonld")?.remove();
    };
  }, [title, description, faqs, kind, slug, body, readingMinutes]);



  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-14 md:py-20 bg-gradient-to-b from-muted/40 to-background">
          <div className="container max-w-3xl">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">
              {kind === "blog" ? "From the PlowWow Blog" : "PlowWow"}
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
              {title.replace(/\s*\|\s*PlowWow.*$/i, "")}
            </h1>
            {kind === "blog" && dates && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <time
                  dateTime={dates.publishedAt}
                  className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-black uppercase tracking-wider text-primary"
                >
                  Published {formatDate(dates.publishedAt)}
                </time>
                {wasUpdated && (
                  <time
                    dateTime={dates.updatedAt}
                    title={`Last updated on ${formatDate(dates.updatedAt)}`}
                    className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Updated {formatDate(dates.updatedAt)}
                  </time>
                )}
                <span
                  aria-label={`Estimated reading time ${readingMinutes} minutes`}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {readingMinutes} min read
                </span>
              </div>
            )}
          </div>
        </section>

        {kind === "blog" && wasUpdated && dates && (
          <section className="pt-2 pb-4">
            <div className="container max-w-3xl">
              <aside
                aria-label="What changed in this post"
                className="rounded-2xl border border-border bg-muted/40 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                    What changed
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Revised {formatDate(dates.updatedAt)} · originally published{" "}
                    {formatDate(dates.publishedAt)}
                  </span>
                </div>
                {changelog.length > 0 ? (
                  <ul className="space-y-2 text-sm text-foreground">
                    {changelog.map((c, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                          {c.date}
                        </span>
                        <span className="flex-1">{c.note}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This post was revised on {formatDate(dates.updatedAt)} with the latest
                    pricing, response-time, and bylaw details from our field operations.
                  </p>
                )}
              </aside>
            </div>
          </section>
        )}

        <section className="py-10 md:py-14">
          <article className="container max-w-3xl prose prose-slate dark:prose-invert prose-headings:font-heading prose-headings:font-black prose-h2:text-3xl prose-h3:text-xl prose-a:text-primary prose-img:rounded-xl prose-img:border prose-img:border-border max-w-none lg:prose-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </article>
        </section>

        {kind === "blog" && (() => {
          const parentCity = cityForBlogSlug(slug);
          const siblings = siblingsForBlogSlug(slug, 4);
          return (
            <>
              {(parentCity || siblings.length > 0) && (
                <section className="py-10 border-t border-border bg-muted/30">
                  <div className="container max-w-3xl">
                    <h2 className="text-xl font-black text-foreground mb-4">
                      Related {parentCity ? `${parentCity.name} ` : ""}snow removal pages
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {parentCity && (
                        <Link
                          to={parentCity.path}
                          className="block rounded-xl border border-primary/40 bg-primary/5 p-4 hover:border-primary hover:bg-primary/10 transition-colors"
                        >
                          <span className="text-xs uppercase tracking-wider font-bold text-primary">
                            City hub
                          </span>
                          <p className="mt-1 font-bold text-foreground">
                            {parentCity.name} snow removal &amp; de-icing →
                          </p>
                        </Link>
                      )}
                      <Link
                        to="/locations"
                        className="block rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors"
                      >
                        <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                          Service map
                        </span>
                        <p className="mt-1 font-bold text-foreground">
                          All PlowWow service areas →
                        </p>
                      </Link>
                      {siblings.map((s) => (
                        <Link
                          key={s.slug}
                          to={`/${s.slug}`}
                          className="block rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors"
                        >
                          <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                            Nearby
                          </span>
                          <p className="mt-1 text-sm font-semibold text-foreground leading-snug">
                            {s.title}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}
              <section className="py-10 border-t border-border">
                <div className="container max-w-3xl flex flex-wrap items-center justify-between gap-4">
                  <Link to="/blog" className="text-sm font-semibold text-primary hover:underline">
                    ← All blog posts
                  </Link>
                  <Link
                    to="/quote"
                    className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90"
                  >
                    Get a free snow removal quote →
                  </Link>
                </div>
              </section>
            </>
          );
        })()}

        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

export default LegacyPage;
