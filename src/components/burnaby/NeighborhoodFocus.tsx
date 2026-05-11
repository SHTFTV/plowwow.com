import { Mountain, Building2, Trees, Home } from "lucide-react";

const hoods = [
  {
    icon: Mountain,
    name: "Burnaby Mountain & SFU",
    challenge: "Steep grades, exposed elevation, heavier snowfall",
    solution: "Heavy-equipment plows, traction-grade salt blends, dawn-priority dispatch for university and UniverCity strata.",
  },
  {
    icon: Building2,
    name: "Metrotown",
    challenge: "High-density towers, underground parkades, retail foot traffic",
    solution: "Sidewalk crews + skid-steers, accurate salt logs for liability, off-peak snow relocation.",
  },
  {
    icon: Trees,
    name: "Brentwood & Capitol Hill",
    challenge: "Mixed strata + single-family streets with mature trees",
    solution: "Compact equipment for tight lanes, eco-friendly de-icer near landscaping, scheduled morning passes.",
  },
  {
    icon: Home,
    name: "Edmonds & Big Bend",
    challenge: "Wide residential lots, longer driveways",
    solution: "Per-property service plans, seasonal contracts with unlimited visits, GPS-verified arrival times.",
  },
];

const NeighborhoodFocus = () => (
  <section className="py-20" id="neighborhoods">
    <div className="container">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
          Built for Every Burnaby Neighborhood
        </h2>
        <p className="text-muted-foreground">
          Burnaby's terrain changes block by block. Our crews and equipment are tuned to each zone.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {hoods.map(({ icon: Icon, name, challenge, solution }) => (
          <article key={name} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-xl text-foreground mb-2">{name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <span className="font-semibold text-foreground">Challenge:</span> {challenge}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">PlowWow Solution:</span> {solution}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default NeighborhoodFocus;
