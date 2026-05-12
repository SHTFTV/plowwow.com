import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const IntelligenceCTA = () => (
  <section
    aria-labelledby="intel-cta-heading"
    className="py-20 bg-gradient-to-r from-intel-orange to-[hsl(var(--intel-orange)/0.85)] text-white text-center"
  >
    <div className="container max-w-3xl">
      <h2 id="intel-cta-heading" className="font-display text-3xl md:text-5xl font-extrabold">
        Lock in your 2025–26 spot.
      </h2>
      <p className="font-tech text-lg mt-4 opacity-95">
        Priority dispatch fills fast. Get a customized quote and join the Ghost Fleet route map.
      </p>
      <div className="flex flex-wrap gap-4 justify-center mt-8">
        <Button
          asChild
          size="lg"
          className="bg-white text-intel-orange hover:bg-white/90 font-display font-bold rounded-full text-lg px-8 shadow-xl"
        >
          <Link to="/#contact">Get Started</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-white text-white bg-transparent hover:bg-white hover:text-intel-orange font-display font-bold rounded-full text-lg px-8"
        >
          <a href="tel:6047611518">Call 604-761-1518</a>
        </Button>
      </div>
    </div>
  </section>
);

export default IntelligenceCTA;
