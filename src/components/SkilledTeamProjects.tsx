import { Building2, Home, Store, Snowflake, Building, Truck } from "lucide-react";

const projects = [
  { icon: Building, label: "Strata Complexes", desc: "Townhomes, condos & multi-unit communities with documented service logs." },
  { icon: Snowflake, label: "Snow Blowers For Sidewalks", desc: "Walkways, entrances and pedestrian access cleared safely and quickly." },
  { icon: Truck, label: "Commercial Lots", desc: "Parking lots, loading zones and customer access kept clear 24/7." },
  { icon: Building2, label: "Apartment Complexes", desc: "Driveways, walkways and shared spaces handled with priority dispatch." },
  { icon: Store, label: "Strip Malls", desc: "Storefronts, lots and curbs maintained for tenants and shoppers." },
  { icon: Home, label: "Residential Houses", desc: "Driveways, steps and walkways for homeowners across Greater BC." },
];

const SkilledTeamProjects = () => (
  <section
    id="skilled-team-projects"
    aria-labelledby="skilled-team-heading"
    className="py-20 bg-muted/40"
  >
    <div className="container">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <span className="inline-block bg-secondary text-secondary-foreground font-heading font-bold px-4 py-1.5 rounded-full text-sm mb-4">
          Our Skilled Team Projects
        </span>
        <h2 id="skilled-team-heading" className="text-3xl md:text-4xl mb-4 text-foreground">
          Properties We Service Every Winter
        </h2>
        <p className="text-muted-foreground text-lg">
          From single driveways to multi-building strata sites — PlowWow has the crew,
          equipment and experience for the 2025–26 season.
        </p>
      </div>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map(({ icon: Icon, label, desc }) => (
          <li
            key={label}
            className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">{label}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default SkilledTeamProjects;
