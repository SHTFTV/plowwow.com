// Central config for all supported locales.
// Every prerendered city/blog page must emit one <link rel="alternate"
// hreflang="…"> tag per locale in this list, plus a x-default fallback.
//
// Today PlowWow ships a single Canadian English site, so all locales resolve
// to the same canonical URL. Add another locale here (e.g. "fr-CA") and both
// the prerender and the build validator pick it up automatically.

export const SUPPORTED_LOCALES = ["en-CA", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const X_DEFAULT_LOCALE: SupportedLocale = "en-CA";

// Map a locale → canonical URL for a given route. Single-locale today; when
// a translated variant lands under e.g. `/fr-CA/<slug>/`, return that path.
export function localizedUrl(baseUrl: string, canonicalPath: string, _locale: SupportedLocale): string {
  return `${baseUrl}${canonicalPath}`;
}
