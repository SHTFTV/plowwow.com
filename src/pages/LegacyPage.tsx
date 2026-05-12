import { useLocation, Navigate, Link } from "react-router-dom";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import { truncateForMeta } from "@/lib/seo";

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
  const titleMatch = raw.match(/^Title:\s*(.+)$/m);
  const urlMatch = raw.match(/^URL Source:\s*(.+)$/m);
  const bodyMatch = raw.match(/Markdown Content:\s*\n([\s\S]*)$/);
  return {
    title: titleMatch?.[1]?.trim() ?? "PlowWow",
    sourceUrl: urlMatch?.[1]?.trim() ?? "",
    body: (bodyMatch?.[1] ?? raw).trim(),
  };
};

// Extract Q/A pairs from a "## Frequently Asked Questions" section.
// Each H3 (### question) is a question; following paragraphs (until the next
// H3 or H2) are the answer.
const extractFaqs = (body: string): { question: string; answer: string }[] => {
  const faqSectionMatch = body.match(
    /^##\s+Frequently Asked Questions\s*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/m,
  );
  if (!faqSectionMatch) return [];
  const section = faqSectionMatch[1];
  const faqs: { question: string; answer: string }[] = [];
  const re = /^###\s+(.+?)\s*\n([\s\S]*?)(?=\n###\s|\n##\s|$)/gm;
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

  const { title, body } = parseFrontmatter(raw);
  const description = truncateForMeta(
    body.replace(/[#>*_`\[\]()!]/g, " ").replace(/\s+/g, " ").trim(),
  );
  const faqs = extractFaqs(body);

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
    setMeta("description", description);

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
    return () => {
      document.getElementById(ldId)?.remove();
    };
  }, [title, description, faqs]);

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
          </div>
        </section>

        <section className="py-10 md:py-14">
          <article className="container max-w-3xl prose prose-slate dark:prose-invert prose-headings:font-heading prose-headings:font-black prose-h2:text-3xl prose-h3:text-xl prose-a:text-primary prose-img:rounded-xl prose-img:border prose-img:border-border max-w-none lg:prose-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </article>
        </section>

        {kind === "blog" && (
          <section className="py-10 border-t border-border">
            <div className="container max-w-3xl">
              <Link
                to="/blog"
                className="text-sm font-semibold text-primary hover:underline"
              >
                ← All blog posts
              </Link>
            </div>
          </section>
        )}

        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

export default LegacyPage;
