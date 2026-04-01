import { MapPin } from "lucide-react";

const areas = [
  {
    region: "Metro Vancouver West",
    cities: ["Vancouver", "West Vancouver", "North Vancouver"],
  },
  {
    region: "Central Metro Vancouver",
    cities: ["Burnaby", "Richmond", "New Westminster"],
  },
  {
    region: "South Metro Vancouver",
    cities: ["Surrey", "Delta", "White Rock"],
  },
  {
    region: "Tri-Cities & East Metro",
    cities: ["Coquitlam", "Port Coquitlam", "Port Moody"],
  },
  {
    region: "Fraser Valley Northeast",
    cities: ["Maple Ridge", "Pitt Meadows"],
  },
  {
    region: "Fraser Valley",
    cities: ["Langley", "Abbotsford", "Mission", "Chilliwack"],
  },
];

const ServiceAreas = () => (
  <section id="service-areas" className="py-20">
    <div className="container">
      <h2 className="text-3xl md:text-4xl text-center mb-4 text-foreground">
        ❄️ Professional Snow Removal Across Lower Mainland BC
      </h2>
      <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
        24/7 Snow Plowing, Salting & De-icing — Serving 18 communities from Vancouver to Chilliwack.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map((area) => (
          <div key={area.region} className="bg-card rounded-lg p-6 border border-border hover:border-primary/50 transition-colors shadow-sm">
            <h3 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {area.region}
            </h3>
            <ul className="space-y-1">
              {area.cities.map((city) => (
                <li key={city} className="text-muted-foreground text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
                  {city}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ServiceAreas;
