import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import GuestPost from "@/pages/GuestPost";
import Auth from "@/pages/Auth";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import CityPage from "@/pages/CityPage";
import { cities } from "@/data/cities";

// Recharts needs a sized container in jsdom
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

// Silence Supabase network calls; return an authenticated admin session so
// Admin/Auth mount their applyPageMeta effect without redirecting.
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

const renderPage = (path: string, element: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>
  );

const renderCity = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:citySlug" element={<CityPage />} />
      </Routes>
    </MemoryRouter>
  );

const metaName = (n: string) =>
  (document.head.querySelector(`meta[name="${n}"]`) as HTMLMetaElement | null)?.content;
const metaProp = (p: string) =>
  (document.head.querySelector(`meta[property="${p}"]`) as HTMLMetaElement | null)?.content;
const canonicalHref = () =>
  (document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href;
const jsonLdBlocks = (scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll('script[type="application/ld+json"]'))
    .map((s) => {
      try {
        return JSON.parse(s.textContent || "{}");
      } catch {
        return null;
      }
    })
    .filter(Boolean) as any[];


beforeEach(() => {
  document.head.innerHTML = "";
});

describe("SEO metadata — static pages", () => {
  const cases: Array<{
    name: string;
    path: string;
    element: React.ReactElement;
    titleIncludes: string;
    noindex: boolean;
  }> = [
    { name: "GuestPost", path: "/guest-post", element: <GuestPost />, titleIncludes: "Guest Post", noindex: false },
    { name: "Auth", path: "/auth", element: <Auth />, titleIncludes: "Sign In", noindex: true },
    { name: "Admin", path: "/admin", element: <Admin />, titleIncludes: "Admin", noindex: true },
    { name: "NotFound", path: "/does-not-exist-xyz", element: <NotFound />, titleIncludes: "Not Found", noindex: true },
  ];

  for (const c of cases) {
    it(`${c.name}: sets title, description, canonical, og:*, and JSON-LD`, async () => {
      renderPage(c.path, c.element);
      await waitFor(() => {
        expect(document.title).toContain(c.titleIncludes);
      });

      const desc = metaName("description");
      expect(desc && desc.length).toBeGreaterThan(50);
      expect(desc!.length).toBeLessThanOrEqual(200);

      const url = `${BASE}${c.path}`;
      expect(canonicalHref()).toBe(url);
      expect(metaProp("og:url")).toBe(url);
      expect(metaProp("og:title")).toBe(document.title);
      expect(metaProp("og:description")).toBe(desc);
      expect(metaProp("og:type")).toBe("website");
      expect(metaName("twitter:card")).toBe("summary_large_image");
      expect(metaProp("og:image")).toMatch(/^https:\/\/plowwow\.com\//);

      const robots = metaName("robots") || "";
      expect(robots.includes("noindex")).toBe(c.noindex);

      const blocks = jsonLdBlocks();
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks[0]["@context"]).toBe("https://schema.org");
    });
  }
});

describe("SEO metadata — dynamic /:citySlug", () => {
  const sample = cities.slice(0, 4);

  it.each(sample.map((c) => [c.slug]))(
    "city %s has self-referencing canonical (path) and LocalBusiness+FAQ JSON-LD",
    async (slug) => {
      renderCity(`/${slug}`);
      await waitFor(() => {
        expect(document.title).toContain("PlowWow");
      });
      // Canonical/og:url self-reference by path (origin varies in jsdom)
      const canon = canonicalHref()!;
      expect(canon.endsWith(`/${slug}`)).toBe(true);
      expect(metaProp("og:url")!.endsWith(`/${slug}`)).toBe(true);
      expect(metaProp("og:title")).toBe(document.title);
      expect(metaProp("og:image")).toMatch(/^https?:\/\//);
      const desc = metaName("description")!;
      expect(desc.length).toBeGreaterThan(30);
      expect(desc.length).toBeLessThanOrEqual(200);
      const types = jsonLdBlocks().map((b) => b["@type"]);
      expect(types).toContain("LocalBusiness");
      expect(types).toContain("FAQPage");
    }
  );

  it("titles differ across sample city routes", async () => {
    const titles: string[] = [];
    for (const c of sample) {
      document.head.innerHTML = "";
      const { unmount } = renderCity(`/${c.slug}`);
      await waitFor(() => expect(document.title).toContain("PlowWow"));
      titles.push(document.title);
      unmount();
    }
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("sitemap.xml + robots.txt inclusion rules", () => {
  const sitemap = readFileSync(resolve(process.cwd(), "public/sitemap.xml"), "utf8");
  const robots = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");

  it("sitemap includes /guest-post and /seo-report", () => {
    expect(sitemap).toContain(`${BASE}/guest-post`);
    expect(sitemap).toContain(`${BASE}/seo-report`);
  });

  it("sitemap excludes private /auth and /admin routes", () => {
    expect(sitemap).not.toMatch(/<loc>https:\/\/plowwow\.com\/auth<\/loc>/);
    expect(sitemap).not.toMatch(/<loc>https:\/\/plowwow\.com\/admin(\/|<)/);
  });

  it("robots.txt disallows /auth and /admin, references sitemap", () => {
    expect(robots).toMatch(/Disallow:\s*\/admin/);
    expect(robots).toMatch(/Disallow:\s*\/auth/);
    expect(robots).toMatch(/Sitemap:\s*https:\/\/plowwow\.com\/sitemap\.xml/);
  });

  it("sitemap uses absolute plowwow.com URLs only", () => {
    const locs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) expect(loc.startsWith("https://plowwow.com/")).toBe(true);
  });
});
