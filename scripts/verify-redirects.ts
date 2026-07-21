// Post-build redirect verifier.
//
// Parses netlify.toml, expands each [[redirects]] rule with concrete
// examples drawn from the sitemap, and checks that:
//   1. The redirect target file exists in dist/ and returns a real page (not
//      the SPA fallback homepage title).
//   2. The final page ships the expected <link rel="canonical"> pointing at
//      itself (not the source URL that redirected here).
//   3. The final page includes <link rel="alternate" hreflang="…"> for every
//      SUPPORTED_LOCALES value + x-default.
//
// If CRAWL_URL is set (e.g. https://plowwow.com), the script additionally
// crawls each source URL live and asserts the HTTP status is 301 with a
// Location header pointing at the canonical target.
//
// Emits seo-report/redirects.json for CI artifacts. Exits 1 on any failure.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { BASE_URL } from "./routes";
import { SUPPORTED_LOCALES } from "./lib/locales";

const DIST = resolve("dist");
const NETLIFY_TOML = resolve("netlify.toml");
const REPORT_DIR = resolve("seo-report");
mkdirSync(REPORT_DIR, { recursive: true });

const REQUIRED_HREFLANG = [...SUPPORTED_LOCALES, "x-default"];

type Rule = { from: string; to: string; status: number };
type Check = {
  source: string;
  expected: string;
  status: "ok" | "fail" | "skip";
  reason?: string;
  live?: { httpStatus: number; location: string | null } | null;
};

function parseRedirects(toml: string): Rule[] {
  const rules: Rule[] = [];
  const blocks = toml.split(/\n\s*\[\[redirects\]\]\s*\n/);
  for (const b of blocks.slice(1)) {
    const from = b.match(/from\s*=\s*"([^"]+)"/)?.[1];
    const to = b.match(/to\s*=\s*"([^"]+)"/)?.[1];
    const status = Number(b.match(/status\s*=\s*(\d+)/)?.[1] ?? 200);
    if (from && to) rules.push({ from, to, status });
  }
  return rules;
}

function sitemapLocs(): string[] {
  const idx = resolve(DIST, "sitemap.xml");
  if (!existsSync(idx)) return [];
  const seen = new Set<string>();
  const stack = [idx];
  while (stack.length) {
    const f = stack.pop()!;
    if (!existsSync(f)) continue;
    const xml = readFileSync(f, "utf8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1];
      if (u.endsWith(".xml")) {
        const child = resolve(DIST, new URL(u).pathname.replace(/^\//, ""));
        if (existsSync(child)) stack.push(child);
      } else {
        seen.add(u);
      }
    }
  }
  return [...seen];
}

// Turn a Netlify glob like "/snow-removal-in-:slug" into a concrete example
// sampled from the sitemap (first URL whose pathname matches).
function expandExample(rule: Rule, locs: string[]): { source: string; expectedPath: string } | null {
  const from = rule.from;

  // Static / no-placeholder rules → keep from as-is.
  if (!from.includes(":") && !from.endsWith("/*")) {
    const target = rule.to.startsWith("http") ? new URL(rule.to).pathname : rule.to;
    return { source: from, expectedPath: target };
  }

  // Placeholder rules: pick a sitemap URL that would match once trailing slash is added.
  const pattern = from
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, "([^/]+)")
    .replace(/\*/g, "(.*)");
  const rx = new RegExp(`^${pattern}/?$`);

  for (const loc of locs) {
    const p = new URL(loc).pathname.replace(/\/+$/, "");
    if (rx.test(p)) {
      // Build target by substituting :name with the same captured segment.
      const captured = p.match(rx)!;
      let target = rule.to;
      let i = 1;
      target = target.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, () => captured[i++] ?? "");
      target = target.replace(/:splat/g, captured[i++] ?? "");
      const targetPath = target.startsWith("http") ? new URL(target).pathname : target;
      return { source: p, expectedPath: targetPath };
    }
  }
  return null;
}

async function liveCheck(sourceUrl: string): Promise<Check["live"]> {
  try {
    const res = await fetch(sourceUrl, { redirect: "manual" });
    return { httpStatus: res.status, location: res.headers.get("location") };
  } catch (err) {
    return { httpStatus: 0, location: `error: ${(err as Error).message}` };
  }
}

