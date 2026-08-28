import { Button } from "@/components/ui/button";

const HowItWorks = () => {
  const steps = [
    { num: "1", title: "Get Your Free Quote", desc: "Call 604-761-1518 or email Wow@PlowWow.com with your address and property details." },
    { num: "2", title: "Automatic Service Starts", desc: "Once we begin your seasonal contract, we monitor weather 24/7 across all Lower Mainland service areas." },
    { num: "3", title: "Automatic Dispatch", desc: "When snowfall reaches trigger depth (typically 2-3 inches), your property is automatically cleared — no phone call needed!" },
    { num: "4", title: "Enjoy Your Winter", desc: "Relax knowing your property is safe, accessible, and maintained throughout the entire winter season." },
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="container">
        <h2 className="mb-8 text-center text-3xl text-foreground sm:mb-12 md:text-4xl">How PlowWow Works</h2>
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-4 lg:gap-8">
          {steps.map((step) => (
            <div key={step.num} className="flex items-start gap-4 text-left lg:block lg:text-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary lg:mx-auto lg:mb-4 lg:h-16 lg:w-16">
                <span className="text-xl font-black text-primary-foreground lg:text-2xl">{step.num}</span>
              </div>
              <div>
                <h3 className="mb-1 font-bold text-foreground text-lg lg:mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center sm:mt-12">
          <p className="mb-4 font-heading text-base font-bold text-foreground sm:text-lg">
            ⚠️ Capacity is Limited for the 2026–27 Season
          </p>
          <Button asChild size="lg" className="w-full max-w-sm rounded-full bg-secondary px-6 font-heading text-base font-bold text-secondary-foreground hover:bg-secondary/90 sm:w-auto sm:px-8 sm:text-lg">
            <a href="tel:+16047611518">Call Now to Reserve Your Spot</a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
