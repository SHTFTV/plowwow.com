import { Button } from "@/components/ui/button";
import heroBanner from "@/assets/plowwow-banner.png";

const Hero = () => (
  <section className="relative bg-[#0d2a4a]">
    <img
      src={heroBanner}
      alt="PlowWow mascot driving snow plow — 604-761-1518, wow@plowwow.com"
      width={1600}
      height={640}
      className="w-full h-auto object-cover"
    />
    <div className="container py-10 text-center">
      <h1 className="sr-only">
        Snow Removal & Salting Services in Vancouver & Greater BC
      </h1>
      <p className="text-lg md:text-xl mb-6 font-body text-foreground">
        Trusted Snow Removal Company for Residential & Commercial Properties
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-heading font-bold rounded-full text-lg px-8">
          Get a Free Quote
        </Button>
        <Button size="lg" variant="outline" className="font-heading font-bold rounded-full text-lg px-8">
          Learn More
        </Button>
      </div>
    </div>
  </section>
);

export default Hero;
