import { Button } from "@/components/ui/button";

const HowItWorks = () => {
  const steps = [
    { num: "1", title: "Get Your Free Quote", desc: "Call 604-761-1518 or email Wow@PlowWow.com with your address and property details." },
    { num: "2", title: "Automatic Service Starts", desc: "Once we begin your seasonal contract, we monitor weather 24/7 across all Lower Mainland service areas." },
    { num: "3", title: "Automatic Dispatch", desc: "When snowfall reaches trigger depth (typically 2-3 inches), your property is automatically cleared — no phone call needed!" },
    { num: "4", title: "Enjoy Your Winter", desc: "Relax knowing your property is safe, accessible, and maintained throughout the entire winter season." },
  ];

  return (
    <section className="py-20">
      <div className="container">
        <h2 className="text-3xl md:text-4xl text-center mb-12 text-foreground">How PlowWow Works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-2xl font-black">{step.num}</span>
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <p className="text-foreground font-heading font-bold text-lg mb-4">
            ⚠️ Capacity is Limited for 2025-26 Season
          </p>
          <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-heading font-bold rounded-full text-lg px-8">
            Call Now to Reserve Your Spot
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
