// Live-crawl redirect validator.
//
// Fetches every legacy city + blog slug pattern from netlify.toml (plus
// missing-trailing-slash variants of a sample of sitemap URLs) against
// NETLIFY_BASE / CRAWL_URL and asserts:
//   1. The response is a SINGLE 301 hop — no redirect chains, no loops.
//   2. Location header points at the canonical trailing-slash URL under
//      https://plowwow.com.
//   3. Following that Location once returns 200 with the same canonical
//      <link rel="canonical"> baked into the final HTML.
//
// Skips gracefully with exit 0 + note if NETLIFY_BASE/CRAWL_URL is not set,
// since `vite preview` does not evaluate netlify.toml redirects.
//
// Writes seo-report/legacy-redirects.{json,md}; exits 1 on any failure.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const NETLIFY_TOML = resolve("netlify.toml");
const DIST = resolve("dist");
const SITEMAP = resolve(DIST, "sitemap.xml");
const CANONICAL_HOST = "https://plowwow.com";
const MAX_HOPS = 3; // >1 counts as a chain and fails

type Rule = { from: string; to: string; status: number };

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
  if (!existsSync(SITEMAP)) return [];
  const seen = new Set<string>();
  const stack = [SITEMAP];
  while (stack.length) {
    const f = stack.pop()!;
    if (!existsSync(f)) continue;
    for (const m of readFileSync(f, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1];
      if (u.endsWith(".xml")) {
        const child = resolve(DIST, new URL(u).pathname.replace(/^\//, ""));
        if (existsSync(child)) stack.push(child);
      } else seen.add(u);
    }
  }
  return [...seen];
}

// For placeholder rules like /snow-removal-in-:slug → /snow-removal-in-:slug/,
// substitute the first sitemap URL that matches the target shape.
function expandLegacyExamples(rules: Rule[], locs: string[]): { source: string; expected: string; rule: Rule }[] {
  const out: { source: string; expected: string; rule: Rule }[] = [];
  for (const rule of rules) {
    if (rule.status !== 301) continue;
    const to = rule.to.startsWith("http") ? new URL(rule.to).pathname : rule.to;
    // Static rule (no placeholders): use as-is.
    if (!rule.from.includes(":") && !rule.from.includes("*")) {
      out.push({ source: rule.from, expected: to, rule });
      continue;
    }
    // Placeholder rule: find a sitemap URL matching the destination path shape.
    const toPattern = to
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, "([^/]+)")
      .replace(/\*/g, "(.*)");
    const rx = new RegExp(`^${toPattern}/?$`);
    for (const loc of locs) {
      const p = new URL(loc).pathname;
      const match = p.match(rx);
      if (!match) continue;
      let source = rule.from;
      let i = 1;
      source = source.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, () => match[i++] ?? "");
      source = source.replace(/\*/g, () => match[i++] ?? "");
      out.push({ source, expected: p.endsWith("/") ? p : p + "/", rule });
      break;
    }
  }
  return out;
}

// Trailing-slash-missing sample: strip the trailing / from a sample of
// sitemap URLs. Netlify's /snow-removal-in-:slug and /:slug-snow-removal
// rules should 301 these back to the canonical trailing-slash URL.
function trailingSlashExamples(locs: string[]): { source: string; expected: string; rule: Rule }[] {
  const cap = Number(process.env.LEGACY_TRAIL_SAMPLE ?? 8);
  const withSlash = locs.filter((u) => {
    const p = new URL(u).pathname;
    return p !== "/" && p.endsWith("/") &&
      (/^\/snow-removal-in-/.test(p) || /-snow-removal\/$/.test(p) || /-strata-commercial-snow-/.test(p));
  }).slice(0, cap);
  return withSlash.map((u) => {
    const p = new URL(u).pathname;
    return {
      source: p.replace(/\/$/, ""),
      expected: p,
      rule: { from: "trailing-slash", to: p, status: 301 },
    };
  });
}

type Check = {
  source: string;
  expected: string;
  hops: { url: string; status: number; location: string | null }[];
  finalStatus: number;
  finalCanonical: string | null;
  ok: boolean;
  reason?: string;
};

const REQUEST_TIMEOUT_MS = Number(process.env.LEGACY_TIMEOUT_MS ?? 15_000);
const MAX_RETRIES = Number(process.env.LEGACY_RETRIES ?? 3);
const RETRY_BASE_DELAY_MS = Number(process.env.LEGACY_RETRY_BASE_MS ?? 500);

