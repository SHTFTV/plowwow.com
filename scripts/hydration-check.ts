// Post-build hydration check.
//
// Boots `vite preview` against dist/, then loads a sample of city + blog URLs
// with Playwright/Chromium. Waits for React to hydrate (root has React data
// attribs and a settled network state), then asserts:
//   - <link rel="canonical"> exists and still self-references the URL
//   - one <link rel="alternate" hreflang="…"> per SUPPORTED_LOCALES + x-default
//     is still in document.head (Helmet must not clobber the prerendered set)
//
// Run standalone: `bun run seo:hydration` (spawns preview) or with an already-
// running server: `HYDRATION_BASE=https://plowwow.com bun run seo:hydration`.
// Writes seo-report/hydration.{json,md}; exits non-zero on any failure.

import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { SUPPORTED_LOCALES, PRIMARY_OG_LOCALE, ALTERNATE_OG_LOCALES } from "./lib/locales";

const REQUIRED_HREFLANG = [...SUPPORTED_LOCALES, "x-default"];
const REQUIRED_OG = [
  "og:title",
  "og:description",
  "og:url",
  "og:image",
  "og:type",
  "og:locale",
] as const;
const REQUIRED_TWITTER = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"] as const;
const DIST = resolve("dist");
const SITEMAP = resolve(DIST, "sitemap.xml");

