import { Link } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { nearestCities } from "@/lib/cityDistance";

type Props = {
  citySlug: string;
  cityName: string;
  count?: number;
};

const RelatedCities = ({ citySlug, cityName, count = 4 }: Props) => {
  const nearby = nearestCities(citySlug, count);
  if (nearby.length === 0) return null;

  return (
    <section className="py-14 border-t border-border">
      <div className="container">
        <h2 className="text-2xl md:text-3xl font-black text-foreground mb-1">
          Nearby cities we also plow
        </h2>
        <p className="text-muted-foreground mb-6">
          Same crews, same response standards — {nearby.length} closest municipalities
          to {cityName}, ranked by great-circle distance.
        </p>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {nearby.map((c) => (
            <li key={c.slug}>
              <Link
                to={c.href}
                className="group block h-full rounded-xl border border-border bg-card p-4 hover:border-primary hover:shadow-sm transition-all"
                aria-label={`${c.name} snow removal — approximately ${c.drivingKm} km from ${cityName}`}
              >
                <div className="flex items-center gap-2 text-primary mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider font-bold">
                    {c.km} km away
                  </span>
                </div>
                <p className="font-heading font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                  {c.name}
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  ≈ {c.drivingKm} km drive · {c.province}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  View service area
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default RelatedCities;
