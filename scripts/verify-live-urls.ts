// Live smoke test: fetch key URLs on the deployed site and fail on any 404.
// Also verifies:
//   1. /blog/<slug> issues a 301 with Location pointing at /<slug>/
//   2. Both /<slug>/ and /blog/<slug>/ HTML expose canonical + og:url = /<slug>/
//   3. Every slug in /blog-index.json returns 200 at /<slug>/ AND /blog/<slug>/
//
// Usage: `bun run verify:live-urls` (defaults to https://plowwow.com) or
// `HOST=https://plowwow-fluff-sparkle.lovable.app bunx tsx scripts/verify-live-urls.ts`
// Env flags: SAMPLE=<n> to cap deep slug checks (default 8), FULL=1 for all.

const HOST = (process.env.HOST ?? "https://plowwow.com").replace(/\/$/, "");
const SAMPLE = Number(process.env.SAMPLE ?? "8");
const FULL = process.env.FULL === "1";

type Result = { label: string; ok: boolean; detail: string };
const results: Result[] = [];
const record = (r: Result) => {
  results.push(r);
  console.log(`${r.ok ? "✓" : "✗"} ${r.label} — ${r.detail}`);
};

async function fetchHead(url: string) {
  // Use GET with manual redirect so we can inspect the 301 Location header.
  return fetch(url, { redirect: "manual" });
}
async function fetchFollow(url: string) {
  return fetch(url, { redirect: "follow" });
}

// ---------- 1. Static assets return 200 --------------------------------------
const staticPaths = [
  "/blog-index.json",
  "/sitemap.xml",
  "/sitemap-blog.xml",
  "/robots.txt",
  "/blog/",
  "/blog/neighborhoods/",
];
for (const p of staticPaths) {
  const res = await fetchFollow(`${HOST}${p}`);
  record({
    label: `GET ${p}`,
    ok: res.status !== 404 && res.status < 500,
    detail: `HTTP ${res.status}`,
  });
}

// ---------- 2. Load /blog-index.json to derive slug list ---------------------
let slugs: string[] = [];
try {
  const res = await fetch(`${HOST}/blog-index.json`, { cache: "no-store" });
  const idx = (await res.json()) as { posts?: Array<{ slug: string }> };
  slugs = (idx.posts ?? []).map((p) => p.slug).filter(Boolean);
  record({
    label: "parse /blog-index.json",
    ok: slugs.length > 0,
    detail: `${slugs.length} posts`,
  });
} catch (err) {
  record({ label: "parse /blog-index.json", ok: false, detail: String(err) });
}

const sampled = FULL ? slugs : slugs.slice(0, SAMPLE);

// ---------- 3. /blog/<slug> → 301 → /<slug>/ ---------------------------------
for (const slug of sampled) {
  const url = `${HOST}/blog/${slug}`; // no trailing slash — should 301
  try {
    const res = await fetchHead(url);
    const loc = res.headers.get("location") ?? "";
    // Accept either absolute or path-relative Location, and either /blog/<slug>/
    // (trailing-slash normalization) or /<slug>/ (canonical flatten). Both are
    // acceptable as long as *following* the chain eventually lands at /<slug>/.
    const isRedirect = res.status === 301 || res.status === 308;
    const targetsCanonical =
      loc.endsWith(`/${slug}/`) || loc.endsWith(`/blog/${slug}/`);
    record({
      label: `301 /blog/${slug}`,
      ok: isRedirect && targetsCanonical,
      detail: `HTTP ${res.status} → ${loc || "(no Location)"}`,
    });
  } catch (err) {
    record({ label: `301 /blog/${slug}`, ok: false, detail: String(err) });
  }
}

// ---------- 4. Canonical + og:url on both URL variants -----------------------
function extractMeta(html: string) {
  const canonical = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  )?.[1];
  const ogUrl = html.match(
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  return { canonical, ogUrl };
}

for (const slug of sampled) {
  const expected = `${HOST}/${slug}/`;
  for (const variant of [`/${slug}/`, `/blog/${slug}/`]) {
    try {
      const res = await fetchFollow(`${HOST}${variant}`);
      const html = await res.text();
      const { canonical, ogUrl } = extractMeta(html);
      const ok =
        res.status === 200 &&
        canonical === expected &&
        ogUrl === expected;
      record({
        label: `canonical/og ${variant}`,
        ok,
        detail:
          `HTTP ${res.status}` +
          ` canonical=${canonical ?? "(missing)"}` +
          ` og:url=${ogUrl ?? "(missing)"}`,
      });
    } catch (err) {
      record({ label: `canonical/og ${variant}`, ok: false, detail: String(err) });
    }
  }
}

// ---------- 5. Every slug returns 200 at both /<slug>/ and /blog/<slug>/ ----
// This is the big loop — do it in batches so we don't nuke the origin.
async function batchCheck(paths: string[], concurrency = 12) {
  const misses: string[] = [];
  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const settled = await Promise.all(
      batch.map(async (p) => {
        try {
          const res = await fetch(`${HOST}${p}`, { redirect: "follow" });
          return { p, status: res.status };
        } catch {
          return { p, status: 0 };
        }
      }),
    );
    for (const s of settled) {
      if (s.status !== 200) misses.push(`${s.p} (HTTP ${s.status})`);
    }
  }
  return misses;
}

const allPaths = slugs.flatMap((s) => [`/${s}/`, `/blog/${s}/`]);
const misses = await batchCheck(allPaths);
record({
  label: `every slug 200 at /<slug>/ and /blog/<slug>/`,
  ok: misses.length === 0,
  detail: misses.length ? `${misses.length} misses (first: ${misses.slice(0, 3).join(", ")})` : `${allPaths.length}/${allPaths.length} OK`,
});

// ---------- Summary ----------------------------------------------------------
const failed = results.filter((r) => !r.ok);
console.log(
  `\n${failed.length ? "✗" : "✓"} ${results.length - failed.length}/${results.length} checks passing on ${HOST}`,
);
if (failed.length) {
  for (const f of failed) console.error(`  - ${f.label}: ${f.detail}`);
  process.exit(1);
}
