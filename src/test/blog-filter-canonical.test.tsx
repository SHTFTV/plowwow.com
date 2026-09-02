// Regression: every blog-index filter permutation (query, category slug,
// pagination, path-based tag slug) must render a self-referencing canonical
// URL. This prevents duplicate-content SEO issues if the filter state
// serialization drifts.

import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import "./helpers/seo-test-guard";
import { WAIT } from "./helpers/seo-test-guard";

import BlogIndex from "@/pages/BlogIndex";

// BlogIndex reads from the supabase client on mount for guest posts. Stub it
// out so tests stay hermetic — canonical rendering doesn't depend on data.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: [], error: null }),
      };
      return chain;
    },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  },
}));

const BASE = "https://www.plowwow.com";

type Case = { name: string; initialUrl: string; expectedCanonical: string };

const CASES: Case[] = [
  {
    name: "root /blog",
    initialUrl: "/blog",
    expectedCanonical: `${BASE}/blog`,
  },
  {
    name: "?cat=Strata",
    initialUrl: "/blog?cat=Strata",
    expectedCanonical: `${BASE}/blog/tag/strata/`,
  },
  {
    name: "?page=2",
    initialUrl: "/blog?page=2",
    expectedCanonical: `${BASE}/blog?page=2`,
  },
  {
    name: "?cat=Neighborhoods&page=3",
    initialUrl: "/blog?cat=Neighborhoods&page=3",
    expectedCanonical: `${BASE}/blog/tag/neighborhoods/?page=3`,
  },
  {
    name: "path-based /blog/tag/strata/",
    initialUrl: "/blog/tag/strata/",
    expectedCanonical: `${BASE}/blog/tag/strata/`,
  },
  {
    name: "path-based /blog/tag/neighborhoods/ with page",
    initialUrl: "/blog/tag/neighborhoods/?page=2",
    expectedCanonical: `${BASE}/blog/tag/neighborhoods/?page=2`,
  },
];

function readCanonical(): string | null {
  return (
    document
      .querySelector('link[rel="canonical"]')
      ?.getAttribute("href") ?? null
  );
}

function readOgUrl(): string | null {
  return (
    document
      .querySelector('meta[property="og:url"]')
      ?.getAttribute("content") ?? null
  );
}

describe("blog index canonical URLs are self-referencing", () => {
  for (const c of CASES) {
    it(c.name, async () => {
      // Clean any canonical/og:url left by previous tests.
      document.querySelectorAll('link[rel="canonical"], meta[property="og:url"]').forEach((n) =>
        n.remove(),
      );

      render(
        <MemoryRouter initialEntries={[c.initialUrl]}>
          <Routes>
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/tag/:tagSlug" element={<BlogIndex />} />
            <Route path="/blog/tag/:tagSlug/" element={<BlogIndex />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(readCanonical()).toBe(c.expectedCanonical);
      }, WAIT);

      // og:url should mirror canonical when both are set.
      const og = readOgUrl();
      if (og) expect(og).toBe(c.expectedCanonical);
    });
  }
});
