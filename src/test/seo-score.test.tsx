/**
 * Lightweight Lighthouse-style on-page SEO scorecard.
 *
 * Runs each key route in jsdom, checks a fixed rubric of rich-preview and
 * on-page SEO signals, and fails CI if the score drops below THRESHOLD.
 * This is intentionally deterministic (no headless browser) so it can run
 * on every PR without pulling Chromium.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import GuestPost from "@/pages/GuestPost";
import Auth from "@/pages/Auth";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import CityPage from "@/pages/CityPage";
import { cities } from "@/data/cities";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

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

const THRESHOLD = 90; // %

type Check = { name: string; weight: number; pass: boolean; note?: string };

function scorePage(opts: { allowNoindex?: boolean } = {}): { score: number; checks: Check[] } {
  const head = document.head;
  const title = document.title || "";
  const desc =
    (head.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content || "";
  const canonical =
    (head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href || "";
  const ogTitle = (head.querySelector('meta[property="og:title"]') as HTMLMetaElement | null)
    ?.content;
  const ogDesc = (head.querySelector('meta[property="og:description"]') as HTMLMetaElement | null)
    ?.content;
  const ogUrl = (head.querySelector('meta[property="og:url"]') as HTMLMetaElement | null)?.content;
  const ogImage = (head.querySelector('meta[property="og:image"]') as HTMLMetaElement | null)
    ?.content;
  const twCard =
    (head.querySelector('meta[name="twitter:card"]') as HTMLMetaElement | null)?.content ||
    (head.querySelector('meta[property="twitter:card"]') as HTMLMetaElement | null)?.content;
  const robots =
    (head.querySelector('meta[name="robots"]') as HTMLMetaElement | null)?.content || "";
  const ldBlocks = document.querySelectorAll('script[type="application/ld+json"]');

  const checks: Check[] = [
    { name: "title 10–60 chars", weight: 10, pass: title.length >= 10 && title.length <= 65 },
    { name: "meta description 50–200 chars", weight: 10, pass: desc.length >= 50 && desc.length <= 200 },
    { name: "canonical link present + absolute", weight: 10, pass: /^https?:\/\//.test(canonical) },
    { name: "og:title matches title", weight: 8, pass: !!ogTitle && ogTitle === title },
    { name: "og:description matches description", weight: 8, pass: !!ogDesc && ogDesc === desc },
    { name: "og:url matches canonical", weight: 8, pass: !!ogUrl && ogUrl === canonical },
    { name: "og:image absolute URL", weight: 10, pass: !!ogImage && /^https?:\/\//.test(ogImage) },
    { name: "twitter:card = summary_large_image", weight: 6, pass: twCard === "summary_large_image" },
    { name: "≥1 JSON-LD block", weight: 15, pass: ldBlocks.length >= 1 },
    {
      name: opts.allowNoindex ? "robots noindex correctly set" : "robots indexable",
      weight: 15,
      pass: opts.allowNoindex ? robots.includes("noindex") : !robots.includes("noindex"),
    },
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  return { score: Math.round((got / total) * 100), checks };
}

function report(name: string, res: { score: number; checks: Check[] }) {
  const failed = res.checks.filter((c) => !c.pass).map((c) => `- ${c.name}`);
  return `${name}: ${res.score}%${failed.length ? "\n" + failed.join("\n") : ""}`;
}

beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("Lighthouse-style SEO scorecard (≥90%)", () => {
  const staticCases: Array<{
    name: string;
    path: string;
    el: React.ReactElement;
    noindex: boolean;
  }> = [
    { name: "GuestPost", path: "/guest-post", el: <GuestPost />, noindex: false },
    { name: "Auth", path: "/auth", el: <Auth />, noindex: true },
    { name: "Admin", path: "/admin", el: <Admin />, noindex: true },
    { name: "NotFound", path: "/missing", el: <NotFound />, noindex: true },
  ];

  for (const c of staticCases) {
    it(`${c.name} scores ≥ ${THRESHOLD}%`, async () => {
      render(
        <MemoryRouter initialEntries={[c.path]}>
          <Routes>
            <Route path="*" element={c.el} />
          </Routes>
        </MemoryRouter>
      );
      await waitFor(() => expect(document.title.length).toBeGreaterThan(0));
      const res = scorePage({ allowNoindex: c.noindex });
      if (res.score < THRESHOLD) throw new Error(report(c.name, res));
      expect(res.score).toBeGreaterThanOrEqual(THRESHOLD);
    });
  }

  it.each(cities.slice(0, 4).map((c) => [c.slug]))(
    "city /%s scores ≥ %d%%",
    async (slug) => {
      render(
        <MemoryRouter initialEntries={[`/${slug}`]}>
          <Routes>
            <Route path="/:citySlug" element={<CityPage />} />
          </Routes>
        </MemoryRouter>
      );
      await waitFor(() => expect(document.title).toContain("PlowWow"));
      const res = scorePage({ allowNoindex: false });
      if (res.score < THRESHOLD) throw new Error(report(`city:${slug}`, res));
      expect(res.score).toBeGreaterThanOrEqual(THRESHOLD);
    }
  );
});
