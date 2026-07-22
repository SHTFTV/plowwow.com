import { useState } from "react";
import { z } from "zod";
import { Navigation, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { haversineKm, estimateDrivingKm } from "@/lib/cityDistance";

type Props = {
  cityName: string;
  province: string;
  cityHall: { lat: number; lon: number; address?: string };
};

type GeocodeResult = {
  lat: number;
  lon: number;
  label: string;
} | null;

const addressSchema = z
  .string()
  .trim()
  .min(3, "Enter at least 3 characters")
  .max(200, "Address too long");

// Free geocoding via Open-Meteo — no API key required, matches existing
// weather integrations on the city pages.
async function geocode(query: string): Promise<GeocodeResult> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("country", "CA");
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`Geocoder ${r.status}`);
  const d = await r.json();
  const hit = d?.results?.[0];
  if (!hit) return null;
  return {
    lat: hit.latitude,
    lon: hit.longitude,
    label: [hit.name, hit.admin1, hit.country_code].filter(Boolean).join(", "),
  };
}

const DirectionsCard = ({ cityName, province, cityHall }: Props) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | {
        origin: { lat: number; lon: number; label: string };
        km: number;
        drivingKm: number;
      }
    | null
  >(null);

  const dest = `${cityHall.lat},${cityHall.lon}`;
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${cityName}, ${province}`,
  )}&t=&z=12&ie=UTF8&iwloc=&output=embed`;
  const genericDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  const originParam = result
    ? `${result.origin.lat},${result.origin.lon}`
    : null;
  const dirUrl = originParam
    ? `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${dest}&travelmode=driving`
    : genericDirUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = addressSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid address");
      return;
    }
    setLoading(true);
    try {
      const g = await geocode(parsed.data);
      if (!g) {
        setError("We couldn't find that address. Try a city or postal code.");
        setResult(null);
      } else {
        const km = haversineKm(
          { lat: g.lat, lon: g.lon },
          { lat: cityHall.lat, lon: cityHall.lon },
        );
        setResult({
          origin: g,
          km: Math.round(km * 10) / 10,
          drivingKm: estimateDrivingKm(km),
        });
      }
    } catch (err) {
      setError("Geocoding is temporarily unavailable. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <h3 className="font-heading font-bold text-xl flex items-center gap-2 mb-1">
        <Navigation className="w-5 h-5 text-primary" />
        Directions to our {cityName} service area
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Enter a starting address to see the estimated driving distance to{" "}
        {cityName} City Hall, and open turn-by-turn directions in Google Maps.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
        <label htmlFor="directions-origin" className="sr-only">
          Your starting address
        </label>
        <input
          id="directions-origin"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={200}
          placeholder="Your address, city, or postal code"
          className="flex-1 min-w-[220px] rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "directions-error" : undefined}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground font-semibold px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Calculating…
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" /> Estimate distance
            </>
          )}
        </button>
      </form>

      {error && (
        <p id="directions-error" role="alert" className="text-sm text-destructive mb-4">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-xl border border-border bg-background/60 p-4 mb-4">
          <p className="text-sm text-muted-foreground">From</p>
          <p className="font-semibold text-foreground mb-2">{result.origin.label}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Straight-line
              </p>
              <p className="font-heading font-bold text-2xl text-foreground">
                {result.km} km
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Est. driving
              </p>
              <p className="font-heading font-bold text-2xl text-foreground">
                ≈ {result.drivingKm} km
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden border border-border mb-4">
        <iframe
          title={`${cityName} service area map`}
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-[300px] block"
        />
      </div>

      <a
        href={dirUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-secondary-foreground font-semibold px-4 py-2 text-sm hover:opacity-90"
      >
        <Navigation className="w-4 h-4" />
        {result ? "Get driving directions" : "Open in Google Maps"}
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};

export default DirectionsCard;
