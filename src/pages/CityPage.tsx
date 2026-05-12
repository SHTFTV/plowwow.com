import { useParams, Navigate, Link } from "react-router-dom";
import { Phone, ShieldCheck, Truck, Clock, MapPin, Snowflake } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import CityMap from "@/components/CityMap";
import { buildCityCopy } from "@/data/cityContent";
import skidSteerImg from "@/assets/plowwow-skid-steer.png";
import f350Img from "@/assets/plowwow-f350-salter.png";
import crewImg from "@/assets/plowwow-crew.png";
import dozerImg from "@/assets/plowwow-dozer.png";
import walkBehindImg from "@/assets/plowwow-walk-behind-salter.png";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getCityBySlug, cities } from "@/data/cities";
import { truncateForMeta } from "@/lib/seo";

const CityPage = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  // Normalize: strip any trailing slashes from the route param before lookup
  const normalizedSlug = citySlug?.replace(/\/+$/, "");
  const city = normalizedSlug ? getCityBySlug(normalizedSlug) : undefined;

  if (!city) return <Navigate to="/" replace />;

  const pageTitle = `${city.tagline} | PlowWow`;
  const pageDescription = truncateForMeta(city.intro);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin.replace(/\/+$/, "")
      : "https://plowwow.com";
  // Canonical URL has no trailing slash for consistency
  const url = `${origin}/${city.slug}`;
  const ogImage = city.ogImage;
  const ogImageWidth = city.ogImageWidth ?? 1200;
  const ogImageHeight = city.ogImageHeight ?? 630;

  // Update document head (lightweight; no react-helmet needed)
  if (typeof document !== "undefined") {
    document.title = pageTitle;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const setProperty = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", pageDescription);
    setProperty("og:title", pageTitle);
    setProperty("og:description", pageDescription);
    setProperty("og:url", url);
    setProperty("og:image", ogImage);
    setProperty("og:image:width", String(ogImageWidth));
    setProperty("og:image:height", String(ogImageHeight));
    setProperty("og:image:alt", pageTitle);
    setProperty("og:type", "website");
    setProperty("twitter:card", "summary_large_image");
    setProperty("twitter:title", pageTitle);
    setProperty("twitter:description", pageDescription);
    setProperty("twitter:image", ogImage);
    setProperty("twitter:image:width", String(ogImageWidth));
    setProperty("twitter:image:height", String(ogImageHeight));
    setProperty("twitter:image:alt", pageTitle);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
  }

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `PlowWow Snow Removal — ${city.name}`,
    image: ogImage,
    url,
    telephone: "+1-604-761-1518",
    areaServed: { "@type": "City", name: `${city.name}, ${city.province}` },
    address: { "@type": "PostalAddress", addressLocality: city.name, addressRegion: city.province, addressCountry: "CA" },
    priceRange: "$$",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: city.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const otherCities = cities.filter((c) => c.slug !== city.slug);
  const { sections: copySections } = buildCityCopy(city);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <TopBar />
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-[#0d2a4a] text-white">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(247,148,29,0.25),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(56,114,191,0.45),transparent_55%)]"
          />
          <div className="container relative z-10 py-20 md:py-28">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground font-heading font-bold px-4 py-1.5 rounded-full text-sm mb-5 shadow-lg">
                <Snowflake className="w-4 h-4" /> Serving {city.name} 24/7
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-5">
                {city.tagline}
              </h1>
              <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl">{city.intro}</p>
              <div className="flex flex-wrap gap-4 mb-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-heading font-bold rounded-full text-lg px-8 shadow-xl"
                >
                  <a href={`#${city.slug}-quote`}>Get a Free Quote</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white hover:text-foreground font-heading font-bold rounded-full text-lg px-8"
                >
                  <a href="tel:6047611518" className="inline-flex items-center gap-2">
                    <Phone className="w-5 h-5" /> 604-761-1518
                  </a>
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl">
                {[
                  { icon: Clock, label: "24/7 Monitoring" },
                  { icon: ShieldCheck, label: "WorkSafeBC Insured" },
                  { icon: Truck, label: "GPS-Tracked Fleet" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 text-sm font-semibold"
                  >
                    <Icon className="w-4 h-4 text-secondary" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* City Map */}
        <section className="py-16" id="map">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
                {city.name} at a Glance
              </h2>
              <p className="text-muted-foreground">
                City Hall pinned for orientation, plus a quick link to live {city.name} weather.
              </p>
            </div>
            <CityMap cityName={city.name} province={city.province} cityHall={city.cityHall} />
          </div>
        </section>

        {/* Snowfall + Neighborhoods */}
        <section className="py-20" id="climate">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
                {city.name}'s Winter, by the Numbers
              </h2>
              <p className="text-muted-foreground">
                Typical monthly snowfall and the neighborhoods we dispatch first.
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-heading font-bold text-xl mb-1">Monthly Snowfall (cm)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Average accumulation across {city.name}.
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={city.snowfall}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="cm" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-heading font-bold text-xl mb-1">Priority Neighborhoods</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Where {city.name} crews dispatch first when a storm triggers.
                </p>
                <ul className="space-y-3">
                  {city.neighborhoods.map((n) => (
                    <li
                      key={n.name}
                      className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3"
                    >
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">{n.name}</p>
                        <p className="text-sm text-muted-foreground">{n.note}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Fleet showcase — visual break */}
        <section className="py-16 bg-muted/30" id="fleet">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
                The {city.name} Fleet
              </h2>
              <p className="text-muted-foreground">
                Right-sized iron for every {city.name} property — from highway-grade plow trucks
                to skid steers and walk-behind salters for tight courtyards.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { src: f350Img, label: `F-350 plow + V-box salter dispatched across ${city.name}` },
                { src: skidSteerImg, label: `Branded skid steer for ${city.name} loading docks & lots` },
                { src: dozerImg, label: `Tracked dozer for heavy ${city.name} accumulations` },
              ].map((img) => (
                <figure
                  key={img.label}
                  className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm"
                >
                  <img
                    src={img.src}
                    alt={img.label}
                    loading="lazy"
                    className="w-full h-56 object-cover"
                  />
                  <figcaption className="p-4 text-sm text-muted-foreground">
                    {img.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Long-form SEO/AEO/GEO/LLM content — unique per city */}
        <section className="py-16 bg-background" id="deep-dive">
          <div className="container max-w-3xl">
            {copySections.map((s, idx) => (
              <div key={s.id}>
                <article id={s.id} className="mb-10">
                  <h2 className="text-2xl md:text-3xl font-black text-foreground mb-4">
                    {s.heading}
                  </h2>
                  {s.paragraphs.map((p, i) => (
                    <p key={i} className="text-muted-foreground mb-3 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </article>
                {idx === Math.floor(copySections.length / 3) && (
                  <figure className="my-10 rounded-2xl overflow-hidden border border-border">
                    <img
                      src={crewImg}
                      alt={`PlowWow crew on a ${city.name} site after an overnight push`}
                      loading="lazy"
                      className="w-full h-64 md:h-80 object-cover"
                    />
                    <figcaption className="p-4 text-sm text-muted-foreground bg-card">
                      The {city.name} crew — same faces, every storm.
                    </figcaption>
                  </figure>
                )}
                {idx === Math.floor((copySections.length * 2) / 3) && (
                  <figure className="my-10 rounded-2xl overflow-hidden border border-border">
                    <img
                      src={walkBehindImg}
                      alt={`Walk-behind salter treating a ${city.name} walkway`}
                      loading="lazy"
                      className="w-full h-56 md:h-72 object-cover"
                    />
                    <figcaption className="p-4 text-sm text-muted-foreground bg-card">
                      Walk-behind salters finish what the trucks can't reach.
                    </figcaption>
                  </figure>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-muted/30">
          <div className="container max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
                {city.name} Snow Removal FAQ
              </h2>
              <p className="text-muted-foreground">Answers to the questions we hear most.</p>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {city.faqs.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-card border border-border rounded-xl px-5"
                >
                  <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Other cities */}
        <section className="py-14 border-t border-border">
          <div className="container">
            <h2 className="text-2xl font-black text-foreground mb-1">
              Other cities we plow
            </h2>
            <p className="text-muted-foreground mb-6">
              From Vancouver to Abbotsford — same crews, same response standards.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/burnaby"
                className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Burnaby
              </Link>
              {otherCities.map((c) => (
                <Link
                  key={c.slug}
                  to={`/${c.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <div id={`${city.slug}-quote`}>
          <ContactForm />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CityPage;
