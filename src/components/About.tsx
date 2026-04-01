import { Button } from "@/components/ui/button";

const About = () => (
  <section id="about" className="py-20">
    <div className="container">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl mb-6 text-foreground">
          Plow Wow Snow Removal Company!
        </h2>
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
          We Put The Wow in Plow and Snow Removal with Priority Books and Accurate or Annual Billing.
          Experience the peace of mind that comes with Plow Wow's automatic and reliable snow and ice removal.
          Our seasonally contracted team ensures your property remains safe, clear, and pristine from the first snowfall to the last.
        </p>
        <Button size="lg" className="bg-primary hover:bg-primary/90 font-heading font-bold rounded-full text-lg px-8">
          Get a Quote
        </Button>
      </div>
    </div>
  </section>
);

export default About;
