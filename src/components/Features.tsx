import { Users, ShieldCheck, Cpu, Clock, Building2, Truck } from "lucide-react";

const features = [
  { icon: Users, title: "Skilled & Courteous Team", description: "Professional crews trained for every winter scenario" },
  { icon: ShieldCheck, title: "Satisfaction Guaranteed", description: "We stand behind our work with a service guarantee" },
  { icon: Cpu, title: "Advanced Technology", description: "GPS tracking and weather monitoring for smart dispatch" },
  { icon: Clock, title: "24/7 Service", description: "Automatic dispatch, emergency response, priority service" },
  { icon: Building2, title: "Strata Experts", description: "Multi-unit properties, documented service, insurance support" },
  { icon: Truck, title: "Snow Relocation", description: "Heavy equipment, professional hauling, proper disposal" },
];

const Features = () => (
  <section className="py-20 bg-section-alt">
    <div className="container">
      <h2 className="text-3xl md:text-4xl text-center mb-12 text-foreground">Our Features</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f) => (
          <div key={f.title} className="bg-card rounded-lg p-8 text-center shadow-md hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
              <f.icon className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
