import { Building2, Home, Store, Snowflake, Building, Truck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const projects = [
  { icon: Building, label: "Strata Complexes", href: "/strata-complexes", desc: "Townhomes, condos & multi-unit communities with documented service logs." },
  { icon: Snowflake, label: "Snow Blowers For Sidewalks", href: "/snow-blowers-for-sidewalks", desc: "Walkways, entrances and pedestrian access cleared safely and quickly." },
  { icon: Truck, label: "Commercial Lots", href: "/commercial", desc: "Parking lots, loading zones and customer access kept clear 24/7." },
  { icon: Building2, label: "Apartment Complexes", href: "/apartment-complexes", desc: "Driveways, walkways and shared spaces handled with priority dispatch." },
  { icon: Store, label: "Strip Malls", href: "/strip-malls", desc: "Storefronts, lots and curbs maintained for tenants and shoppers." },
  { icon: Home, label: "Residential Houses", href: "/residential-snow-removal", desc: "Driveways, steps and walkways for homeowners across Greater BC." },
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
        {projects.map(({ icon: Icon, label, href, desc }) => (
          <li key={label}>
            <Link
              to={href}
              aria-label={`Learn more about ${label.toLowerCase()} snow removal`}
              className="group block h-full rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">{label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold text-primary">
                Learn more
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default SkilledTeamProjects;
