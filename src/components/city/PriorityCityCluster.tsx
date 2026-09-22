import { Link } from "react-router-dom";
import { ArrowRight, Building2, Home, MapPin, Snowflake } from "lucide-react";

type Guide = {
  title: string;
  description: string;
  href: string;
  image: string;
  imageAlt: string;
};

type CityCluster = {
  eyebrow: string;
  heading: string;
  intro: string;
  serviceAreas: { name: string; detail: string }[];
  propertyTypes: { icon: "strata" | "commercial" | "residential"; title: string; detail: string }[];
  guides: Guide[];
};

const clusters: Record<string, CityCluster> = {
  langley: {
    eyebrow: "Langley route planning",
    heading: "Snow removal across Langley City and Langley Township",
    intro:
      "Langley is not one compact service zone. A useful winter plan has to account for busy commercial access near the City, dense townhouse streets in Willoughby and Walnut Grove, longer residential approaches in Brookswood, and the distance between Fort Langley and Aldergrove. We quote the surfaces that actually need service, establish priorities before the storm, and place booked properties on a workable route.",
    serviceAreas: [
      { name: "Langley City & Willowbrook", detail: "Storefront walks, mixed-use access, parking lanes and commercial entrances." },
      { name: "Willoughby & Walnut Grove", detail: "Townhouse drive aisles, visitor parking, sidewalks, stairs and parkade approaches." },
      { name: "Brookswood & Murrayville", detail: "Residential driveways, walkways and smaller commercial properties." },
      { name: "Fort Langley & Aldergrove", detail: "Retail frontages, residential access and properties that need advance route planning." },
    ],
    propertyTypes: [
      { icon: "strata", title: "Strata snow service", detail: "A written scope for drive aisles, walks, stairs, entrances and the areas that need repeat ice checks." },
      { icon: "commercial", title: "Commercial snow plowing", detail: "Parking, loading and customer access planned around opening hours and site constraints." },
      { icon: "residential", title: "Booked residential routes", detail: "Driveway and walkway visits start at $125 when five visits are booked; on-call service starts at $150 when capacity is available." },
    ],
    guides: [
      {
        title: "Willoughby strata and commercial snow plowing",
        description: "Planning for townhomes, mixed-use properties, drive aisles and pedestrian access.",
        href: "/willoughby-strata-commercial-snow-plowing",
        image: "/blog-images/langley-strata-commercial-snow-plowing.jpg",
        imageAlt: "PlowWow snow removal guide for Willoughby strata and commercial properties",
      },
      {
        title: "Walnut Grove strata and commercial snow plowing",
        description: "A local guide for parking areas, entrances, internal roads and refreeze checks.",
        href: "/walnut-grove-strata-commercial-snow-plowing",
        image: "/blog-images/fort-langley-snow-removal.jpg",
        imageAlt: "PlowWow snow removal guide for Walnut Grove properties",
      },
      {
        title: "Fort Langley snow removal",
        description: "Service considerations for the historic core, retail frontages and nearby homes.",
        href: "/fort-langley-snow-removal",
        image: "/blog-images/fort-langley-snow-removal.jpg",
        imageAlt: "PlowWow snow removal guide for Fort Langley",
      },
      {
        title: "Skid-steer snow removal in Langley",
        description: "Where compact equipment helps on tight commercial and multi-family sites.",
        href: "/skid-steer-snow-removal-in-langley-bc",
        image: "/blog-images/campbell-heights-loading-dock-snow-plan.jpg",
        imageAlt: "Skid-steer snow removal equipment for a Langley property",
      },
    ],
  },
  vancouver: {
    eyebrow: "Vancouver snow and ice service",
    heading: "Sidewalks, entrances, parkade ramps and tight urban sites",
    intro:
      "Vancouver properties often have more pedestrian work than plowable space. A useful scope can combine hand clearing, salting or ice melt, small-equipment work and return checks for refreeze. We plan around the property rather than treating a downtown tower, an East Vancouver strata and a West Side residence as the same job.",
    serviceAreas: [
      { name: "Downtown, West End & False Creek", detail: "High-traffic entrances, sidewalks, loading access and parkade ramps." },
      { name: "Mount Pleasant & East Vancouver", detail: "Mixed-use buildings, strata walks, small lots and residential access." },
      { name: "Kitsilano, Point Grey & Dunbar", detail: "Apartment entrances, retail frontages, driveways and walkways." },
      { name: "South Vancouver", detail: "Commercial properties, apartments and booked residential routes." },
    ],
    propertyTypes: [
      { icon: "strata", title: "Strata and apartment access", detail: "Entrances, stairs, sidewalks, ramps and internal routes identified before the first dispatch." },
      { icon: "commercial", title: "Commercial winter service", detail: "A practical clearing order for public entrances, staff access, loading zones and customer routes." },
      { icon: "residential", title: "Residential visits", detail: "Booked driveway and walkway service where the address fits an active Vancouver route." },
    ],
    guides: [
      {
        title: "Kensington–Cedar Cottage snow removal",
        description: "Residential and small-property winter service in an East Vancouver neighbourhood.",
        href: "/kensington-cedar-cottage-snow-removal",
        image: "/blog-images/kensington-cedar-cottage-snow-removal.jpg",
        imageAlt: "Snow removal guide for Kensington-Cedar Cottage in Vancouver",
      },
      {
        title: "Renfrew Heights snow removal",
        description: "Driveways, walks and local access planning for a sloped East Vancouver area.",
        href: "/snow-removal-renfrew-heights",
        image: "/blog-images/renfrew-collingwood-vancouver-strata-commercial-snow-removal.jpg",
        imageAlt: "Snow removal guide for Renfrew Heights in Vancouver",
      },
      {
        title: "Shaughnessy snow removal",
        description: "Booked service for larger residential properties, long approaches and walkways.",
        href: "/shaughnessy-snow-removal",
        image: "/blog-images/shaughnessy-vancouver-snow-removal.jpg",
        imageAlt: "Snow removal guide for Shaughnessy in Vancouver",
      },
      {
        title: "Vancouver sidewalk snow-clearing plan",
        description: "A practical checklist for sidewalks, drains, entrances and overnight refreeze.",
        href: "/vancouver-sidewalk-snow-clearing-plan",
        image: "/blog-images/vancouver-sidewalk-snow-clearing-plan.jpg",
        imageAlt: "PlowWow Vancouver sidewalk snow-clearing planning guide",
      },
    ],
  },
  burnaby: {
    eyebrow: "Burnaby local guides",
    heading: "A connected Burnaby snow-removal service area",
    intro:
      "Burnaby combines steep residential streets, dense high-rise districts, parkade ramps and large commercial or industrial properties. We separate the site into vehicle and pedestrian work, choose equipment for the available space, and set the clearing order before crews arrive.",
    serviceAreas: [
      { name: "Metrotown & South Burnaby", detail: "Strata entrances, parkade ramps, retail walks and busy parking access." },
      { name: "Brentwood & Willingdon", detail: "High-density residential, office entrances and mixed-use properties." },
      { name: "Lougheed & Government Road", detail: "Townhouse access, commercial sites, sidewalks and sloped approaches." },
      { name: "Burnaby Mountain & Capitol Hill", detail: "Elevation, grade and refreeze risks that need planned treatment." },
    ],
    propertyTypes: [
      { icon: "strata", title: "Strata routes", detail: "Drive aisles, walks, stairs, ramps and entrances grouped into a clear, repeatable site plan." },
      { icon: "commercial", title: "Commercial properties", detail: "Customer and staff access, parking lanes and loading areas sequenced around operations." },
      { icon: "residential", title: "Residential routes", detail: "Booked driveway and walkway work quoted for the lot, grade and access." },
    ],
    guides: [
      {
        title: "Burnaby hills and parkade snow plan",
        description: "A practical plan for slopes, ramps, drainage and overnight refreeze.",
        href: "/burnaby-hills-parkade-snow-ice-plan",
        image: "/blog-images/burnaby-hills-parkade-snow-ice-plan.jpg",
        imageAlt: "Burnaby snow and ice plan for hills and parkade ramps",
      },
      {
        title: "Brentwood strata snow removal",
        description: "Pedestrian access, parkade approaches and high-density residential sites.",
        href: "/brentwood-burnaby-strata-snow-removal",
        image: "/blog-images/brentwood-burnaby-strata-snow-removal.jpg",
        imageAlt: "Snow removal guide for Brentwood strata properties in Burnaby",
      },
      {
        title: "Lougheed Town Centre snow removal",
        description: "Winter access planning for mixed-use, commercial and residential properties.",
        href: "/lougheed-town-centre-burnaby-snow-removal",
        image: "/blog-images/lougheed-town-centre-burnaby-snow-removal.jpg",
        imageAlt: "Snow removal guide for Lougheed Town Centre in Burnaby",
      },
      {
        title: "Burnaby Heights snow removal",
        description: "Commercial frontages, residential walks and neighbourhood route planning.",
        href: "/burnaby-heights-strata-commercial-snow-removal",
        image: "/blog-images/burnaby-heights-strata-commercial-snow-removal.jpg",
        imageAlt: "Snow removal guide for Burnaby Heights properties",
      },
    ],
  },
};

