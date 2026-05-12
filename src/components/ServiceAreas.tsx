import { useMemo, useState } from "react";
import { ArrowRight, MapPin, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";

type CityLink = { name: string; slug: string };

const regions: { title: string; cities: CityLink[] }[] = [
  {
    title: "Metro Vancouver West",
    cities: [
      { name: "Vancouver", slug: "vancouver" },
      { name: "West Vancouver", slug: "west-vancouver" },
      { name: "North Vancouver", slug: "north-vancouver" },
    ],
  },
  {
    title: "Central Metro Vancouver",
    cities: [
      { name: "Burnaby", slug: "burnaby" },
      { name: "Richmond", slug: "richmond" },
      { name: "New Westminster", slug: "new-westminster" },
    ],
  },
  {
    title: "South Metro Vancouver",
    cities: [
      { name: "Surrey", slug: "surrey" },
      { name: "Delta", slug: "delta" },
      { name: "White Rock", slug: "white-rock" },
    ],
  },
  {
    title: "Tri-Cities & East Metro",
    cities: [
      { name: "Coquitlam", slug: "coquitlam" },
      { name: "Port Coquitlam", slug: "port-coquitlam" },
      { name: "Port Moody", slug: "port-moody" },
    ],
  },
  {
    title: "Fraser Valley Northeast",
    cities: [
      { name: "Maple Ridge", slug: "maple-ridge" },
      { name: "Pitt Meadows", slug: "pitt-meadows" },
    ],
  },
  {
    title: "Fraser Valley",
    cities: [
      { name: "Langley", slug: "langley" },
      { name: "Abbotsford", slug: "abbotsford" },
      { name: "Mission", slug: "mission" },
      { name: "Chilliwack", slug: "chilliwack" },
    ],
  },
];

const ServiceAreas = () => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return regions;
    return regions
      .map((r) => ({
        ...r,
        cities: r.cities.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q),
        ),
      }))
      .filter((r) => r.cities.length > 0);
  }, [q]);

  const totalMatches = filtered.reduce((n, r) => n + r.cities.length, 0);

  return (
    <section id="service-areas" className="py-20 bg-section-alt">
      <div className="container">
        <h2 className="text-3xl md:text-4xl text-center mb-4 text-foreground">
          City Snow Removal Pages
        </h2>
        <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
          Choose your city for local snow plowing, salting, de-icing, snowfall data, and service details.
        </p>

        {/* Search */}
        <div className="max-w-md mx-auto mb-10">
          <label htmlFor="city-search" className="sr-only">
            Search cities
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
            />
            <Input
              id="city-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city — e.g. Burnaby, Chilliwack"
              className="pl-10 pr-10 h-12 rounded-full bg-card border-border"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {q && (
            <p className="text-sm text-muted-foreground text-center mt-3" aria-live="polite">
              {totalMatches} {totalMatches === 1 ? "match" : "matches"} for "{query}"
            </p>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            No cities match "{query}". Try a different name.
          </p>
        ) : (
          <div className="space-y-12">
            {filtered.map((region) => (
              <div key={region.title}>
                <h3 className="text-xl md:text-2xl font-heading font-bold text-foreground mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {region.title}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {region.cities.map((city) => (
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceAreas;
