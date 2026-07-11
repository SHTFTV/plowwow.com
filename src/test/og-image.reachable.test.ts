// Validate that every og:image referenced by a route is reachable on disk
// (public/…), matches its declared file format / MIME, is not corrupt, and
// meets minimum social-crawler dimensions.
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { collectRoutes, BASE_URL } from "../../scripts/routes";
import { readImageMeta, formatFromExtension } from "./helpers/image-size";

// Facebook: min 200×200, recommended 1200×630. LinkedIn: min 200×200.
// We allow squares (blog thumbnails) but require substantial pixel counts.
const MIN_WIDTH = 600;
const MIN_HEIGHT = 315;
const MIN_ASPECT = 0.9; // near-square OK
const MAX_ASPECT = 2.5;

const ALLOWED_MIMES = new Set(["image/png", "image/jpeg"]);

const routes = collectRoutes().filter((r) => r.ogImage);

// Map absolute https URL → filesystem path under public/.
function toPublicPath(url: string): string | null {
  if (!url.startsWith(BASE_URL + "/")) return null;
  return resolve(process.cwd(), "public", url.slice(BASE_URL.length + 1));
}

describe("og:image reachability, format, and dimensions", () => {
  it("every route referencing an og:image points at an existing file under public/", () => {
    const missing: Array<{ path: string; ogImage: string }> = [];
    for (const r of routes) {
      const p = toPublicPath(r.ogImage!);
      if (!p || !existsSync(p)) missing.push({ path: r.path, ogImage: r.ogImage! });
    }
    expect(
      missing,
      `missing og:image files:\n${missing.slice(0, 10).map((m) => `  ${m.path} → ${m.ogImage}`).join("\n")}`,
    ).toEqual([]);
  });

  it("every og:image has a supported MIME type and matches its file extension", () => {
    const bad: Array<{ path: string; ogImage: string; reason: string }> = [];
    for (const r of routes) {
      const p = toPublicPath(r.ogImage!);
      if (!p || !existsSync(p)) continue; // covered above
      const meta = readImageMeta(p);
      const declaredFormat = formatFromExtension(r.ogImage!);
      if (!meta) {
        bad.push({ path: r.path, ogImage: r.ogImage!, reason: "unreadable / not PNG or JPEG" });
        continue;
      }
      if (!ALLOWED_MIMES.has(meta.mime)) {
        bad.push({ path: r.path, ogImage: r.ogImage!, reason: `unsupported MIME ${meta.mime}` });
        continue;
      }
      if (!declaredFormat) {
        bad.push({
          path: r.path,
          ogImage: r.ogImage!,
          reason: `extension not .png/.jpg/.jpeg (got ${r.ogImage})`,
        });
        continue;
      }
      if (declaredFormat !== meta.format) {
        bad.push({
          path: r.path,
          ogImage: r.ogImage!,
          reason: `extension says ${declaredFormat}, magic bytes say ${meta.format}`,
        });
      }
    }
    expect(
      bad,
      `og:image MIME/format failures:\n${bad.slice(0, 10).map((b) => `  ${b.path} → ${b.ogImage} (${b.reason})`).join("\n")}`,
    ).toEqual([]);
  });

  it("every og:image file is not truncated / corrupted", () => {
    const bad: Array<{ path: string; ogImage: string }> = [];
    for (const r of routes) {
      const p = toPublicPath(r.ogImage!);
      if (!p || !existsSync(p)) continue;
      const meta = readImageMeta(p);
      if (meta && meta.truncated) bad.push({ path: r.path, ogImage: r.ogImage! });
    }
    expect(
      bad,
      `truncated og:image files (missing EOI/IEND):\n${bad.slice(0, 10).map((b) => `  ${b.path} → ${b.ogImage}`).join("\n")}`,
    ).toEqual([]);
  });

  it("every og:image meets social-crawler minimum dimensions", () => {
    const bad: Array<{ path: string; ogImage: string; reason: string }> = [];
    for (const r of routes) {
      const p = toPublicPath(r.ogImage!);
      if (!p || !existsSync(p)) continue;
      const meta = readImageMeta(p);
      if (!meta) continue; // covered above
      const { width, height } = meta;
      const aspect = width / height;
      if (width < MIN_WIDTH || height < MIN_HEIGHT) {
        bad.push({
          path: r.path,
          ogImage: r.ogImage!,
          reason: `too small ${width}×${height} (need ≥${MIN_WIDTH}×${MIN_HEIGHT})`,
        });
      } else if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
        bad.push({
          path: r.path,
          ogImage: r.ogImage!,
          reason: `aspect ${aspect.toFixed(2)} outside [${MIN_ASPECT}, ${MAX_ASPECT}]`,
        });
      }
    }
    expect(
      bad,
      `og:image dimension failures:\n${bad.slice(0, 10).map((b) => `  ${b.path} → ${b.ogImage} (${b.reason})`).join("\n")}`,
    ).toEqual([]);
  });

  it("uses absolute https URLs for every og:image", () => {
    for (const r of routes) {
      expect(r.ogImage!.startsWith("https://"), `${r.path} og:image not absolute https`).toBe(true);
    }
  });
});
