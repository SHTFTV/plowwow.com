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

const BASE = "https://www.plowwow.com";

// Each entry: raw path we navigate to. We don't hard-code the canonical
// because jsdom normalizes <link href> (percent-encoding unicode); instead
// we assert canonical === og:url === `${BASE}${location.pathname}` parity.
const EDGE_SLUGS = [
  { label: "percent-encoded space", raw: "/%20vancouver" },
  { label: "percent-encoded non-ascii", raw: "/%C3%BCbercity" },
  { label: "unicode literal", raw: "/münchen" },
  { label: "trailing dash", raw: "/vancouver-" },
  { label: "leading dash", raw: "/-vancouver" },
  { label: "double dash", raw: "/burnaby--east" },
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

      const expectedTitle = "Page Not Found (404) | PlowWow";
      const expectedDesc =
        "The page you are looking for does not exist. Return to PlowWow for 24/7 snow removal, salting, and de-icing across Greater Vancouver.";
      const expectedOg = `${BASE}/og-default.jpg`;

      expect(document.title).toBe(expectedTitle);
      expect(metaName("description")).toBe(expectedDesc);
      expect(metaProp("og:title")).toBe(expectedTitle);
      expect(metaProp("og:description")).toBe(expectedDesc);
      expect(metaProp("og:image")).toBe(expectedOg);
      expect(metaProp("twitter:image") ?? metaName("twitter:image")).toBe(expectedOg);
      expect(metaName("robots")).toBe("noindex, nofollow");

      // canonical/og:url parity: they must self-reference the same URL,
      // built from the current pathname — never null and never point elsewhere.
      const canon = canonical();
      const ogUrl = metaProp("og:url");
      expect(canon).toBeTruthy();
      expect(ogUrl).toBeTruthy();
      // jsdom URL-normalizes <link href>; og:url stores the raw string. Both
      // must resolve to the same absolute URL when compared via new URL().
      expect(new URL(canon!).href).toBe(new URL(ogUrl!).href);
      expect(new URL(canon!).origin).toBe(BASE);
      // Never a homepage redirect: pathname must not be "/".
      expect(new URL(canon!).pathname).not.toBe("/");

      // og:image === twitter:image parity for these edge routes.
      expect(metaProp("og:image")).toBe(metaProp("twitter:image") ?? metaName("twitter:image"));
    });
  }
});
