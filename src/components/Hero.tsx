import { Button } from "@/components/ui/button";
import heroBanner from "@/assets/plowwow-banner.png";

const Hero = () => (
  <section className="relative isolate overflow-hidden bg-[#0d2a4a]">
    <figure className="absolute inset-0 m-0">
      <img
        src={heroBanner}
        alt="PlowWow snow removal mascot driving a blue snow plow truck — professional winter services across Vancouver and the Lower Mainland BC"
        width={1600}
        height={640}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Decorative contrast overlays — darker on the left where text sits, fading right */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#0d2a4a]/85 via-[#0d2a4a]/55 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#0d2a4a]/70 via-transparent to-transparent"
      />
      <figcaption className="sr-only">
        PlowWow's friendly mascot at the wheel of a snow plow, ready for 24/7 residential
        and commercial snow removal, salting, and de-icing across Vancouver, the North Shore,
        Tri-Cities, Fraser Valley, and the rest of the Lower Mainland of British Columbia.
      </figcaption>
    </figure>

    <div className="container relative z-10 py-20 md:py-28 lg:py-36">
      <div className="max-w-2xl text-primary-foreground">
        <span className="inline-block bg-secondary text-secondary-foreground font-heading font-bold px-4 py-1.5 rounded-full text-sm mb-5 shadow-lg">
          ❄ Vancouver & Greater BC
        </span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          Snow Removal & Salting <span className="text-secondary">Services</span>
        </h1>
        <p className="text-lg md:text-xl mb-8 font-body text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] max-w-xl">
          Trusted snow removal for residential & commercial properties.
          Priority booking with accurate, annual billing.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-heading font-bold rounded-full text-lg px-8 shadow-xl"
          >
            Get a Free Quote
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white hover:text-foreground font-heading font-bold rounded-full text-lg px-8"
          >
            Call 604-761-1518
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
