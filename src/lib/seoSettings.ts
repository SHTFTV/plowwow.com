// Runtime SEO settings applied across city + neighborhood pages.
// Backed by localStorage so a single admin user can maintain them without a migration.
// Exportable to JSON so values can be committed to source when finalized.

export type SeoSettings = {
  sameAs: string[];
  ratingValue: string;
  reviewCount: string;
};

const KEY = "plowwow.seoSettings.v1";

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  sameAs: [],
  ratingValue: "4.9",
  reviewCount: "47",
};

export function loadSeoSettings(): SeoSettings {
  if (typeof window === "undefined") return DEFAULT_SEO_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SEO_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SeoSettings>;
    return {
      sameAs: Array.isArray(parsed.sameAs) ? parsed.sameAs.filter(Boolean) : [],
      ratingValue: parsed.ratingValue?.toString() || DEFAULT_SEO_SETTINGS.ratingValue,
      reviewCount: parsed.reviewCount?.toString() || DEFAULT_SEO_SETTINGS.reviewCount,
    };
  } catch {
    return DEFAULT_SEO_SETTINGS;
  }
}

export function saveSeoSettings(s: SeoSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("plowwow:seo-settings-updated"));
}

export function aggregateRatingBlock(s: SeoSettings = loadSeoSettings()) {
  return {
    "@type": "AggregateRating",
    ratingValue: s.ratingValue,
    reviewCount: s.reviewCount,
  };
}

export function sameAsList(s: SeoSettings = loadSeoSettings()): string[] {
  return s.sameAs.filter((u) => /^https?:\/\//i.test(u));
}
