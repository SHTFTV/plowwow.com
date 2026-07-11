// Verifies twitter:image for each rendered route:
//   1. Is present in the head.
//   2. Points at the SAME asset as og:image (crawler parity).
//   3. Resolves to a real file under public/ with a supported MIME/format
//      matching its extension, and is not truncated.
//
// Complements og-image.reachable.test.ts (which walks route fixtures) by
// asserting the runtime DOM emission matches the fixture and the file on disk.
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import "./helpers/seo-test-guard";
import { WAIT } from "./helpers/seo-test-guard";
import { readImageMeta, formatFromExtension } from "./helpers/image-size";
import { BASE_URL } from "../../scripts/routes";

import CityPage from "@/pages/CityPage";

const ALLOWED_MIMES = new Set(["image/png", "image/jpeg"]);

const SAMPLE_SLUGS = [
  "vancouver",
  "coquitlam",
  "new-westminster",
  "port-coquitlam",
  "west-vancouver",
  "north-vancouver",
  "pitt-meadows",
  "white-rock",
];

function get(name: string, prop = false) {
  const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  return (document.head.querySelector(sel) as HTMLMetaElement | null)?.content ?? null;
}

function toPublicPath(url: string): string | null {
  if (!url.startsWith(BASE_URL + "/")) return null;
  return resolve(process.cwd(), "public", url.slice(BASE_URL.length + 1));
}

describe("twitter:image parity, MIME, and file format (rendered DOM)", () => {
  for (const slug of SAMPLE_SLUGS) {
    it(`/${slug} emits twitter:image matching og:image and a valid asset on disk`, async () => {
      render(
        <MemoryRouter initialEntries={[`/${slug}`]}>
          <Routes>
            <Route path="/:citySlug" element={<CityPage />} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(document.title.length).toBeGreaterThan(0), WAIT);

      const og = get("og:image", true);
      // CityPage emits twitter:* as <meta property=...>; some tests keep the
      // <meta name=...> fallback, so accept either.
      const tw = get("twitter:image", true) ?? get("twitter:image", false);

      expect(og, `og:image missing for /${slug}`).toBeTruthy();
      expect(tw, `twitter:image missing for /${slug}`).toBeTruthy();
      expect(tw, `twitter:image must equal og:image for /${slug}`).toBe(og);
      expect(og!.startsWith("https://"), `og:image not absolute https for /${slug}`).toBe(true);

      const p = toPublicPath(tw!);
      expect(p, `twitter:image not under ${BASE_URL} for /${slug}`).toBeTruthy();
      expect(existsSync(p!), `twitter:image file missing on disk: ${p}`).toBe(true);

      const meta = readImageMeta(p!);
      expect(meta, `twitter:image unreadable / not PNG or JPEG: ${p}`).toBeTruthy();
      expect(ALLOWED_MIMES.has(meta!.mime), `unsupported MIME ${meta!.mime}`).toBe(true);

      const declared = formatFromExtension(tw!);
      expect(declared, `twitter:image extension not .png/.jpg/.jpeg (${tw})`).toBeTruthy();
      expect(
        meta!.format,
        `extension says ${declared}, magic bytes say ${meta!.format}`,
      ).toBe(declared);
      expect(meta!.truncated, `twitter:image truncated (missing EOI/IEND)`).toBe(false);
    });
  }
});
