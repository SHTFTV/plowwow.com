import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import { cityHubs, postsForCity } from "@/lib/internalLinks";
import { applyPageMeta } from "@/lib/pageMeta";

const Locations = () => {
  useEffect(() => {
    applyPageMeta({
      title: "Snow Removal Service Areas | PlowWow Metro Vancouver",
      description:
        "Every city and neighborhood PlowWow services across Metro Vancouver and the Fraser Valley — 24/7 strata, commercial and residential snow removal.",
      path: "/locations",
      ogImage: "https://plowwow.com/og-image.jpg",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "PlowWow Service Areas",
        url: "https://plowwow.com/locations",
        about: cityHubs.map((c) => ({
          "@type": "Place",
          name: `${c.name}, BC`,
          url: `https://plowwow.com${c.path}`,
        })),
      },
    });
  }, []);

  const cityBlocks = cityHubs
    .map((c) => ({ hub: c, posts: postsForCity(c.slug) }))
    .sort((a, b) => b.posts.length - a.posts.length);

  const total = cityBlocks.reduce((n, b) => n + b.posts.length, 0);

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-14 md:py-20 bg-gradient-to-b from-muted/40 to-background">
          <div className="container max-w-4xl">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">
              Service Areas
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-4">
              Every city &amp; neighborhood we plow across Metro Vancouver
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              {cityHubs.length} city hubs and {total} neighborhood guides. Click any
              location to see local dispatch details, strata &amp; commercial coverage,
              and seasonal contract options.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {cityHubs.map((c) => (
                <a
                  key={c.slug}
                  href={`#city-${c.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {c.name}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container max-w-5xl space-y-12">
            {cityBlocks.map(({ hub, posts }) => (
              <div key={hub.slug} id={`city-${hub.slug}`} className="scroll-mt-24">
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4 pb-3 border-b border-border">
                  <h2 className="text-2xl md:text-3xl font-black text-foreground">
                    <Link to={hub.path} className="hover:text-primary transition-colors">
                      {hub.name}, BC
                    </Link>
                  </h2>
                  <Link
                    to={hub.path}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    {hub.name} snow removal hub <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                {posts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    City-level dispatch coverage.{" "}
                    <Link to={hub.path} className="text-primary hover:underline">
                      See the {hub.name} page →
                    </Link>
                  </p>
                ) : (
                  <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {posts.map((p) => (
                      <li key={p.slug}>
                        <Link
                          to={`/${p.slug}`}
                          className="block h-full rounded-xl border border-border bg-card p-4 hover:border-primary hover:shadow-sm transition-all"
                        >
                          <span className="text-sm font-semibold text-foreground leading-snug">
                            {p.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

export default Locations;
