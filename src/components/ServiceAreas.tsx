import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

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

const ServiceAreas = () => (
  <section id="service-areas" className="py-20 bg-section-alt">
    <div className="container">
      <h2 className="text-3xl md:text-4xl text-center mb-4 text-foreground">
        City Snow Removal Pages
      </h2>
      <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
        Choose your city for local snow plowing, salting, de-icing, snowfall data, and service details.
      </p>

      <div className="space-y-12">
        {regions.map((region) => (
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
    </div>
  </section>
);

export default ServiceAreas;