// Sample: home, /blog, /locations, 2 cities, 4 blog posts. Deterministic —
// we sort by URL so re-runs check the same routes.
function locsFrom(file: string): string[] {
  if (!existsSync(file)) return [];
  const xml = readFileSync(file, "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
function collectSample(): string[] {
  const top = locsFrom(SITEMAP);
  const pages: string[] = [];
  for (const u of top) {
    if (u.endsWith(".xml")) {
      const rel = new URL(u).pathname.replace(/^\//, "");
      pages.push(...locsFrom(resolve(DIST, rel)));
    } else {
      pages.push(u);
    }
  }
  const uniq = [...new Set(pages)].sort();
  const home = uniq.find((u) => new URL(u).pathname === "/") ?? uniq[0];
  // Sample every "hub" city and a wide slice of neighborhood/blog pages so
  // OG/Twitter (incl. og:locale:alternate) + JSON-LD get exercised across
  // every URL shape the sitemap ships. Env HYDRATION_MAX caps total pages.
  const cityRx = /\/(vancouver|burnaby|richmond|surrey|coquitlam|north-vancouver|west-vancouver|langley|maple-ridge|delta|new-westminster|port-coquitlam|port-moody|white-rock|abbotsford|chilliwack|mission|pitt-meadows|squamish|tsawwassen|anmore|belcarra)\/$/;
  const cities = uniq.filter((u) => cityRx.test(u));
  const blogs = uniq.filter((u) =>
    /-strata-commercial-snow-(removal|plowing)\/$/.test(u) ||
    /-snow-removal\/$/.test(u),
  );
  const misc = uniq.filter((u) => /\/(blog|locations|quote|app-features|intelligence)\/$/.test(u));
  const cap = Number(process.env.HYDRATION_MAX ?? 30);
  const pick = <T,>(arr: T[], n: number) => {
    if (arr.length <= n) return arr;
    const step = arr.length / n;
    return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
  };
  const combined = [
    home,
    ...misc,
    ...pick(cities, Math.min(cities.length, Math.max(6, Math.floor(cap * 0.4)))),
    ...pick(blogs, Math.min(blogs.length, Math.max(10, Math.floor(cap * 0.5)))),
  ];
  return [...new Set(combined)].slice(0, cap);
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server never became ready at ${url}`);
}

async function main() {
  const externalBase = process.env.HYDRATION_BASE?.replace(/\/+$/, "");
  const port = Number(process.env.HYDRATION_PORT ?? 4173);
  let server: ChildProcess | null = null;
  let base: string;

  if (externalBase) {
    base = externalBase;
  } else {
    base = `http://localhost:${port}`;
    server = spawn("bunx", ["vite", "preview", "--port", String(port), "--strictPort"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", () => {});
    server.stderr?.on("data", () => {});
    await waitForServer(base + "/");
  }

  // Lazy-load playwright — devDep is already present.
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });

  const sample = collectSample();
  type LdSummary = { types: string[]; ids: string[]; count: number };
  type Result = {
    url: string;
    hydrated: boolean;
    canonical: string | null;
    canonicalOk: boolean;
    hreflangs: string[];
    missingHreflang: string[];
    ogTags: Record<string, string>;
    twitterTags: Record<string, string>;
    ogLocaleAlternates: string[];
    jsonLd: LdSummary;
    jsonLdExpected: LdSummary;
    issues: string[];
  };

  // Snapshot the prerendered JSON-LD from dist/<path>/index.html so we can
  // assert every schema block that shipped in raw HTML survives hydration.
  function readStaticLd(canonicalUrl: string): LdSummary {
    const path = new URL(canonicalUrl).pathname.replace(/\/+$/, "") || "/";
    const file =
      path === "/"
        ? resolve(DIST, "index.html")
        : resolve(DIST, path.replace(/^\//, ""), "index.html");
    if (!existsSync(file)) return { types: [], ids: [], count: 0 };
    const html = readFileSync(file, "utf8");
    return summarizeLd(extractLdBlocks(html));
  }
  function extractLdBlocks(html: string): unknown[] {
    const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const out: unknown[] = [];
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html))) {
      try { out.push(JSON.parse(m[1])); } catch { /* preflight handles */ }
    }
    return out;
  }
  function summarizeLd(nodes: unknown[]): LdSummary {
    const types = new Set<string>();
    const ids = new Set<string>();
    const visit = (n: any) => {
      if (!n || typeof n !== "object") return;
      if (Array.isArray(n)) return n.forEach(visit);
      if (n["@graph"]) (n["@graph"] as any[]).forEach(visit);
      const t = n["@type"];
      if (t) (Array.isArray(t) ? t : [t]).forEach((x) => types.add(String(x)));
      if (typeof n["@id"] === "string") ids.add(n["@id"]);
    };
    nodes.forEach(visit);
    return { types: [...types].sort(), ids: [...ids].sort(), count: nodes.length };
  }

  const results: Result[] = [];

  try {
    for (const canonicalUrl of sample) {
      // Rewrite to whatever origin the preview / external target uses.
      const path = new URL(canonicalUrl).pathname;
      const testUrl = base + path;
      const page = await browser.newPage();
      const issues: string[] = [];
      let canonical: string | null = null;
      let hydrated = false;
      let hreflangs: string[] = [];
      let ogTags: Record<string, string> = {};
      let twitterTags: Record<string, string> = {};
      let ogLocaleAlternates: string[] = [];
      let jsonLd: LdSummary = { types: [], ids: [], count: 0 };
      const jsonLdExpected = readStaticLd(canonicalUrl);
      try {
        await page.goto(testUrl, { waitUntil: "networkidle", timeout: 20_000 });
        await page.waitForFunction(
          () => !!document.getElementById("root")?.firstElementChild,
          { timeout: 10_000 },
        );
        hydrated = true;
        const data = await page.evaluate(() => {
          const canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
          const alts = Array.from(
            document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]'),
          );
          const ogEntries: Record<string, string> = {};
          for (const m of document.head.querySelectorAll<HTMLMetaElement>('meta[property^="og:"]')) {
            const key = m.getAttribute("property")!;
            if (key === "og:locale:alternate") continue;
            ogEntries[key] = m.getAttribute("content") ?? "";
          }
          const twEntries: Record<string, string> = {};
          for (const m of document.head.querySelectorAll<HTMLMetaElement>('meta[name^="twitter:"]')) {
            twEntries[m.getAttribute("name")!] = m.getAttribute("content") ?? "";
          }
          const ogAlts = Array.from(
            document.head.querySelectorAll<HTMLMetaElement>('meta[property="og:locale:alternate"]'),
          ).map((m) => m.getAttribute("content") ?? "");
          const ldRaw = Array.from(
            document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'),
          ).map((s) => s.textContent ?? "");
          return {
            canonical: canon?.href ?? null,
            hreflangs: alts.map((a) => `${a.hreflang}|${a.href}`),
            ogTags: ogEntries,
            twitterTags: twEntries,
            ogLocaleAlternates: ogAlts,
            ldRaw,
          };
        });
        canonical = data.canonical;
        hreflangs = data.hreflangs;
        ogTags = data.ogTags;
        twitterTags = data.twitterTags;
        ogLocaleAlternates = data.ogLocaleAlternates;
        const parsed: unknown[] = [];
        for (const s of data.ldRaw) {
          try { parsed.push(JSON.parse(s)); } catch { /* handled below */ }
        }
        jsonLd = summarizeLd(parsed);
      } catch (err) {
        issues.push(`page load failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        await page.close();
      }

      const canonNorm = (s: string | null) =>
        s ? s.replace(new RegExp(`^${base}`), "https://plowwow.com").replace(/\/+$/, "") : null;
      const canonicalOk = canonNorm(canonical) === canonicalUrl.replace(/\/+$/, "");
      if (!canonicalOk) issues.push(`canonical=${canonical} (expected ${canonicalUrl})`);

      const locales = new Set(hreflangs.map((s) => s.split("|")[0]));
      const missingHreflang = REQUIRED_HREFLANG.filter((l) => !locales.has(l));
      if (missingHreflang.length)
        issues.push(`missing hreflang after hydration: ${missingHreflang.join(", ")}`);

      // OG/Twitter presence + correctness after hydration.
      for (const k of REQUIRED_OG) {
        if (!ogTags[k]) issues.push(`missing ${k} after hydration`);
      }
      for (const k of REQUIRED_TWITTER) {
        if (!twitterTags[k]) issues.push(`missing ${k} after hydration`);
      }
      if (ogTags["og:locale"] && ogTags["og:locale"] !== PRIMARY_OG_LOCALE)
        issues.push(`og:locale=${ogTags["og:locale"]} (expected ${PRIMARY_OG_LOCALE})`);
      for (const alt of ALTERNATE_OG_LOCALES) {
        if (!ogLocaleAlternates.includes(alt))
          issues.push(`missing og:locale:alternate=${alt} after hydration`);
      }
      if (twitterTags["twitter:card"] && twitterTags["twitter:card"] !== "summary_large_image")
        issues.push(`twitter:card=${twitterTags["twitter:card"]} (expected summary_large_image)`);
      const ogUrl = ogTags["og:url"];
      if (ogUrl && canonNorm(ogUrl) !== canonicalUrl.replace(/\/+$/, ""))
        issues.push(`og:url=${ogUrl} ≠ canonical ${canonicalUrl}`);
      const ogImg = ogTags["og:image"];
      if (ogImg && !/^https:\/\//.test(ogImg)) issues.push(`og:image not absolute-https: ${ogImg}`);
      const twImg = twitterTags["twitter:image"];
      if (twImg && !/^https:\/\//.test(twImg))
        issues.push(`twitter:image not absolute-https: ${twImg}`);

      results.push({
        url: canonicalUrl,
        hydrated,
        canonical,
        canonicalOk,
        hreflangs,
        missingHreflang,
        ogTags,
        twitterTags,
        ogLocaleAlternates,
        issues,
      });
    }
  } finally {
    await browser.close();
    if (server && !server.killed) server.kill("SIGTERM");
  }

  const failed = results.filter((r) => r.issues.length);
  mkdirSync(resolve("seo-report"), { recursive: true });
  writeFileSync(
    resolve("seo-report/hydration.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), base, sampleSize: results.length, failed: failed.length, results },
      null,
      2,
    ),
  );

  const md: string[] = [
    `# Post-Hydration Check`,
    ``,
    `_Generated ${new Date().toISOString()}_`,
    ``,
    `- Base URL: \`${base}\``,
    `- Sample size: **${results.length}**`,
    `- Failed: **${failed.length}**`,
    `- Required hreflang: \`${REQUIRED_HREFLANG.join(", ")}\``,
    ``,
  ];
  if (!failed.length) {
    md.push(`✅ Canonical + hreflang survive React hydration on every sampled URL.`);
  } else {
    md.push(`## Failing routes`, ``);
    for (const r of failed) {
      md.push(`### \`${r.url}\``);
      for (const i of r.issues) md.push(`- ${i}`);
      md.push(``);
    }
  }
  writeFileSync(resolve("seo-report/hydration.md"), md.join("\n"));

  if (failed.length) {
    console.error(`\n✗ hydration-check: ${failed.length}/${results.length} URLs failed`);
    for (const r of failed) {
      console.error(`  · ${r.url}`);
      for (const i of r.issues) console.error(`      ${i}`);
    }
    console.error(`  See seo-report/hydration.{json,md}`);
    process.exit(1);
  }
  console.log(`✓ hydration-check: ${results.length}/${results.length} URLs kept canonical + hreflang after hydration`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
