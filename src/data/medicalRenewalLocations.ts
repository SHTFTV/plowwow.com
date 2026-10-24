/** Confirmed property neighbourhoods; public stories intentionally omit client addresses. */
export const medicalRenewalLocations: Record<string, { neighbourhood: string; city: string }> = {
  'sapperton-new-westminster-medical-office-snow-removal': { neighbourhood: 'Sapperton', city: 'New Westminster' },
  'downtown-port-coquitlam-wilson-medical-office-snow-removal': { neighbourhood: 'Downtown Port Coquitlam', city: 'Port Coquitlam' },
};

export function medicalRenewalPlace(slug: string) {
  const place = medicalRenewalLocations[slug];
  return place ? {
    '@type': 'Place', name: `${place.neighbourhood}, ${place.city}, British Columbia`,
    containedInPlace: { '@type': 'City', name: place.city, containedInPlace: { '@type': 'AdministrativeArea', name: 'British Columbia' } },
  } : undefined;
}
