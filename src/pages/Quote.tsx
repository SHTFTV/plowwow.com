import { useEffect } from "react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";

const TITLE = "Get a Snow Removal Quote | PlowWow Metro Vancouver";
const DESCRIPTION =
  "Request a fixed seasonal snow removal quote for your Metro Vancouver strata, commercial or industrial property. 24/7 dispatch, GPS-logged salt runs, pet-safe de-icer.";
const CANONICAL = "https://www.plowwow.com/quote";

const Quote = () => {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = TITLE;
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
    setMeta("description", DESCRIPTION);
    setProp("og:title", TITLE);
    setProp("og:description", DESCRIPTION);
    setProp("og:url", CANONICAL);
    setProp("og:type", "website");
    setCanonical(CANONICAL);

    const ldId = "quote-page-jsonld";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: TITLE,
      description: DESCRIPTION,
      url: CANONICAL,
      mainEntity: {
        "@type": "LocalBusiness",
        name: "PlowWow Snow Removal",
        telephone: "+1-604-761-1518",
        email: "dispatch@plowwow.com",
        areaServed: "Metro Vancouver, BC",
      },
    });
    document.head.appendChild(ld);
    return () => {
      document.getElementById(ldId)?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-14 md:py-20 bg-gradient-to-b from-muted/40 to-background">
          <div className="container max-w-3xl">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">
              PlowWow
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
              Get a Metro Vancouver Snow Removal Quote
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Fixed seasonal pricing, 24/7 dispatch, GPS-logged service and pet-safe de-icer for strata, commercial and industrial properties across Metro Vancouver.
            </p>
          </div>
        </section>
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

export default Quote;