// Transient signals worth retrying — everything else counts as a real result.
function isTransient(status: number, msg?: string): boolean {
  if (status === 0) return true; // network/DNS/reset
  if (status === 408 || status === 425 || status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  if (msg && /(ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|network|timeout|fetch failed)/i.test(msg))
    return true;
  return false;
}

async function fetchOnce(url: string): Promise<{ status: number; location: string | null; err?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "manual", signal: ctrl.signal });
    return { status: res.status, location: res.headers.get("location") };
  } catch (err) {
    return { status: 0, location: null, err: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string): Promise<{ status: number; location: string | null; attempts: number; err?: string }> {
  let lastErr: string | undefined;
  let lastStatus = 0;
  let lastLoc: string | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const r = await fetchOnce(url);
    lastStatus = r.status;
    lastLoc = r.location;
    lastErr = r.err;
    if (!isTransient(r.status, r.err)) {
      return { status: r.status, location: r.location, attempts: attempt, err: r.err };
    }
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  return { status: lastStatus, location: lastLoc, attempts: MAX_RETRIES, err: lastErr };
}

async function crawl(base: string, path: string): Promise<Check["hops"]> {
  const hops: Check["hops"] = [];
  let current = base + path;
  for (let i = 0; i < MAX_HOPS + 1; i++) {
    const r = await fetchWithRetry(current);
    if (r.status === 0) {
      hops.push({ url: current, status: 0, location: `error after ${r.attempts} attempts: ${r.err ?? "unknown"}` });
      return hops;
    }
    hops.push({ url: current, status: r.status, location: r.location });
    if (r.status < 300 || r.status >= 400 || !r.location) return hops;
    current = new URL(r.location, current).toString();
  }
  return hops;
}

async function main() {
  const base = (process.env.NETLIFY_BASE ?? process.env.CRAWL_URL ?? "")
    .replace(/\/+$/, "");
  mkdirSync(resolve("seo-report"), { recursive: true });

  if (!base) {
    const note = "NETLIFY_BASE / CRAWL_URL not set — skipping live redirect checks (vite preview doesn't process netlify.toml).";
    console.log(`⏭  legacy-redirects: ${note}`);
    writeFileSync(
      resolve("seo-report/legacy-redirects.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), skipped: true, note }, null, 2),
    );
    writeFileSync(
      resolve("seo-report/legacy-redirects.md"),
      `# Legacy redirect crawl\n\n_Skipped: ${note}_\n`,
    );
    return;
  }

  const rules = existsSync(NETLIFY_TOML) ? parseRedirects(readFileSync(NETLIFY_TOML, "utf8")) : [];
  const locs = sitemapLocs();
  const targets = [...expandLegacyExamples(rules, locs), ...trailingSlashExamples(locs)];
  const seen = new Set<string>();
  const uniq = targets.filter((t) => (seen.has(t.source) ? false : (seen.add(t.source), true)));

  const checks: Check[] = [];
  for (const t of uniq) {
    const hops = await crawl(base, t.source);
    const first = hops[0];
    const final = hops[hops.length - 1];
    let ok = true;
    let reason: string | undefined;

    if (!first || first.status !== 301) {
      ok = false;
      reason = `first hop status=${first?.status} (expected 301)`;
    } else if (hops.length > 2) {
      ok = false;
      reason = `redirect chain (${hops.length - 1} hops); expected single 301`;
    } else if (hops.length === 2 && final.status >= 300 && final.status < 400) {
      ok = false;
      reason = `loop or chain — final hop still redirecting (status=${final.status})`;
    } else {
      const expectedLoc = `${CANONICAL_HOST}${t.expected}`;
      const gotLoc = first.location ? new URL(first.location, base + t.source).toString() : "";
      // Accept exact-match OR same pathname on canonical host.
      const gotPath = gotLoc ? new URL(gotLoc).pathname : "";
      if (gotPath !== t.expected) {
        ok = false;
        reason = `Location=${gotLoc || "(none)"} (expected ${expectedLoc})`;
      } else if (final.status !== 200) {
        ok = false;
        reason = `final hop status=${final.status} (expected 200)`;
      }
    }

    // Verify canonical of final page matches expected.
    let finalCanonical: string | null = null;
    if (ok && final.status === 200) {
      try {
        const finalHtml = await fetch(final.url).then((r) => r.text());
        finalCanonical =
          finalHtml.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1] ?? null;
        const want = `${CANONICAL_HOST}${t.expected}`.replace(/\/+$/, "");
        if ((finalCanonical ?? "").replace(/\/+$/, "") !== want) {
          ok = false;
          reason = `final canonical="${finalCanonical}" (expected ${want})`;
        }
      } catch (err) {
        ok = false;
        reason = `final GET failed: ${(err as Error).message}`;
      }
    }

    checks.push({
      source: t.source,
      expected: t.expected,
      hops,
      finalStatus: final?.status ?? 0,
      finalCanonical,
      ok,
      reason,
    });
  }

  const failed = checks.filter((c) => !c.ok);
  writeFileSync(
    resolve("seo-report/legacy-redirects.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), base, total: checks.length, failed: failed.length, checks },
      null,
      2,
    ),
  );
  const md = [
    `# Legacy redirect crawl`,
    ``,
    `_Generated ${new Date().toISOString()}_`,
    ``,
    `- Base: \`${base}\``,
    `- Checked: **${checks.length}** · Failed: **${failed.length}**`,
    ``,
  ];
  if (!failed.length) md.push(`✅ Every legacy slug + missing-trailing-slash URL 301s in a single hop to the canonical URL.`);
  else {
    md.push(`## Failing`, ``);
    for (const c of failed) md.push(`- \`${c.source}\` → expected \`${c.expected}\`: ${c.reason}`);
  }
  writeFileSync(resolve("seo-report/legacy-redirects.md"), md.join("\n"));

  if (failed.length) {
    console.error(`\n✗ legacy-redirects: ${failed.length}/${checks.length} failed`);
    for (const c of failed) console.error(`  · ${c.source}: ${c.reason}`);
    process.exit(1);
  }
  console.log(`✓ legacy-redirects: ${checks.length} URLs each 301 in one hop to canonical (${base})`);
}

main().catch((err) => { console.error(err); process.exit(1); });
