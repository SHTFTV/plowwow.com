// These two original assets contain native PNG bytes despite their legacy
// .jpg filenames. Keep the old files for inbound links; new metadata uses
// byte-identical .png copies so the extension and served MIME are truthful.
const nativePngHeroes = new Set([
  "willingdon-heights-burnaby-commercial-snow-removal",
  "yaletown-vancouver-snow-removal",
]);

export function blogHeroPath(slug: string): string {
  return `/blog-images/${slug}.${nativePngHeroes.has(slug) ? "png" : "jpg"}`;
}
