import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck, Snowflake } from "lucide-react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { applyPageMeta } from "@/lib/pageMeta";

const title = "Unlimited Snow Removal & Ice Control Policy | PlowWow";
const description = "Understand what PlowWow's unlimited seasonal snow removal package includes, including repeat clearing visits, salting and de-icing, and exceptional-weather exclusions.";

export default function UnlimitedServicePolicy() {
  useEffect(() => {
    applyPageMeta({
      title,
      description,
      path: "/unlimited-service-policy",
      ogImage: "https://www.plowwow.com/og-default.jpg",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        url: "https://www.plowwow.com/unlimited-service-policy",
        isPartOf: { "@type": "WebSite", name: "PlowWow", url: "https://www.plowwow.com/" },
      },
    });
  }, []);

  return (
    <>
      <TopBar />
      <Navbar />
      <main id="main-content" className="min-h-screen bg-background text-foreground">
        <section className="bg-[#0a2540] text-white py-16 md:py-24">
          <div className="container max-w-5xl">
            <p className="text-sm font-bold tracking-[0.18em] text-sky-200 uppercase">PlowWow seasonal service</p>
            <h1 className="mt-4 max-w-4xl text-4xl md:text-6xl font-bold leading-tight">What does <span className="text-sky-300">Unlimited</span> mean?</h1>
            <p className="mt-6 max-w-3xl text-lg md:text-xl leading-relaxed text-slate-200">
              One agreed seasonal price for ongoing snow clearing and ice management throughout the contracted winter season, subject to the exceptional-weather conditions explained below.
            </p>
          </div>
        </section>

        <div className="container max-w-5xl py-12 md:py-16 space-y-12">
          <section aria-labelledby="included-heading">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
              <h2 id="included-heading" className="text-2xl md:text-3xl font-bold">What is included</h2>
            </div>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              For a property enrolled in a PlowWow Unlimited Seasonal Package, unlimited means there is no preset cap on the number of routine service visits required for the areas and services listed in the signed agreement.
            </p>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                "Repeated snow-clearing visits as snowfall continues and accumulates during normal winter conditions.",
                "Return visits when additional clearing is needed within the agreed service scope.",
                "Salting and de-icing for icy conditions, including freezing rain and refreezing, even when no new snowfall has occurred.",
                "Ongoing winter service for the specific driveways, parking areas, walkways, entrances and other surfaces identified in the agreement.",
              ].map((item) => (
                <li key={item} className="rounded-xl border border-border bg-card p-5 leading-relaxed flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="exception-heading" className="rounded-2xl border border-amber-300 bg-amber-50 p-6 md:p-8 text-slate-900">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-amber-700" aria-hidden="true" />
              <h2 id="exception-heading" className="text-2xl md:text-3xl font-bold">The exceptional-weather exception</h2>
            </div>
            <p className="mt-4 leading-relaxed">
              The Unlimited Seasonal Package is intended to cover routine and reasonably anticipated winter conditions. An additional charge may apply only when weather conditions are exceptional, specifically:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed">
              <li>Extreme snowfall accumulation that goes beyond normal seasonal operating conditions; or</li>
              <li>A continuous snowfall event that lasts more than 12 consecutive hours. This is beyond two five-hour operating shifts, with additional time for continued operations. The first five-hour shift is typically the most demanding as crews work through the initial accumulation.</li>
            </ul>
            <p className="mt-4 leading-relaxed">
              These are exceptional-event circumstances, not routine per-visit or per-salting fees. Any applicable exceptional-weather charge must be addressed in the property's written service agreement. The agreement governs the specific scope, pricing and treatment of exceptional events.
            </p>
          </section>

          <section aria-labelledby="not-extra-heading">
            <div className="flex items-center gap-3">
              <Snowflake className="h-8 w-8 text-primary" aria-hidden="true" />
              <h2 id="not-extra-heading" className="text-2xl md:text-3xl font-bold">What does not trigger an extra charge?</h2>
            </div>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Under the unlimited seasonal package, ordinary repeat visits do not become extra charges simply because it snows again, the crew needs to return, or icy conditions require salting. Salting and de-icing for icy conditions are included for the agreed treatment areas regardless of whether snowfall has occurred.
            </p>
          </section>

          <section className="rounded-2xl bg-muted p-6 md:p-8" aria-labelledby="agreement-heading">
            <h2 id="agreement-heading" className="text-2xl font-bold">Your written agreement comes first</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              The Unlimited Seasonal Package applies to the properties, service areas and work described in the signed quote or contract. Please review that document for the exact service scope and any exceptional-weather pricing. If a website description and a signed agreement differ, the signed agreement controls.
            </p>
            <p className="mt-4">
              <Link to="/quote" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
                Request a seasonal service quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>
          </section>

          <p className="text-sm text-muted-foreground">
            Questions about what is included at your property? Contact PlowWow at <a className="underline" href="tel:+16047611518">604-761-1518</a> or <a className="underline" href="mailto:wow@plowwow.com">wow@plowwow.com</a>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
