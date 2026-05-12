import { useState } from "react";
import { CloudSun, ExternalLink, MapPin, Building2 } from "lucide-react";

type CityMapProps = {
  cityName: string;
  province: string;
  cityHall: { lat: number; lon: number; address?: string };
};

type WeatherSource = "ec" | "openmeteo";

const CityMap = ({ cityName, province, cityHall }: CityMapProps) => {
  const { lat, lon, address } = cityHall;
  // ~0.04° box around city hall (~4–5 km) so the marker has context.
  const d = 0.04;
  const bbox = `${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`;
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lon}`;

  const sources: Record<
    WeatherSource,
    { label: string; short: string; url: string }
  > = {
    ec: {
      label: "Environment Canada",
      short: "EC",
      url: `https://weather.gc.ca/en/location/index.html?coords=${lat},${lon}`,
    },
    openmeteo: {
      label: "Open-Meteo",
      short: "Open-Meteo",
      url: `https://open-meteo.com/en/docs?latitude=${lat}&longitude=${lon}&forecast_days=7`,
    },
  };

  const [source, setSource] = useState<WeatherSource>("ec");
  const active = sources[source];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
        <h3 className="font-heading font-bold text-xl flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" /> {cityName} Service Map
        </h3>
        <div className="flex flex-col items-end gap-2">
          <a
            href={active.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <CloudSun className="w-4 h-4" /> Live {cityName} weather · {active.short}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <div
            role="radiogroup"
            aria-label="Weather data source"
            className="inline-flex rounded-full border border-border bg-background p-0.5 text-xs"
          >
            {(Object.keys(sources) as WeatherSource[]).map((key) => {
              const isActive = source === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSource(key)}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sources[key].short}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4 inline-flex items-center gap-1.5">
        <Building2 className="w-4 h-4" />
        Pinned: {cityName} City Hall{address ? ` — ${address}` : ""}
      </p>
      <div className="relative rounded-xl overflow-hidden border border-border">
        <iframe
          title={`${cityName} City Hall map`}
          src={embedSrc}
          loading="lazy"
          className="w-full h-[320px] block"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-background border border-border px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-primary" /> Open in Google Maps
          <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-background border border-border px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-primary" /> View larger map
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default CityMap;
