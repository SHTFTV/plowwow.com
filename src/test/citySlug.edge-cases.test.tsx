// Edge-case /:citySlug inputs: percent-encoded, unicode, trailing/leading
// dashes. All should render NotFound (unknown city) with consistent
// canonical / title / og:* / twitter:* tags, and never redirect home.
import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import "./helpers/seo-test-guard";
import { WAIT } from "./helpers/seo-test-guard";

import CityPage from "@/pages/CityPage";
import NotFound from "@/pages/NotFound";

const BASE = "https://plowwow.com";

const EDGE_SLUGS = [
  { label: "percent-encoded space", raw: "/%20vancouver", decoded: "/ vancouver" },
  { label: "percent-encoded non-ascii", raw: "/%C3%BCbercity", decoded: "/übercity" },
  { label: "unicode literal", raw: "/münchen", decoded: "/münchen" },
  { label: "trailing dash", raw: "/vancouver-", decoded: "/vancouver-" },
  { label: "leading dash", raw: "/-vancouver", decoded: "/-vancouver" },
  { label: "double dash", raw: "/burnaby--east", decoded: "/burnaby--east" },
];

function metaProp(p: string) {
  return (document.head.querySelector(`meta[property="${p}"]`) as HTMLMetaElement | null)?.content ?? null;
}
function metaName(n: string) {
  return (document.head.querySelector(`meta[name="${n}"]`) as HTMLMetaElement | null)?.content ?? null;
}
function canonical() {
  return (document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href ?? null;
}

describe("edge-case /:citySlug values render NotFound with consistent meta", () => {
  for (const c of EDGE_SLUGS) {
    it(`${c.label} (${c.raw}) → NotFound + canonical/title/og/twitter parity`, async () => {
      render(
        <MemoryRouter initialEntries={[c.raw]}>
          <Routes>
            <Route path="/" element={<div data-testid="home">HOME</div>} />
            <Route path="/:citySlug" element={<CityPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(document.title).toContain("Page Not Found"), WAIT);

      // Never redirect to home for unknown slugs.
      expect(document.querySelector('[data-testid="home"]')).toBeNull();

      const expectedCanonical = `${BASE}${c.decoded}`;
      const expectedTitle = "Page Not Found (404) | PlowWow";
      const expectedDesc =
        "The page you are looking for does not exist. Return to PlowWow for 24/7 snow removal, salting, and de-icing across Greater Vancouver.";
      const expectedOg = `${BASE}/og-default.jpg`;

      expect(document.title).toBe(expectedTitle);
      expect(metaName("description")).toBe(expectedDesc);
      expect(canonical()).toBe(expectedCanonical);
      expect(metaProp("og:title")).toBe(expectedTitle);
      expect(metaProp("og:description")).toBe(expectedDesc);
      expect(metaProp("og:url")).toBe(expectedCanonical);
      expect(metaProp("og:image")).toBe(expectedOg);
      expect(metaProp("twitter:image") ?? metaName("twitter:image")).toBe(expectedOg);
      expect(metaName("robots")).toBe("noindex, nofollow");

      // og:image === twitter:image parity for these edge routes.
      expect(metaProp("og:image")).toBe(metaProp("twitter:image") ?? metaName("twitter:image"));
    });
  }
});