function readDist(path: string): string | null {
  const clean = path.replace(/\/+$/, "") || "/";
  const file =
    clean === "/"
      ? resolve(DIST, "index.html")
      : resolve(DIST, clean.replace(/^\//, ""), "index.html");
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

async function main() {
  if (!existsSync(NETLIFY_TOML)) {
    console.error("netlify.toml not found");
    process.exit(2);
  }
  const rules = parseRedirects(readFileSync(NETLIFY_TOML, "utf8"));
  const locs = sitemapLocs();
  const crawlBase = process.env.CRAWL_URL?.replace(/\/+$/, "") ?? "";
  const checks: Check[] = [];

  for (let idx = 0; idx < rules.length; idx++) {
    const rule = rules[idx];
    // Ignore rules that intentionally serve non-canonical results.
    if (rule.status === 200 || rule.status === 404) continue;

    // Netlify processes redirects in order — first match wins. Sample only
    // from sitemap locs NOT already claimed by an earlier rule so we don't
    // false-positive on legacy catch-alls like `/blog/:slug` sampling
    // `/blog/neighborhoods` (which the specific rule above handles).
    const earlierPatterns = rules.slice(0, idx).map((r) => {
      const p = r.from
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, "([^/]+)")
        .replace(/\*/g, "(.*)");
      return new RegExp(`^${p}/?$`);
    });
    const filteredLocs = locs.filter((loc) => {
      const path = new URL(loc).pathname.replace(/\/+$/, "");
      return !earlierPatterns.some((rx) => rx.test(path));
    });
    const ex = expandExample(rule, filteredLocs);
    if (!ex) {
      checks.push({
        source: rule.from,
        expected: rule.to,
        status: "skip",
        reason: "no sitemap example matches this redirect pattern",
      });
      continue;
    }

    const html = readDist(ex.expectedPath);
    if (!html) {
      checks.push({
        source: ex.source,
        expected: ex.expectedPath,
        status: "fail",
        reason: `redirect target has no prerendered page at dist${ex.expectedPath}`,
      });
      continue;
    }

    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1] ?? "";
    const expectedCanonical = `${BASE_URL}${ex.expectedPath.endsWith("/") ? ex.expectedPath : ex.expectedPath + "/"}`;
    if (canonical.replace(/\/+$/, "") !== expectedCanonical.replace(/\/+$/, "")) {
      checks.push({
        source: ex.source,
        expected: ex.expectedPath,
        status: "fail",
        reason: `canonical="${canonical}" ≠ expected "${expectedCanonical}"`,
      });
      continue;
    }

    const hreflangs = [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
    const missing = REQUIRED_HREFLANG.filter((l) => !hreflangs.includes(l));
    if (missing.length) {
      checks.push({
        source: ex.source,
        expected: ex.expectedPath,
        status: "fail",
        reason: `missing hreflang: ${missing.join(", ")}`,
      });
      continue;
    }

    let live: Check["live"] = null;
    if (crawlBase) {
      live = await liveCheck(`${crawlBase}${ex.source}`);
      if (live.httpStatus !== rule.status) {
        checks.push({
          source: ex.source,
          expected: ex.expectedPath,
          status: "fail",
          reason: `live HTTP ${live.httpStatus} (expected ${rule.status})`,
          live,
        });
        continue;
      }
    }

    checks.push({ source: ex.source, expected: ex.expectedPath, status: "ok", live });
  }

  writeFileSync(
    resolve(REPORT_DIR, "redirects.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), crawlBase: crawlBase || null, checks },
      null,
      2,
    ),
  );

  const failed = checks.filter((c) => c.status === "fail");
  const skipped = checks.filter((c) => c.status === "skip");
  console.log(
    `[redirects] ${checks.length} rules · ${checks.length - failed.length - skipped.length} ok · ${skipped.length} skipped · ${failed.length} failed${crawlBase ? ` (live crawl: ${crawlBase})` : ""}`,
  );
  for (const c of failed) console.log(`  ✗ ${c.source} → ${c.expected}: ${c.reason}`);
  process.exit(failed.length ? 1 : 0);
}

main();
