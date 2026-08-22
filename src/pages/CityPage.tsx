import { Link, useParams } from "react-router-dom";
import { MapPin, Phone, ShieldCheck, Snowflake, Truck, Clock } from "lucide-react";
import NotFound from "./NotFound";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import CityMap from "@/components/CityMap";
import CityDeepDive from "@/components/CityDeepDive";
import RelatedCities from "@/components/city/RelatedCities";
import DirectionsCard from "@/components/city/DirectionsCard";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buildCityCopy } from "@/data/cityContent";
import { getCityBySlug } from "@/data/cities";
import { getLocationDeep } from "@/data/locations";
import { postsForCity } from "@/lib/internalLinks";
import { truncateForMeta } from "@/lib/seo";

const ORIGIN = "https://plowwow.com";
const PHONE = "+1-604-761-1518";

const CityPage = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const normalizedSlug = citySlug?.replace(/\/+$/, "");
  const city = normalizedSlug ? getCityBySlug(normalizedSlug) : undefined;
  const locationDeep = normalizedSlug ? getLocationDeep(normalizedSlug) : undefined;
  if (!city) return <NotFound />;

  const url = `${ORIGIN}/${city.slug}`;
  const pageTitle = `${city.name} Snow Removal & De-Icing | PlowWow`;
  const pageDescription = truncateForMeta(
    `${city.intro} Snow plowing, snow clearing, salting and de-icing for applicable properties in ${city.name}, BC.`,
  );
  const mergedFaqs = locationDeep ? [...locationDeep.faq, ...city.faqs] : city.faqs;
  const { sections: copySections } = buildCityCopy(city);
  const neighborhoodPosts = postsForCity(city.slug).slice(0, 9);

  if (typeof document !== "undefined") {
    document.title = pageTitle;
    const setMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta('meta[name="description"]', "name", "description", pageDescription);
    setMeta('meta[property="og:title"]', "property", "og:title", pageTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", pageDescription);
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", "PlowWow");
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
  }

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${ORIGIN}/#organization`,
        name: "PlowWow",
        url: `${ORIGIN}/`,
        telephone: PHONE,
        areaServed: { "@type": "AdministrativeArea", name: "Lower Mainland, British Columbia" },
      },
      {
        "@type": "WebSite",
        "@id": `${ORIGIN}/#website`,
        url: `${ORIGIN}/`,
        name: "PlowWow",
        publisher: { "@id": `${ORIGIN}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: pageTitle,
        description: pageDescription,
        isPartOf: { "@id": `${ORIGIN}/#website` },
        about: { "@id": `${url}#service` },
      },
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: `Snow Removal & De-Icing in ${city.name}`,
        serviceType: "Snow plowing, snow clearing, salting and de-icing",
        provider: { "@id": `${ORIGIN}/#organization` },
        areaServed: { "@type": "City", name: `${city.name}, ${city.province}` },
        url,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Service Areas", item: `${ORIGIN}/locations` },
          { "@type": "ListItem", position: 3, name: city.name, item: url },
        ],
      },
      ...(mergedFaqs.length
        ? [{
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            mainEntity: mergedFaqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }]
        : []),
    ],
  };

  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <TopBar />
      <Navbar />
      <main>
        <section className="bg-[#0d2a4a] text-white">
          <div className="container py-20 md:py-28">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground font-bold px-4 py-1.5 rounded-full text-sm mb-5">
                <Snowflake className="w-4 h-4" /> Lower Mainland snow & ice service
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-5">
                Snow Removal & De-Icing in {city.name}, BC
              </h1>
              <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl">{city.intro}</p>
              <div className="flex flex-wrap gap-4 mb-9">
                <Button asChild size="lg" className="rounded-full font-bold px-8">
                  <Link to={`/${city.slug}/quote`}>Request a Quote</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full font-bold px-8 bg-white/10 text-white border-white">
                  <a href="tel:6047611518"><Phone className="w-5 h-5 mr-2" />604-761-1518</a>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-semibold"><Clock className="w-4 h-4" />24/7 monitoring</div>
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-semibold"><ShieldCheck className="w-4 h-4" />WorkSafeBC coverage</div>
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-semibold"><Truck className="w-4 h-4" />GPS-tracked fleet</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14" id="local-orientation">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-3xl md:text-4xl font-black mb-3">{city.name} local orientation</h2>
              <p className="text-muted-foreground">City Hall is pinned for geographic orientation. This does not represent a PlowWow office location.</p>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <CityMap cityName={city.name} province={city.province} cityHall={city.cityHall} />
              <DirectionsCard cityName={city.name} province={city.province} cityHall={city.cityHall} />
            </div>
          </div>
        </section>

        <section className="py-14 bg-muted/30" id="neighborhoods">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-black mb-5">Neighbourhoods and property areas in {city.name}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {city.neighborhoods.map((n) => (
                <article key={n.name} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{n.name}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{n.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16" id="city-content">
          <div className="container max-w-3xl">
            {copySections.map((s) => (
              <article id={s.id} key={s.id} className="mb-10">
                <h2 className="text-2xl md:text-3xl font-black mb-4">{s.heading}</h2>
                {s.paragraphs.map((p, i) => <p key={i} className="text-muted-foreground mb-3 leading-relaxed">{p}</p>)}
              </article>
            ))}
          </div>
        </section>

        {locationDeep && <CityDeepDive data={locationDeep} />}

        {mergedFaqs.length > 0 && (
          <section className="py-16 bg-muted/30" id="faq">
            <div className="container max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-black mb-8">{city.name} snow removal FAQ</h2>
              <Accordion type="single" collapsible className="space-y-3">
                {mergedFaqs.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-5">
                    <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}

        {neighborhoodPosts.length > 0 && (
          <section className="py-14 border-t border-border">
            <div className="container">
              <h2 className="text-2xl md:text-3xl font-black mb-6">{city.name} neighbourhood snow guides</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {neighborhoodPosts.map((p) => (
                  <Link key={p.slug} to={`/${p.slug}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary">
                    <span className="text-xs uppercase font-bold text-primary">{city.name}</span>
                    <p className="mt-1 font-semibold">{p.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <RelatedCities citySlug={city.slug} cityName={city.name} count={6} />
        <div id={`${city.slug}-quote`}><ContactForm /></div>
      </main>
      <Footer />
    </div>
  );
};

export default CityPage;
