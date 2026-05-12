import { Users, ShieldCheck, Cpu, Clock, Building2, Truck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Users, title: "Skilled & Courteous Team", href: "/skilled-courteous-team", description: "Professional crews trained for every winter scenario" },
  { icon: ShieldCheck, title: "Satisfaction Guaranteed", href: "/satisfaction-guaranteed", description: "We stand behind our work with a service guarantee" },
  { icon: Cpu, title: "Advanced Technology", href: "/advanced-technology", description: "GPS tracking and weather monitoring for smart dispatch" },
  { icon: Clock, title: "24/7 Service", href: "/24-7-service", description: "Automatic dispatch, emergency response, priority service" },
  { icon: Building2, title: "Strata Experts", href: "/strata-experts", description: "Multi-unit properties, documented service, insurance support" },
  { icon: Truck, title: "Snow Relocation", href: "/snow-relocation", description: "Heavy equipment, professional hauling, proper disposal" },
];

const Features = () => (
  <section className="py-20 bg-section-alt">
    <div className="container">
      <h2 className="text-3xl md:text-4xl text-center mb-12 text-foreground">Our Features</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f) => (
          <Link
            key={f.title}
            to={f.href}
            aria-label={`Learn more about ${f.title.toLowerCase()}`}
            className="group bg-card rounded-lg p-8 text-center shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center transition group-hover:bg-primary">
              <f.icon className="w-8 h-8 text-accent-foreground transition group-hover:text-primary-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm mb-4">{f.description}</p>
            <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold text-primary">
              Learn more
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
