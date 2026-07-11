// DOM ↔ JSON-LD + og/twitter image parity for static routes.
// Covers /guest-post, /auth, /admin, /seo-report — asserts:
//   - og:image === twitter:image (same asset).
//   - Image file exists under public/ with a valid PNG/JPEG MIME matching ext.
//   - canonical === og:url === WebPage JSON-LD `url` field.
//   - BreadcrumbList (when present) terminates at the same canonical URL.
import { describe, it, expect, vi } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import "./helpers/seo-test-guard";
import { WAIT } from "./helpers/seo-test-guard";
import { readImageMeta, formatFromExtension } from "./helpers/image-size";
import { BASE_URL } from "../../scripts/routes";

import GuestPost from "@/pages/GuestPost";
import Auth from "@/pages/Auth";
import Admin from "@/pages/Admin";
import SeoReport from "@/pages/SeoReport";
import Intelligence from "@/pages/Intelligence";
import AppFeatures from "@/pages/AppFeatures";
import BlogIndex from "@/pages/BlogIndex";
import Takeoff from "@/pages/Takeoff";

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

const ALLOWED_MIMES = new Set(["image/png", "image/jpeg"]);

function metaProp(p: string) {
  return (document.head.querySelector(`meta[property="${p}"]`) as HTMLMetaElement | null)?.content ?? null;
}
function metaName(n: string) {
  return (document.head.querySelector(`meta[name="${n}"]`) as HTMLMetaElement | null)?.content ?? null;
}
function canonical() {
  return (document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href ?? null;
}
function jsonLdBlocks() {
  return Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'))
    .map((n) => {
      try {
        return JSON.parse(n.textContent || "{}");
      } catch {
        return null;
      }
    })
    .filter((b): b is Record<string, any> => b && typeof b === "object");
}

type Case = { name: string; path: string; el: React.ReactElement; expectedCanonical: string };
const CASES: Case[] = [
  { name: "GuestPost", path: "/guest-post", el: <GuestPost />, expectedCanonical: "https://plowwow.com/guest-post" },
  { name: "Auth", path: "/auth", el: <Auth />, expectedCanonical: "https://plowwow.com/auth" },
  { name: "Admin", path: "/admin", el: <Admin />, expectedCanonical: "https://plowwow.com/admin" },
  { name: "SeoReport", path: "/seo-report", el: <SeoReport />, expectedCanonical: "https://plowwow.com/seo-report" },
];

describe("static routes: og/twitter parity + DOM↔JSON-LD cross-validation", () => {
  for (const c of CASES) {
    it(`${c.name} (${c.path}) — og:image === twitter:image, canonical === og:url === WebPage.url`, async () => {
      render(
        <MemoryRouter initialEntries={[c.path]}>
          <Routes>
            <Route path="*" element={c.el} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(document.title.length).toBeGreaterThan(0), WAIT);

      // og/twitter image parity
      const og = metaProp("og:image");
      const tw = metaProp("twitter:image") ?? metaName("twitter:image");
      expect(og, `og:image missing for ${c.path}`).toBeTruthy();
      expect(tw, `twitter:image missing for ${c.path}`).toBeTruthy();
      expect(tw, `twitter:image must equal og:image for ${c.path}`).toBe(og);

      // Image on disk with valid MIME/format matching extension
      expect(og!.startsWith(BASE_URL + "/"), `og:image not absolute plowwow URL: ${og}`).toBe(true);
      const p = resolve(process.cwd(), "public", og!.slice(BASE_URL.length + 1));
      expect(existsSync(p), `og:image file missing on disk: ${p}`).toBe(true);
      const meta = readImageMeta(p);
      expect(meta, `og:image unreadable / not PNG or JPEG: ${p}`).toBeTruthy();
      expect(ALLOWED_MIMES.has(meta!.mime), `unsupported MIME ${meta!.mime}`).toBe(true);
      const declared = formatFromExtension(og!);
      expect(declared, `og:image extension not .png/.jpg/.jpeg (${og})`).toBeTruthy();
      expect(meta!.format).toBe(declared);
      expect(meta!.truncated, `og:image truncated`).toBe(false);

      // canonical / og:url parity with expected
      const canon = canonical();
      const ogUrl = metaProp("og:url");
      expect(canon).toBe(c.expectedCanonical);
      expect(ogUrl).toBe(c.expectedCanonical);

      // JSON-LD cross-validation
      const blocks = jsonLdBlocks();
      const webPage = blocks.find((b) => b["@type"] === "WebPage");
      expect(webPage, `WebPage JSON-LD missing for ${c.path}`).toBeTruthy();
      expect(webPage!.url, `WebPage.url must equal canonical for ${c.path}`).toBe(canon);
      expect(webPage!.url, `WebPage.url must equal og:url for ${c.path}`).toBe(ogUrl);

      // BreadcrumbList (when present) terminates at the same URL.
      const crumb = blocks.find((b) => b["@type"] === "BreadcrumbList");
      if (crumb) {
        const last = crumb.itemListElement[crumb.itemListElement.length - 1];
        expect(last.item, `BreadcrumbList tail must equal canonical for ${c.path}`).toBe(canon);
      }
    });
  }
});
