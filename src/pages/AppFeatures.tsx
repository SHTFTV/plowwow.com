import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Brain, Camera, CloudSnow, DollarSign, FileBarChart, Gauge,
  Map as MapIcon, Receipt, Shield, Sparkles, Truck, Zap,
} from "lucide-react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SnowBackground from "@/components/intelligence/SnowBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "PlowWow App — Snow Removal Software for Contractors";
const DESCRIPTION =
  "Snow removal software for contractors: PWIE dispatch, Weather Brain forecasting, Salt-Scan AI, Wow-Shield vault, GPS tracking, QuickBooks sync.";
const PATH = "/app-features";

const setMeta = (name: string, content: string) => {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
  el.content = content;
};

const setProp = (property: string, content: string) => {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
  el.content = content;
};

const setCanonical = (href: string) => {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) { el = document.createElement("link"); el.rel = "canonical"; document.head.appendChild(el); }
  el.href = href;
};

const features = [
  { icon: Activity, h: "PWIE Dispatch", b: "Predictive Winter Intelligence Engine assigns crews before the storm hits." },
  { icon: Brain, h: "Weather Brain", b: "Hyper-local forecasting fused from Environment Canada, NOAA, and live radar." },
  { icon: Camera, h: "Salt-Scan AI", b: "Nano Banana 2 vision reads ice depth and recommends salt grams per m²." },
  { icon: Shield, h: "Wow-Shield™ Vault", b: "Time-stamped photos + GPS pins. Liability-proof slip-and-fall defense." },
  { icon: Truck, h: "Ghost Fleet GPS", b: "Anonymous tracked trucks routed by AI for fastest priority response." },
  { icon: Receipt, h: "Progress Billing", b: "Per-event invoices that match the storm record. No padding, no surprises." },
  { icon: FileBarChart, h: "QuickBooks Sync", b: "Two-way sync — invoices, payments, and customers stay in lockstep." },
  { icon: DollarSign, h: "Pay Now (CAD)", b: "PayPal-powered checkout for instant collections in Canadian dollars." },
  { icon: Gauge, h: "Plow-Meter & Stake-O-Meter", b: "Live job clocks and stake counts so crews and clients see the same data." },
  { icon: MapIcon, h: "Bylaw Reference", b: "BC pricing 2026 + every municipal bylaw built right into the app." },
  { icon: CloudSnow, h: "Storm Replay", b: "Rebuild any event minute-by-minute for insurer or strata audits." },
  { icon: Sparkles, h: "WOW Mascot UX", b: "Crew-friendly UI your team will actually open at 3 AM." },
];

const benefits = [
  { stat: "+38%", label: "Higher route efficiency", body: "PWIE auto-dispatch beats manual scheduling on every storm we've measured." },
  { stat: "−72%", label: "Fewer billing disputes", body: "Progress billing tied to storm logs ends the 'were you actually here?' calls." },
  { stat: "0", label: "Slip-and-fall losses", body: "Wow-Shield™ Vault customers haven't paid out a single claim." },
  { stat: "22 min", label: "Average dispatch ETA", body: "Ghost Fleet routing keeps strata and commercial first in line." },
];

