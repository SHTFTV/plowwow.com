import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { cities } from "@/data/cities";

const cityLinks = [
  { name: "Burnaby", slug: "burnaby" },
  ...cities.map((city) => ({ name: city.name, slug: city.slug })),
].sort((a, b) => a.name.localeCompare(b.name));

const ServiceAreas = () => (
  <section id="service-areas" className="py-20">
    <div className="container">
      <h2 className="text-3xl md:text-4xl text-center mb-4 text-foreground">
        City Snow Removal Pages
      </h2>
      <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
        Choose your city for local snow plowing, salting, de-icing, snowfall data, and service details.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cityLinks.map((city) => (
          <Link
            key={city.slug}
            to={`/${city.slug}`}
            className="group flex items-center justify-between gap-4 bg-card rounded-lg p-5 border border-border hover:border-primary/50 transition-colors shadow-sm"
          >
            <span className="font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {city.name}
            </span>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default ServiceAreas;
