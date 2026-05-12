import { CloudSun, ExternalLink, MapPin, Building2 } from "lucide-react";

type CityMapProps = {
  cityName: string;
  province: string;
  cityHall: { lat: number; lon: number; address?: string };
};

const CityMap = ({ cityName, province, cityHall }: CityMapProps) => {
  const { lat, lon, address } = cityHall;
  // ~0.04° box around city hall (~4–5 km) so the marker has context.
  const d = 0.04;
  const bbox = `${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`;
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lon}`;
  // Primary: Environment Canada (weather.gc.ca) — official Canadian source,
  // resolves the nearest city forecast page from coordinates. Sometimes the
  // location index URL fails to resolve a station (404 / blank), so we always
  // expose an Open-Meteo fallback that works from raw lat/lon with no API key.
  const weatherUrl = `https://weather.gc.ca/en/location/index.html?coords=${lat},${lon}`;
  const fallbackWeatherUrl = `https://open-meteo.com/en/docs?latitude=${lat}&longitude=${lon}#forecast_days=7`;
  const fallbackWeatherForecastUrl = `https://www.meteoblue.com/en/weather/week/${lat}N${lon}E`;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
        <h3 className="font-heading font-bold text-xl flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" /> {cityName} Service Map
        </h3>
        <a
          href={weatherUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <CloudSun className="w-4 h-4" /> Live {cityName} weather
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
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
