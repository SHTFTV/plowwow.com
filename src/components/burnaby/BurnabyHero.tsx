import { Button } from "@/components/ui/button";
import { Phone, ShieldCheck, Truck, Clock } from "lucide-react";

const BurnabyHero = () => (
  <section className="relative isolate overflow-hidden bg-[#0d2a4a] text-white">
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(247,148,29,0.25),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(56,114,191,0.45),transparent_55%)]"
    />
    <div className="container relative z-10 py-20 md:py-28">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground font-heading font-bold px-4 py-1.5 rounded-full text-sm mb-5 shadow-lg">
          ❄ Serving Burnaby 24/7
        </span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-5">
          Burnaby Snow Removal <span className="text-secondary">Quote</span>
        </h1>
        <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl">
          24/7 plowing, salting & de-icing for Metrotown, Brentwood, Burnaby Mountain
          and Capitol Hill. Priority strata, commercial & residential dispatch.
        </p>
        <div className="flex flex-wrap gap-4 mb-10">
          <Button
            asChild
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-heading font-bold rounded-full text-lg px-8 shadow-xl"
          >
            <a href="#burnaby-quote">Get a Free Quote</a>
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
);

export default BurnabyHero;
