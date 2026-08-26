import { Link } from "react-router-dom";
import { Building2, Mail, Phone, ShieldCheck, Snowflake } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WowStrataCalloutProps {
  cityName: string;
  quotePath: string;
}

const WowStrataCallout = ({ cityName, quotePath }: WowStrataCalloutProps) => (
  <section className="overflow-hidden bg-gradient-to-br from-sky-50 via-white to-orange-50 py-14" aria-labelledby="wow-strata-heading">
    <div className="container">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-3xl border border-sky-200 bg-white px-6 py-8 shadow-xl md:grid-cols-[minmax(0,1fr)_320px] md:px-10 md:py-10">
        <div aria-hidden className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
        <div className="relative z-10">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0d2a4a] px-4 py-2 text-sm font-bold text-white">
            <Building2 className="h-4 w-4 text-secondary" /> Strata &amp; property managers
          </span>
          <h2 id="wow-strata-heading" className="mb-4 text-3xl font-black text-foreground md:text-4xl">
            Wow-level winter service for {cityName} strata properties
          </h2>
          <p className="mb-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Keep residents moving with proactive plowing, walkway clearing, de-icing, and documented 24/7 storm response from one accountable local crew.
          </p>
          <div className="mb-7 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2"><Snowflake className="h-4 w-4 text-primary" /> Storm monitoring</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> WorkSafeBC insured</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full bg-secondary px-7 font-heading font-bold text-secondary-foreground hover:bg-secondary/90">
              <Link to={quotePath}>Get a strata quote</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6 font-heading font-bold">
              <a href="tel:6047611518"><Phone className="mr-2 h-4 w-4" />604-761-1518</a>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full px-5 font-heading font-bold">
              <a href="mailto:wow@plowwow.com"><Mail className="mr-2 h-4 w-4" />wow@plowwow.com</a>
            </Button>
          </div>
        </div>
        <div className="relative z-10 mx-auto w-full max-w-[300px] self-end">
          <img src="/wow-mascot.png" alt="PlowWow mascot waving with a snow shovel" className="h-auto w-full drop-shadow-2xl" loading="lazy" />
        </div>
      </div>
    </div>
  </section>
);

export default WowStrataCallout;
