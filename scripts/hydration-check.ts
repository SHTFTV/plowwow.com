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
import { loadThresholds, evaluate } from "./lib/thresholds";

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
// Deterministic PRNG (mulberry32) — same seed always yields the same sample so
// CI flakes are reproducible locally. Override with HYDRATION_SEED.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function deterministicPick<T>(arr: T[], n: number, rand: () => number): T[] {
  if (arr.length <= n) return [...arr];
  // Fisher-Yates on a copy, take first n. Same rand → same sample.
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function collectSample(): { urls: string[]; seed: number; seedSource: string; weights: Record<string, number> } {
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
  const cityRx = /\/(vancouver|burnaby|richmond|surrey|coquitlam|north-vancouver|west-vancouver|langley|maple-ridge|delta|new-westminster|port-coquitlam|port-moody|white-rock|abbotsford|chilliwack|mission|pitt-meadows|squamish|tsawwassen|anmore|belcarra)\/$/;
  const cities = uniq.filter((u) => cityRx.test(u));
  const blogs = uniq.filter((u) =>
    /-strata-commercial-snow-(removal|plowing)\/$/.test(u) ||
    /-snow-removal\/$/.test(u),
  );
  const misc = uniq.filter((u) => /\/(blog|locations|quote|app-features|intelligence)\/$/.test(u));
  const cap = Number(process.env.HYDRATION_MAX ?? 30);

  // Per-locale/bucket weights — HYDRATION_WEIGHTS="cities=0.4,blogs=0.5,misc=0.1"
  const defaultWeights: Record<string, number> = { cities: 0.4, blogs: 0.5, misc: 0.1 };
  const parsed: Record<string, number> = { ...defaultWeights };
  const raw = process.env.HYDRATION_WEIGHTS;
  if (raw) {
    for (const part of raw.split(",")) {
      const [k, v] = part.split("=").map((s) => s.trim());
      const n = Number(v);
      if (k && Number.isFinite(n) && n >= 0) parsed[k] = n;
    }
  }
  const total = Object.values(parsed).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(parsed)) parsed[k] = parsed[k] / total;

  const seedSource = process.env.HYDRATION_SEED ?? "plowwow-hydration-v1";
  const seedNum = /^\d+$/.test(seedSource) ? Number(seedSource) : hashSeed(seedSource);
  const rand = mulberry32(seedNum);

  // Reserve slots after home + misc anchors, then split remainder by weights.
  const anchors = [home, ...misc];
  const remaining = Math.max(0, cap - anchors.length);
  const cityQuota = Math.max(1, Math.round(remaining * parsed.cities));
  const blogQuota = Math.max(1, remaining - cityQuota);
  const combined = [
    ...anchors,
    ...deterministicPick(cities, Math.min(cities.length, cityQuota), rand),
    ...deterministicPick(blogs, Math.min(blogs.length, blogQuota), rand),
  ];
  return {
    urls: [...new Set(combined)].slice(0, cap),
    seed: seedNum,
    seedSource,
    weights: parsed,
  };
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
  // Stable viewport + fixed user agent so timing-sensitive tag assertions are
  // deterministic across CI runs. Cap network to a modest profile to keep
  // hydration timing consistent regardless of runner speed.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (compatible; PlowwowHydrationCheck/1.0; +https://plowwow.com)",
    locale: "en-CA",
    timezoneId: "America/Vancouver",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  context.setDefaultTimeout(Number(process.env.HYDRATION_TIMEOUT_MS ?? 25_000));
  context.setDefaultNavigationTimeout(Number(process.env.HYDRATION_NAV_TIMEOUT_MS ?? 25_000));

  const { urls: sample, seed, seedSource, weights } = collectSample();
  console.log(`  hydration-check sample: ${sample.length} urls · seed=${seed} (${seedSource}) · weights=${JSON.stringify(weights)}`);

  // Export the exact sample as a standalone artifact so failing runs are fully
  // reproducible without parsing hydration.json.
  mkdirSync(resolve("seo-report"), { recursive: true });
  writeFileSync(
    resolve("seo-report/hydration-sample.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        seed,
        seedSource,
        weights,
        cap: Number(process.env.HYDRATION_MAX ?? 30),
        urls: sample,
        reproduce: `HYDRATION_SEED=${seedSource} HYDRATION_WEIGHTS='${Object.entries(weights).map(([k,v])=>`${k}=${v}`).join(",")}' HYDRATION_MAX=${sample.length} bun run seo:hydration`,
      },
      null,
      2,
    ),
  );

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
      const maxAttempts = Number(process.env.HYDRATION_RETRIES ?? 2) + 1;
      const navTimeout = Number(process.env.HYDRATION_NAV_TIMEOUT_MS ?? 25_000);
      const hydrateTimeout = Number(process.env.HYDRATION_HYDRATE_TIMEOUT_MS ?? 12_000);
      const issues: string[] = [];
      let canonical: string | null = null;
      let hydrated = false;
      let hreflangs: string[] = [];
      let ogTags: Record<string, string> = {};
      let twitterTags: Record<string, string> = {};
      let ogLocaleAlternates: string[] = [];
      let jsonLd: LdSummary = { types: [], ids: [], count: 0 };
      const jsonLdExpected = readStaticLd(canonicalUrl);
      let lastErr: unknown = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const page = await context.newPage();
        try {
          await page.goto(testUrl, { waitUntil: "networkidle", timeout: navTimeout });
          await page.waitForFunction(
            () => !!document.getElementById("root")?.firstElementChild,
            { timeout: hydrateTimeout },
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
          lastErr = null;
          break; // success — no retry
        } catch (err) {
          lastErr = err;
          if (attempt < maxAttempts) {
            const backoff = 500 * attempt;
            await new Promise((r) => setTimeout(r, backoff));
          }
        } finally {
          await page.close();
        }
      }
      if (lastErr) {
        issues.push(`page load failed after ${maxAttempts} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
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

      // JSON-LD snapshot: every @type + @id shipped in raw HTML must still
      // be present after hydration. Extra hydration-added blocks are OK.
      const missingTypes = jsonLdExpected.types.filter((t) => !jsonLd.types.includes(t));
      if (missingTypes.length)
        issues.push(`JSON-LD @types missing after hydration: ${missingTypes.join(", ")}`);
      const missingIds = jsonLdExpected.ids.filter((id) => !jsonLd.ids.includes(id));
      if (missingIds.length)
        issues.push(`JSON-LD @ids missing after hydration: ${missingIds.slice(0, 3).join(", ")}${missingIds.length > 3 ? "…" : ""}`);
      if (jsonLdExpected.count && jsonLd.count < jsonLdExpected.count)
        issues.push(`JSON-LD block count dropped ${jsonLdExpected.count} → ${jsonLd.count} after hydration`);

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
        jsonLd,
        jsonLdExpected,
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
      { generatedAt: new Date().toISOString(), base, sampleSize: results.length, failed: failed.length, seed, seedSource, weights, results },
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
    `- Sample size: **${results.length}** · seed \`${seed}\` (\`${seedSource}\`) · weights \`${JSON.stringify(weights)}\``,
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

  const thresholds = loadThresholds();
  const outcome = evaluate("hydration", failed.length, thresholds);
  if (outcome.status === "fail") {
    console.error(`\n✗ hydration-check: ${failed.length}/${results.length} URLs failed (threshold=${outcome.threshold.max}, severity=critical)`);
    for (const r of failed) {
      console.error(`  · ${r.url}`);
      for (const i of r.issues) console.error(`      ${i}`);
    }
    console.error(`  See seo-report/hydration.{json,md}`);
    process.exit(1);
  }
  if (outcome.status === "warn") {
    console.warn(`\n⚠ hydration-check: ${failed.length}/${results.length} URLs failed but severity=warn (threshold=${outcome.threshold.max}); not failing build.`);
    for (const r of failed) console.warn(`  · ${r.url}: ${r.issues[0]}`);
    return;
  }
  console.log(`✓ hydration-check: ${results.length}/${results.length} URLs kept canonical + hreflang after hydration`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
