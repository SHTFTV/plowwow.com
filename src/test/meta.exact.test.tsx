// Exact per-route meta-tag assertions.
// Fixture is the source of truth: if a route's title/desc/og:image changes,
// update this table (or the page) — never both silently drift.
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import "./helpers/seo-test-guard";
import { WAIT } from "./helpers/seo-test-guard";

import GuestPost from "@/pages/GuestPost";
import Auth from "@/pages/Auth";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import CityPage from "@/pages/CityPage";
import { getCityBySlug } from "@/data/cities";
import { truncateForMeta } from "@/lib/seo";

vi.mock("@/integrations/supabase/client", () => {
  const fakeSession = { user: { id: "test-admin" } };
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: fakeSession } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ error: null }),
        signUp: () => Promise.resolve({ error: null }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          range: () => Promise.resolve({ data: [], count: 0, error: null }),
          maybeSingle: () => Promise.resolve({ data: { role: "admin" }, error: null }),
        };
        return chain;
      },
    },
  };
});

const BASE = "https://plowwow.com";

type Expected = {
  name: string;
  path: string;
  el: React.ReactElement;
  title: string;
  description: string;
  ogImage: string;
  robots: "index, follow" | "noindex, nofollow";
};

// If a page updates its metadata, update the matching entry here.
const FIXTURES: Expected[] = [
  {
    name: "GuestPost",
    path: "/guest-post",
    el: <GuestPost />,
    title: "Submit a Guest Post | PlowWow Snow Removal Blog",
    description:
      "Pitch a guest post to PlowWow: share snow removal, strata liability, or winter ops expertise with contractors and property managers across BC.",
    ogImage: `${BASE}/og-default.jpg`,
    robots: "index, follow",
  },
  {
    name: "Auth",
    path: "/auth",
    el: <Auth />,
    title: "Sign In | PlowWow Contractor Portal",
    description:
      "Secure sign-in for PlowWow contractors and admins. Access your snow ops dashboard, takeoff estimates, and account tools.",
    ogImage: `${BASE}/og-default.jpg`,
    robots: "noindex, nofollow",
  },
  {
    name: "Admin",
    path: "/admin",
    el: <Admin />,
    title: "Admin Dashboard | PlowWow",
    description:
      "PlowWow internal admin dashboard for managing quote requests, contractors, and snow ops operations.",
    ogImage: `${BASE}/og-default.jpg`,
    robots: "noindex, nofollow",
  },
  {
    name: "NotFound",
    path: "/definitely-missing",
    el: <NotFound />,
    title: "Page Not Found (404) | PlowWow",
    description:
      "The page you are looking for does not exist. Return to PlowWow for 24/7 snow removal, salting, and de-icing across Greater Vancouver.",
    ogImage: `${BASE}/og-default.jpg`,
    robots: "noindex, nofollow",
  },
];

