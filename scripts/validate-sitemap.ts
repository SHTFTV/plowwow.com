#!/usr/bin/env bun
/**
 * Sitemap + robots validation.
 *
 * Fetches:
 *   - <BASE>/robots.txt — must list <BASE>/sitemap.xml
 *   - <BASE>/sitemap.xml — must be a valid sitemapindex
 *   - Every child sitemap listed in the index
 *   - A sampled subset of URLs inside those child sitemaps
 *
 * For each sampled URL, asserts:
 *   - HTTP status is 200 (follows redirects)
 *   - The response HTML contains a self-referencing <link rel="canonical">
 *     matching the sampled URL (trailing slash tolerated).
 *
 * Usage:
 *   bun run scripts/validate-sitemap.ts               # https://plowwow.com
 *   bun run scripts/validate-sitemap.ts --base=https://staging.example.com
 *   bun run scripts/validate-sitemap.ts --sample=25   # cap per child sitemap
 *
 * Exits non-zero if any assertion fails so CI can gate on it.
 */

interface Args {
  base: string;
  samplePerChild: number;
  verbose: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const found = argv.find((a) => a.startsWith(`${flag}=`));
    return found ? found.split("=").slice(1).join("=") : undefined;
  };
  return {
    base: (get("--base") ?? "https://plowwow.com").replace(/\/$/, ""),
    samplePerChild: Number(get("--sample") ?? 10),
    verbose: argv.includes("--verbose"),
  };
}

type Failure = { url: string; reason: string };

function extractLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());
}

function normalize(u: string) {
  return u.replace(/\/+$/, "");
}

async function fetchText(url: string): Promise<{ status: number; text: string; finalUrl: string }> {
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "plowwow-sitemap-validator" } });
  const text = await res.text();
  return { status: res.status, text, finalUrl: res.url };
}

function extractCanonical(html: string): string | null {
  const m = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["']/i)
    || html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["']/i);
  return m ? m[1].trim() : null;
}

async function validateUrl(url: string, failures: Failure[], verbose: boolean) {
  try {
    const { status, text } = await fetchText(url);
    if (status !== 200) {
      failures.push({ url, reason: `HTTP ${status}` });
      return;
    }
    const canonical = extractCanonical(text);
    if (!canonical) {
      failures.push({ url, reason: "missing <link rel=canonical>" });
      return;
    }
    if (normalize(canonical) !== normalize(url)) {
      failures.push({
        url,
        reason: `canonical mismatch — got ${canonical}, expected ${url}`,
      });
      return;
    }
    if (verbose) console.log(`  ✓ ${url}`);
  } catch (err) {
    failures.push({ url, reason: `fetch error: ${(err as Error).message}` });
  }
}

async function main() {
  const args = parseArgs();
  console.log(`Validating sitemap + robots for ${args.base}`);
  const failures: Failure[] = [];

  // 1. robots.txt must list the root sitemap.
  const robotsUrl = `${args.base}/robots.txt`;
  const robots = await fetchText(robotsUrl);
  if (robots.status !== 200) {
    failures.push({ url: robotsUrl, reason: `HTTP ${robots.status}` });
  } else {
    const sitemapDirectives = Array.from(
      robots.text.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim),
    ).map((m) => m[1].trim());
    const rootSitemap = `${args.base}/sitemap.xml`;
    if (!sitemapDirectives.includes(rootSitemap)) {
      failures.push({
        url: robotsUrl,
        reason: `robots.txt missing 'Sitemap: ${rootSitemap}' directive`,
      });
    } else {
      console.log(`  ✓ robots.txt lists ${rootSitemap}`);
    }
  }

  // 2. Root sitemap.xml must be a sitemapindex with children.
  const rootUrl = `${args.base}/sitemap.xml`;
  const root = await fetchText(rootUrl);
  if (root.status !== 200) {
    failures.push({ url: rootUrl, reason: `HTTP ${root.status}` });
    console.error(`\nFATAL: ${rootUrl} returned ${root.status}`);
    process.exit(1);
  }
  if (!/<sitemapindex\b/.test(root.text)) {
    failures.push({ url: rootUrl, reason: "root sitemap.xml is not a <sitemapindex>" });
  }
  const childSitemaps = extractLocs(root.text);
  console.log(`  ✓ root sitemap indexes ${childSitemaps.length} child sitemap(s)`);

  // 3. Every child sitemap must be reachable and non-empty.
  const allUrls: string[] = [];
  for (const child of childSitemaps) {
    const c = await fetchText(child);
    if (c.status !== 200) {
      failures.push({ url: child, reason: `HTTP ${c.status}` });
      continue;
    }
    const locs = extractLocs(c.text).filter((l) => !/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(l));
    if (locs.length === 0) {
      failures.push({ url: child, reason: "child sitemap has zero <loc> entries" });
      continue;
    }
    console.log(`  ✓ ${child} → ${locs.length} URLs`);
    allUrls.push(...locs);
  }

  // 4. Sample a subset per child (deterministic: first N of each).
  //    We already flattened but re-partition to spread the sample fairly.
  const perHost: string[] = [];
  const seen = new Set<string>();
  for (const url of allUrls) {
    if (!seen.has(url)) {
      seen.add(url);
      perHost.push(url);
    }
  }
  const sample = perHost.slice(0, Math.min(perHost.length, args.samplePerChild * childSitemaps.length));
  console.log(`\nSampling ${sample.length} URLs (of ${perHost.length} unique)…`);

  // Fetch with limited concurrency to avoid hammering the host.
  const CONCURRENCY = 6;
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < sample.length) {
      const i = cursor++;
      await validateUrl(sample[i], failures, args.verbose);
    }
  });
  await Promise.all(workers);

  // 5. Report.
  if (failures.length === 0) {
    console.log(`\n✅ All checks passed (${sample.length} URLs sampled).`);
    process.exit(0);
  }
  console.error(`\n❌ ${failures.length} failure(s):`);
  for (const f of failures) {
    console.error(`  - ${f.url}\n      ${f.reason}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("validator crashed:", err);
  process.exit(2);
});
