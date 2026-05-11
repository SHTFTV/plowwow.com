import { CloudSnow, School, Map, ExternalLink } from "lucide-react";
import LiveWeatherCard from "./LiveWeatherCard";

const cards = [
  {
    icon: School,
    title: "SD41 School Closures",
    body: "Live alerts from Burnaby School District 41 for snow-day closures and delayed starts.",
    href: "https://burnabyschools.ca/news/",
    cta: "Check SD41 Alerts",
  },
  {
    icon: Map,
    title: "City of Burnaby Plow Routes",
    body: "Municipal priority-route map — see when arterials near you are scheduled for clearing.",
    href: "https://www.burnaby.ca/services-and-payments/roads-and-transportation/snow-and-ice-control",
    cta: "Open Plow Route Map",
  },
];

const UtilityDashboard = () => (
  <section className="py-20 bg-section-alt" id="utility">
    <div className="container">
      <div className="max-w-2xl mb-10">
        <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3 flex items-center gap-3">
          <CloudSnow className="w-8 h-8 text-primary" />
          Burnaby Winter Utility Dashboard
        </h2>
        <p className="text-muted-foreground">
          Everything Burnaby residents and property managers need in one place — school alerts,
          city plow routes, and live conditions.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {cards.map(({ icon: Icon, title, body, href, cta }) => (
          <a
            key={title}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-2xl p-6 border border-white/40 bg-white/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-white/10 pointer-events-none" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{body}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
                {cta} <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </a>
        ))}
        <LiveWeatherCard />
      </div>
    </div>
  </section>
);

export default UtilityDashboard;