const icons = {
  strata: Building2,
  commercial: Snowflake,
  residential: Home,
};

const PriorityCityCluster = ({ citySlug }: { citySlug: string }) => {
  const cluster = clusters[citySlug];
  if (!cluster) return null;

  return (
    <section className="py-16 bg-background border-y border-border" aria-labelledby={`${citySlug}-local-plan-heading`}>
      <div className="container">
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">{cluster.eyebrow}</p>
          <h2 id={`${citySlug}-local-plan-heading`} className="text-3xl md:text-4xl font-black text-foreground mb-4">
            {cluster.heading}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{cluster.intro}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          {cluster.serviceAreas.map((area) => (
            <article key={area.name} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-heading text-lg font-black text-foreground flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" /> {area.name}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{area.detail}</p>
            </article>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {cluster.propertyTypes.map((type) => {
            const Icon = icons[type.icon];
            return (
              <article key={type.title} className="rounded-2xl bg-muted/30 p-6">
                <Icon className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-heading text-xl font-black text-foreground mb-2">{type.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{type.detail}</p>
              </article>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Local service guides</p>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">Explore the work by neighbourhood</h2>
          </div>
          <Link to="/blog" className="font-bold text-primary hover:underline">View all winter guides →</Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cluster.guides.map((guide) => (
            <Link key={guide.href} to={guide.href} className="group overflow-hidden rounded-2xl border border-border bg-card hover:border-primary hover:shadow-md transition-all">
              <img src={guide.image} alt={guide.imageAlt} loading="lazy" className="w-full h-40 object-cover" />
              <div className="p-5">
                <h3 className="font-heading font-black text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">{guide.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{guide.description}</p>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">Read guide <ArrowRight className="w-4 h-4" /></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PriorityCityCluster;
