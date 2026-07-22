// Haversine distance + nearest-cities helper used by the related-cities
// section and the "distance from your address" directions card.
import { cities, type City } from "@/data/cities";

const EARTH_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Rough driving distance estimate — highway multiplier applied to great-circle.
// Not routing-grade, but useful for a "≈ X km drive" hint without an API key.
export function estimateDrivingKm(km: number): number {
  return Math.round(km * 1.28);
}

// Manual burnaby entry — City record isn't in cities.ts because Burnaby
// has its own bespoke page; include a compatible stub for distance calcs.
const BURNABY_STUB: Pick<City, "slug" | "name" | "province" | "cityHall"> = {
  slug: "burnaby",
  name: "Burnaby",
  province: "BC",
  cityHall: { lat: 49.2488, lon: -122.9805, address: "4949 Canada Way" },
};

export type NearbyCity = {
  slug: string;
  name: string;
  province: string;
  km: number;
  drivingKm: number;
  href: string;
};

export function nearestCities(fromSlug: string, count = 4): NearbyCity[] {
  const all: Array<Pick<City, "slug" | "name" | "province" | "cityHall">> = [
    BURNABY_STUB,
    ...cities,
  ];
  const from = all.find((c) => c.slug === fromSlug);
  if (!from) return [];
  const origin = { lat: from.cityHall.lat, lon: from.cityHall.lon };
  return all
    .filter((c) => c.slug !== fromSlug)
    .map((c) => {
      const km = haversineKm(origin, { lat: c.cityHall.lat, lon: c.cityHall.lon });
      return {
        slug: c.slug,
        name: c.name,
        province: c.province,
        km: Math.round(km * 10) / 10,
        drivingKm: estimateDrivingKm(km),
        href: `/${c.slug}`,
      };
    })
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}