const faqs = [
  {
    q: "What is the best snow removal software for contractors?",
    a: "The best snow removal software combines dispatch, GPS tracking, weather forecasting, liability documentation, and billing in one platform. PlowWow is built specifically for snow and ice contractors with modules like PWIE auto-dispatch, Weather Brain forecasting, Salt-Scan AI, Wow-Shield™ liability vault, Ghost Fleet GPS, and QuickBooks sync — all in a single login.",
  },
  {
    q: "How much does snow removal software cost?",
    a: "PlowWow snow removal software starts at $10 CAD per month for every 100,000 population in your service area. A contractor serving a 500,000-population area pays $50/month. All modules, unlimited crew seats, and QuickBooks integration are included with no hidden fees.",
  },
  {
    q: "Can snow removal software help prevent slip-and-fall liability claims?",
    a: "Yes. PlowWow's Wow-Shield™ Vault timestamps every photo, GPS pin, and service record to create court-ready proof of work. Our customers using the Vault have reported zero paid slip-and-fall claims because the evidence chain is impossible to dispute.",
  },
  {
    q: "Does snow removal dispatch software integrate with QuickBooks?",
    a: "Yes. PlowWow offers two-way QuickBooks sync so invoices, payments, and customer records stay in lockstep. You can also accept instant PayPal payments in Canadian dollars through the Pay Now module without switching apps.",
  },
  {
    q: "What features should I look for in snow removal management software?",
    a: "Look for auto-dispatch tied to weather triggers, GPS fleet tracking, photo liability documentation, progress billing tied to storm logs, QuickBooks integration, and a mobile-friendly interface your crews will actually use at 3 AM. PlowWow includes all of these in one platform.",
  },
  {
    q: "Is snow removal software better than spreadsheets and whiteboards?",
    a: "Spreadsheets and whiteboards break down under real winter pressure. Snow removal software automates dispatch when trigger depth is reached, optimizes routes in real time, stores liability-proof photos, and bills per-event automatically. PlowWow users report 38% higher route efficiency and 72% fewer billing disputes after switching from manual systems.",
  },
  {
    q: "How does GPS tracking work in snow removal apps?",
    a: "PlowWow's Ghost Fleet GPS tracks every truck continuously, feeding live location data into route optimization. Dispatchers see which crew is closest to a priority site, and property managers receive timestamped proof that their lot was serviced.",
  },
  {
    q: "Can I try snow removal software before I buy it?",
    a: "Yes. PlowWow offers a 30-day free trial with no credit card required. You can test the full platform including dispatch, weather alerts, Salt-Scan AI, liability vault storage, and QuickBooks sync before committing.",
  },
];

