import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SnowBackground from "./SnowBackground";

const IntelligenceHero = () => (
  <section
    aria-labelledby="intel-hero-heading"
    className="relative isolate overflow-hidden bg-intel-night text-white py-24 md:py-32"
  >
    <SnowBackground />
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--intel-blue)/0.25),_transparent_60%)]"
    />
    <div className="container relative z-10 max-w-4xl text-center">
      <span className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">
        Snow Removal Intelligence • 2025–26
      </span>
      <h1
        id="intel-hero-heading"
        className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] mt-6"
      >
        We Don't Just Plow Snow.{" "}
        <span className="text-intel-orange">We Predict It.</span>
      </h1>
      <p className="font-tech text-lg md:text-xl text-white/80 mt-6 max-w-2xl mx-auto">
        PlowWow combines real-time weather AI, GPS-tracked Ghost Fleet dispatch,
        and our PWIE Ice-Fighter formula to keep BC properties safe, billed
        accurately, and liability-proof.
      </p>
      <div className="flex flex-wrap gap-4 justify-center mt-10">
        <Button
          asChild
          size="lg"
          className="bg-intel-orange hover:bg-intel-orange/90 text-white font-display font-bold rounded-full text-lg px-8 shadow-xl"
        >
          <Link to="/#contact">Get Started</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="bg-white/5 backdrop-blur-sm border-white/40 text-white hover:bg-white hover:text-intel-night font-display font-bold rounded-full text-lg px-8"
        >
          <a href="#pwie-engine">See the Tech</a>
        </Button>
      </div>
    </div>
  </section>
);

export default IntelligenceHero;
