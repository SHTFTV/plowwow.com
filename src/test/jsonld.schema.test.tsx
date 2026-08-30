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

// ---------- JSON-LD schema validator ----------

const KNOWN_TYPES = new Set([
  "WebPage",
  "WebSite",
  "Organization",
  "LocalBusiness",
  "BreadcrumbList",
  "FAQPage",
  "Question",
  "Answer",
  "Article",
  "BlogPosting",
  "Service",
  "SearchAction",
  "ImageObject",
  "Person",
  "PostalAddress",
  "GeoCoordinates",
  "AggregateRating",
  "Review",
  "OfferCatalog",
  "Offer",
  "VideoObject",
]);

type Block = Record<string, any>;

function isUrl(v: unknown): boolean {
  return typeof v === "string" && /^https?:\/\//.test(v);
}

/** Assert a JSON-LD block conforms to basic schema.org shape and expected type family. */
function validateBlock(block: Block, ctx: string) {
  expect(block["@context"], `${ctx} missing @context`).toBe("https://schema.org");
  expect(block["@type"], `${ctx} missing @type`).toBeTruthy();
  const t = block["@type"];
  const types = Array.isArray(t) ? t : [t];
  for (const ty of types) {
    expect(KNOWN_TYPES.has(ty), `${ctx} unknown @type "${ty}"`).toBe(true);
  }

  // Type-specific required fields.
  if (types.includes("BreadcrumbList")) {
    expect(Array.isArray(block.itemListElement), `${ctx} BreadcrumbList.itemListElement`).toBe(true);
    for (const [i, item] of block.itemListElement.entries()) {
      expect(item["@type"], `${ctx} breadcrumb[${i}].@type`).toBe("ListItem");
      expect(typeof item.position, `${ctx} breadcrumb[${i}].position`).toBe("number");
      expect(item.name || item.item?.name, `${ctx} breadcrumb[${i}].name`).toBeTruthy();
    }
  }
  if (types.includes("FAQPage")) {
    expect(Array.isArray(block.mainEntity), `${ctx} FAQPage.mainEntity`).toBe(true);
    expect(block.mainEntity.length, `${ctx} FAQPage empty`).toBeGreaterThan(0);
    for (const [i, q] of block.mainEntity.entries()) {
      expect(q["@type"], `${ctx} faq[${i}].@type`).toBe("Question");
      expect(typeof q.name, `${ctx} faq[${i}].name`).toBe("string");
      expect(q.acceptedAnswer?.["@type"], `${ctx} faq[${i}].acceptedAnswer.@type`).toBe("Answer");
      expect(typeof q.acceptedAnswer?.text, `${ctx} faq[${i}].acceptedAnswer.text`).toBe("string");
    }
  }
  if (types.includes("WebPage")) {
    expect(typeof block.name || typeof block.headline, `${ctx} WebPage.name/headline`).toBe("string");
    if (block.url) expect(isUrl(block.url), `${ctx} WebPage.url not absolute`).toBe(true);
  }
  if (types.includes("LocalBusiness")) {
    expect(block.name, `${ctx} LocalBusiness.name`).toBeTruthy();
  }
}

const readBlocks = (): Block[] =>
  Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'))
    .concat(Array.from(document.body.querySelectorAll('script[type="application/ld+json"]')))
    .map((s) => {
      try {
        return JSON.parse(s.textContent || "{}");
      } catch (e) {
        throw new Error(`invalid JSON-LD block: ${(e as Error).message}`);
      }
    });

beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("JSON-LD schema validation — static pages", () => {
  const cases: Array<{ name: string; path: string; el: React.ReactElement }> = [
    { name: "GuestPost", path: "/guest-post", el: <GuestPost /> },
    { name: "Auth", path: "/auth", el: <Auth /> },
    { name: "Admin", path: "/admin", el: <Admin /> },
    { name: "NotFound", path: "/does-not-exist", el: <NotFound /> },
  ];

  for (const c of cases) {
    it(`${c.name} emits valid schema.org JSON-LD`, async () => {
      render(
        <MemoryRouter initialEntries={[c.path]}>
          <Routes>
            <Route path="*" element={c.el} />
          </Routes>
        </MemoryRouter>
      );
      await waitFor(() => expect(document.title.length).toBeGreaterThan(0));
      const blocks = readBlocks();
      expect(blocks.length, `${c.name} must emit ≥1 JSON-LD block`).toBeGreaterThanOrEqual(1);
      for (const b of blocks) validateBlock(b, c.name);
    });
  }
});

describe("JSON-LD schema validation — sample city routes", () => {
  const sample = cities.slice(0, 4);
  it.each(sample.map((c) => [c.slug]))(
    "city /%s emits LocalBusiness + FAQPage with valid shape",
    async (slug) => {
      render(
        <MemoryRouter initialEntries={[`/${slug}`]}>
          <Routes>
            <Route path="/:citySlug" element={<CityPage />} />
          </Routes>
        </MemoryRouter>
      );
      await waitFor(() => expect(document.title).toContain("PlowWow"));
      const blocks = readBlocks();
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      for (const b of blocks) validateBlock(b, `city:${slug}`);
      const types = blocks.map((b) => b["@type"]);
      expect(types).toContain("LocalBusiness");
      expect(types).toContain("FAQPage");
    }
  );
});