const Pricing = () => {
  const [pop, setPop] = useState(100_000);
  const monthly = useMemo(() => Math.max(10, Math.round((pop / 100_000) * 10)), [pop]);
  const annual = monthly * 12;

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="py-24 bg-section-alt">
      <div className="container max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">Pricing</p>
          <h2 id="pricing-heading" className="font-display text-3xl md:text-5xl font-extrabold mt-3">
            Snow Removal Software Pricing:{" "}
            <span className="text-intel-blue">$10/Month per 100K Population</span>
          </h2>
          <p className="font-tech text-muted-foreground text-lg mt-4">
            Pay for the market you actually serve. One contractor per service area — no auctions,
            no bidding wars.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-intel-night text-white p-8 shadow-2xl">
            <div className="font-mono-tech text-xs uppercase tracking-widest text-intel-blue">Calculator</div>
            <Label htmlFor="pop" className="block font-display text-xl font-bold mt-4">
              Your service area population
            </Label>
            <Input
              id="pop"
              type="number"
              min={10000}
              step={10000}
              value={pop}
              onChange={(e) => setPop(Math.max(0, Number(e.target.value) || 0))}
              className="mt-3 bg-white/10 border-white/20 text-white text-lg h-12"
            />
            <input
              type="range"
              min={50_000}
              max={3_000_000}
              step={50_000}
              value={pop}
              onChange={(e) => setPop(Number(e.target.value))}
              className="w-full mt-4 accent-[hsl(var(--intel-orange))]"
              aria-label="Population slider"
            />
            <div className="flex items-baseline justify-between mt-8 border-t border-white/10 pt-6">
              <div>
                <div className="text-white/60 font-mono-tech text-xs uppercase tracking-widest">Monthly</div>
                <div className="font-display text-5xl font-extrabold text-intel-orange mt-1">
                  ${monthly.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/60 font-mono-tech text-xs uppercase tracking-widest">Annual</div>
                <div className="font-display text-2xl font-bold mt-1">
                  ${annual.toLocaleString()} <span className="text-white/50 text-sm">CAD</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-card border border-border p-8 flex flex-col">
            <h3 className="font-display text-2xl font-bold">Everything included</h3>
            <ul className="mt-5 space-y-3 font-tech text-sm">
              {[
                "All 11 app modules — Estimator, Ice-Fighter, Salt-Scan, Vault, Ghost Fleet…",
                "Unlimited crew seats and trucks",
                "QuickBooks + PayPal integrations",
                "Wow-Shield™ Liability Vault storage",
                "Storm replay and audit exports",
                "Priority email + phone support",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <Zap className="w-4 h-4 text-intel-orange shrink-0 mt-1" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="mt-auto bg-intel-orange hover:bg-intel-orange/90 text-white font-display font-bold rounded-full text-lg shadow-xl"
            >
              <Link to="/#contact">Start Free Trial</Link>
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3 font-tech">
              30-day trial. No credit card required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const AppFeatures = () => {
  useEffect(() => {
    document.title = TITLE;
    setMeta("description", DESCRIPTION);

    // SoftwareApplication JSON-LD for AEO / rich snippets
    const ldId = "app-features-jsonld";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "PlowWow App",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "10",
        priceCurrency: "CAD",
        priceValidUntil: "2026-12-31",
      },
      description: DESCRIPTION,
      featureList: features.map((f) => f.h).join(", "),
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "47",
      },
    });
    document.head.appendChild(ld);

    // FAQPage JSON-LD for AEO
    const faqLdId = "app-features-faq-jsonld";
    document.getElementById(faqLdId)?.remove();
    const faqLd = document.createElement("script");
    faqLd.type = "application/ld+json";
    faqLd.id = faqLdId;
    faqLd.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
    document.head.appendChild(faqLd);

    return () => {
      document.getElementById(ldId)?.remove();
      document.getElementById(faqLdId)?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main id="page-top">
        {/* Skip to FAQ — first focusable element for keyboard users */}
        <a
          href="#faq"
          onClick={(e) => {
            e.preventDefault();
            const firstFaq = document.querySelector('#faq button[aria-expanded]') as HTMLButtonElement | null;
            if (firstFaq) {
              firstFaq.focus({ preventScroll: false });
            } else {
              document.getElementById('faq-heading')?.focus({ preventScroll: false });
            }
          }}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-intel-orange text-white px-5 py-2.5 rounded-full font-display font-bold text-sm shadow-lg"
        >
          Skip to FAQ
        </a>
        {/* Hero */}
        <section
          aria-labelledby="app-hero-heading"
          className="relative isolate overflow-hidden bg-intel-night text-white py-24 md:py-32"
        >
          <SnowBackground />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--intel-orange)/0.25),_transparent_60%)]"
          />
          <div className="container relative z-10 max-w-4xl text-center">
            <span className="font-mono-tech text-xs tracking-[0.3em] text-intel-blue uppercase">
              Snow Removal Software Built for Contractors
            </span>
            <h1
              id="app-hero-heading"
              tabIndex={-1}
              className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] mt-6"
            >
              Run your snow company like a{" "}
              <span className="text-intel-orange">tech company.</span>
            </h1>
            <p className="font-tech text-lg md:text-xl text-white/80 mt-6 max-w-2xl mx-auto">
              Eleven modules. One login. Dispatch, billing, liability proof and AI salt
              recommendations — purpose-built for snow & ice contractors in BC and beyond.
            </p>
            <div className="flex flex-wrap gap-4 justify-center mt-10">
              <Button
                asChild
                size="lg"
                className="bg-intel-orange hover:bg-intel-orange/90 text-white font-display font-bold rounded-full text-lg px-8 shadow-xl"
              >
                <Link to="/#contact">Try It Free</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-white/5 backdrop-blur-sm border-white/40 text-white hover:bg-white hover:text-intel-night font-display font-bold rounded-full text-lg px-8"
              >
                <a href="#pricing">See Pricing</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section aria-labelledby="features-heading" className="py-24 bg-background">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <p className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">
                Snow Removal Software Features
              </p>
              <h2 id="features-heading" className="font-display text-3xl md:text-5xl font-extrabold mt-3">
                12 modules. <span className="text-intel-blue">Zero spreadsheets.</span>
              </h2>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map(({ icon: Icon, h, b }) => (
                <li
                  key={h}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-intel-blue/10 flex items-center justify-center text-intel-blue mb-4">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{h}</h3>
                  <p className="font-tech text-muted-foreground text-sm mt-2 leading-relaxed">{b}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Benefits */}
        <section aria-labelledby="benefits-heading" className="py-24 bg-intel-night text-white">
          <div className="container">
            <div className="max-w-2xl mb-12">
              <p className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">
                Why Contractors Switch
              </p>
              <h2 id="benefits-heading" className="font-display text-3xl md:text-5xl font-extrabold mt-3">
                Real results from using{" "}
                <span className="text-intel-blue">snow removal software.</span>
              </h2>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {benefits.map((b) => (
                <li key={b.label} className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
                  <div className="font-display text-4xl font-extrabold text-intel-orange">{b.stat}</div>
                  <h3 className="font-display text-lg font-bold mt-2">{b.label}</h3>
                  <p className="font-tech text-sm text-white/70 mt-2">{b.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Pricing />

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-heading" className="py-24 bg-background">
          <div className="container max-w-3xl">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">
                Snow Removal Software FAQ
              </p>
              <h2 id="faq-heading" tabIndex={-1} className="font-display text-3xl md:text-5xl font-extrabold mt-3">
                Questions contractors ask about{" "}
                <span className="text-intel-blue">snow removal software.</span>
              </h2>
            </div>
            <Accordion type="single" collapsible aria-label="Frequently asked questions about snow removal software" className="space-y-4">
              {faqs.map(({ q, a }, i) => (
                <AccordionItem
                  key={q}
                  value={`faq-${i}`}
                  className="rounded-2xl border border-border bg-card px-6 md:px-8 data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="font-display text-lg md:text-xl font-bold text-left py-5 hover:no-underline [&>svg]:text-intel-orange">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="font-tech text-muted-foreground text-base leading-relaxed pb-6">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Back to top — appears on focus for keyboard users */}
            <a
              href="#page-top"
              onClick={(e) => {
                e.preventDefault();
                const heading = document.getElementById('app-hero-heading') as HTMLHeadingElement | null;
                heading?.focus({ preventScroll: false });
              }}
              className="sr-only focus:not-sr-only focus:absolute focus:bottom-4 focus:right-4 focus:z-50 bg-intel-orange text-white px-5 py-2.5 rounded-full font-display font-bold text-sm shadow-lg"
            >
              Back to top
            </a>
          </div>
        </section>

        {/* CTA */}
        <section
          aria-labelledby="app-cta-heading"
          className="py-20 bg-gradient-to-r from-intel-orange to-[hsl(var(--intel-orange)/0.85)] text-white text-center"
        >
          <div className="container max-w-3xl">
            <h2 id="app-cta-heading" className="font-display text-3xl md:text-5xl font-extrabold">
              Ready to upgrade your snow removal software?
            </h2>
            <p className="font-tech text-lg mt-4 opacity-95">
              One contractor per service area. Lock yours in before your competitor does.
            </p>
            <div className="flex flex-wrap gap-4 justify-center mt-8">
              <Button
                asChild
                size="lg"
                className="bg-white text-intel-orange hover:bg-white/90 font-display font-bold rounded-full text-lg px-8 shadow-xl"
              >
                <Link to="/#contact">Try the App Free</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white bg-transparent hover:bg-white hover:text-intel-orange font-display font-bold rounded-full text-lg px-8"
              >
                <a href="tel:6047611518">Talk to Sales</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AppFeatures;
