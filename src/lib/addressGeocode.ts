// Street-level address geocoding via OpenStreetMap Nominatim (no key).
// Free, ~1 req/sec fair-use. Results are memoized through geocodeCache.
import { cachedGeocode, type GeocodeHit } from "./geocodeCache";

export type AddressGeocodeHit = GeocodeHit & {
  formatted: string;
  boundingBox?: [number, number, number, number]; // [minLat, maxLat, minLon, maxLon]
};

async function nominatim(query: string): Promise<AddressGeocodeHit | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "ca");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  const r = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Nominatim ${r.status}`);
  const arr = (await r.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    boundingbox?: string[];
  }>;
  const hit = arr?.[0];
  if (!hit) return null;
  const bb = hit.boundingbox?.map((n) => Number(n));
  return {
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    label: hit.display_name,
    formatted: hit.display_name,
    boundingBox:
      bb && bb.length === 4
        ? [bb[0], bb[1], bb[2], bb[3]]
        : undefined,
  };
}

export async function geocodeAddress(
  query: string,
): Promise<AddressGeocodeHit | null> {
  // Wrap in cachedGeocode so repeat lookups don't re-hit Nominatim.
  const res = await cachedGeocode(`nom:${query}`, async (q) => {
    return (await nominatim(q.replace(/^nom:/, ""))) as GeocodeHit | null;
  });
  return res as AddressGeocodeHit | null;
}

export function osmEmbedUrl(lat: number, lon: number, delta = 0.006) {
  const minLon = lon - delta;
  const maxLon = lon + delta;
  const minLat = lat - delta * 0.6;
  const maxLat = lat + delta * 0.6;
  const bbox = `${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
}