const get = {
  name: (n: string) =>
    (document.head.querySelector(`meta[name="${n}"]`) as HTMLMetaElement | null)?.content ?? null,
  prop: (p: string) =>
    (document.head.querySelector(`meta[property="${p}"]`) as HTMLMetaElement | null)?.content ??
    null,
  canonical: () =>
    (document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href ?? null,
};

describe("exact meta-tag values per route", () => {
  for (const f of FIXTURES) {
    it(`${f.name} exposes the expected head tags exactly`, async () => {
      render(
        <MemoryRouter initialEntries={[f.path]}>
          <Routes>
            <Route path="*" element={f.el} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(document.title).toBe(f.title), WAIT);

      const url = `${BASE}${f.path}`;
      expect({
        title: document.title,
        description: get.name("description"),
        canonical: get.canonical(),
        "og:title": get.prop("og:title"),
        "og:description": get.prop("og:description"),
        "og:url": get.prop("og:url"),
        "og:type": get.prop("og:type"),
        "og:image": get.prop("og:image"),
        "twitter:card": get.name("twitter:card"),
        "twitter:title": get.name("twitter:title"),
        "twitter:description": get.name("twitter:description"),
        "twitter:image": get.name("twitter:image"),
        robots: get.name("robots"),
      }).toEqual({
        title: f.title,
        description: f.description,
        canonical: url,
        "og:title": f.title,
        "og:description": f.description,
        "og:url": url,
        "og:type": "website",
        "og:image": f.ogImage,
        "twitter:card": "summary_large_image",
        "twitter:title": f.title,
        "twitter:description": f.description,
        "twitter:image": f.ogImage,
        robots: f.robots,
      });
    });
  }
});

// -----------------------------------------------------------------------------
// Dynamic /:citySlug routes — CityPage builds meta from src/data/cities.ts.
// Uses window.location.origin (jsdom default) for canonical/og:url, matching
// the runtime behavior of the page itself.
// -----------------------------------------------------------------------------
// Includes single-word, dashed, and multi-dashed edge-case slugs so meta
// generation is proven consistent across slug shapes.
const CITY_SAMPLE_SLUGS = [
  "vancouver",
  "coquitlam",
  "new-westminster",
  "port-moody",
  "port-coquitlam",
  "west-vancouver",
  "north-vancouver",
  "pitt-meadows",
  "maple-ridge",
  "white-rock",
];

describe("exact meta-tag values for dynamic /:citySlug routes", () => {
  for (const slug of CITY_SAMPLE_SLUGS) {
    it(`/${slug} renders CityPage meta + JSON-LD exactly`, async () => {
      const city = getCityBySlug(slug);
      expect(city, `city fixture missing for slug ${slug}`).toBeTruthy();

      const expectedTitle = `${city!.tagline} | PlowWow`;
      const expectedDescription = truncateForMeta(city!.intro);
      const origin = window.location.origin.replace(/\/+$/, "");
      const expectedUrl = `${origin}/${city!.slug}`;
      const expectedOg = city!.ogImage;

      render(
        <MemoryRouter initialEntries={[`/${slug}`]}>
          <Routes>
            <Route path="/:citySlug" element={<CityPage />} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(document.title).toBe(expectedTitle), WAIT);

      expect({
        title: document.title,
        description: get.name("description"),
        canonical: get.canonical(),
        "og:title": get.prop("og:title"),
        "og:description": get.prop("og:description"),
        "og:url": get.prop("og:url"),
        "og:type": get.prop("og:type"),
        "og:image": get.prop("og:image"),
        "twitter:card": get.prop("twitter:card") ?? get.name("twitter:card"),
        "twitter:title": get.prop("twitter:title") ?? get.name("twitter:title"),
        "twitter:description":
          get.prop("twitter:description") ?? get.name("twitter:description"),
        "twitter:image": get.prop("twitter:image") ?? get.name("twitter:image"),
      }).toEqual({
        title: expectedTitle,
        description: expectedDescription,
        canonical: expectedUrl,
        "og:title": expectedTitle,
        "og:description": expectedDescription,
        "og:url": expectedUrl,
        "og:type": "website",
        "og:image": expectedOg,
        "twitter:card": "summary_large_image",
        "twitter:title": expectedTitle,
        "twitter:description": expectedDescription,
        "twitter:image": expectedOg,
      });

      // JSON-LD: LocalBusiness + FAQPage should both be present with the
      // expected shape wired to this city.
      const blocks = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
      )
        .map((n) => {
          try {
            return JSON.parse(n.textContent || "{}");
          } catch {
            return null;
          }
        })
        .filter((b): b is Record<string, any> => b && typeof b === "object");

      const local = blocks.find((b) => b["@type"] === "LocalBusiness");
      const faq = blocks.find((b) => b["@type"] === "FAQPage");

      expect(local, "LocalBusiness JSON-LD present").toBeTruthy();
      expect(local!["@context"]).toBe("https://schema.org");
      expect(local!.name).toBe(`PlowWow Snow Removal — ${city!.name}`);
      expect(local!.url).toBe(expectedUrl);
      expect(local!.image).toBe(expectedOg);
      expect(local!.areaServed).toEqual({
        "@type": "City",
        name: `${city!.name}, ${city!.province}`,
      });

      expect(faq, "FAQPage JSON-LD present").toBeTruthy();
      expect(faq!["@context"]).toBe("https://schema.org");
      expect(Array.isArray(faq!.mainEntity)).toBe(true);
      expect(faq!.mainEntity.length).toBe(city!.faqs.length);
      for (const entry of faq!.mainEntity) {
        expect(entry["@type"]).toBe("Question");
        expect(typeof entry.name).toBe("string");
        expect(entry.acceptedAnswer["@type"]).toBe("Answer");
        expect(typeof entry.acceptedAnswer.text).toBe("string");
      }

      // ---- DOM ↔ JSON-LD cross-validation ---------------------------------
      // The values crawlers ingest from the head MUST match the values inside
      // the structured data. Drift between them creates split-brain SEO where
      // Google's rich-result parser sees one URL/image and social crawlers
      // another. Assert exact equality on the two fields that matter most.
      expect(local!.url, `LocalBusiness.url must equal canonical for /${slug}`).toBe(
        get.canonical(),
      );
      expect(local!.url, `LocalBusiness.url must equal og:url for /${slug}`).toBe(
        get.prop("og:url"),
      );
      expect(local!.image, `LocalBusiness.image must equal og:image for /${slug}`).toBe(
        get.prop("og:image"),
      );
      expect(
        local!.image,
        `LocalBusiness.image must equal twitter:image for /${slug}`,
      ).toBe(get.prop("twitter:image") ?? get.name("twitter:image"));
    });
  }
});
