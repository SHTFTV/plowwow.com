import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-mascot.jpg";

const Hero = () => (
  <section className="relative min-h-[80vh] flex items-center overflow-hidden">
    <img
      src={heroImage}
      alt="PlowWow mascot with snow plow truck"
      width={1920}
      height={1080}
      className="absolute inset-0 w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
    <div className="container relative z-10 py-20">
      <div className="max-w-2xl text-primary-foreground">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4 drop-shadow-lg">
          Snow Removal & Salting Services in Vancouver & Greater BC
        </h1>
        <p className="text-lg md:text-xl mb-8 font-body opacity-90">
          Trusted Snow Removal Company for Residential & Commercial Properties
        </p>
        <div className="flex flex-wrap gap-4">
          <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-heading font-bold rounded-full text-lg px-8">
            Get a Free Quote
          </Button>
          <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 font-heading font-bold rounded-full text-lg px-8">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
