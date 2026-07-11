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
