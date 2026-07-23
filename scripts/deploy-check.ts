// Post-publish gate. Verifies /blog-index.json, /sitemap-blog.xml, and the newest
// 5 blog post URLs all return HTTP 200 on the live host, with retries + exponential
// backoff so transient CDN/network blips don't cause false failures.
//
// Optionally POSTs the summary to the record-deploy-check edge function when
// MONITOR_INGEST_URL + CRON_SECRET are set, so the admin page can display it.
//
// Usage: `bun run deploy:check` (default host = https://plowwow.com)
//        HOST=https://staging.example.com bun run deploy:check
// Env: MAX_ATTEMPTS (default 4), BASE_DELAY_MS (default 500),
//      MONITOR_INGEST_URL, CRON_SECRET

const HOST = (process.env.HOST ?? 'https://plowwow.com').replace(/\/$/, '');
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS ?? '4');
const BASE_DELAY_MS = Number(process.env.BASE_DELAY_MS ?? '500');
const INGEST_URL = process.env.MONITOR_INGEST_URL;
const CRON_SECRET = process.env.CRON_SECRET;

type Row = {
  url: string;
  status: number;
  ok: boolean;
  attempts: number;
  note?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retry with exponential backoff + jitter. A response is "retryable" if it's a
// network error, a 5xx, a 408 timeout, or a 429 rate-limit. 4xx (other than
// 408/429) are considered deterministic and short-circuit.
async function fetchWithRetry(url: string): Promise<Row> {
  const attempts: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, {
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      attempts.push(`#${attempt} HTTP ${res.status}`);
      const retryable = res.status >= 500 || res.status === 408 || res.status === 429;
      if (res.status === 200) return { url, status: 200, ok: true, attempts: attempt };
      if (!retryable) {
        return {
          url, status: res.status, ok: false, attempts: attempt,
          note: `non-retryable (${attempts.join(', ')})`,
        };
      }
    } catch (err) {
      const name = (err as Error)?.name ?? 'Error';
      const msg = (err as Error)?.message ?? String(err);
      attempts.push(`#${attempt} ${name}: ${msg}`);
    }
    if (attempt < MAX_ATTEMPTS) {
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
      await sleep(delay);
    }
  }
  return { url, status: 0, ok: false, attempts: MAX_ATTEMPTS, note: attempts.join(' | ') };
}

const rows: Row[] = [];

// 1. blog-index.json
const idxUrl = `${HOST}/blog-index.json`;
const idxRow = await fetchWithRetry(idxUrl);
rows.push(idxRow);

let newestSlugs: string[] = [];
if (idxRow.ok) {
  try {
    const idx = (await (await fetch(idxUrl, { cache: 'no-store' })).json()) as {
      carousel?: string[];
      posts?: Array<{ slug: string; publishedAt?: string }>;
    };
    if (Array.isArray(idx.carousel) && idx.carousel.length) {
      newestSlugs = idx.carousel.slice(0, 5);
    } else if (Array.isArray(idx.posts)) {
      newestSlugs = [...idx.posts]
        .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
        .slice(0, 5)
        .map((p) => p.slug);
    }
  } catch (err) {
    idxRow.ok = false;
    idxRow.note = `parse: ${String(err)}`;
  }
}

// 2. sitemap-blog.xml
const smUrl = `${HOST}/sitemap-blog.xml`;
const smRow = await fetchWithRetry(smUrl);
rows.push(smRow);

if (!newestSlugs.length && smRow.ok) {
  const xml = await (await fetch(smUrl, { cache: 'no-store' })).text();
  newestSlugs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, ''))
    .slice(0, 5);
}

// 3. Newest 5 posts
if (!newestSlugs.length) {
  rows.push({ url: '(newest 5 slugs)', status: 0, ok: false, attempts: 0, note: 'could not derive slug list' });
} else {
  const postRows = await Promise.all(
    newestSlugs.map((slug) => fetchWithRetry(`${HOST}/${slug}/`)),
  );
  rows.push(...postRows);
}

// Report
console.log(`\nDeploy check @ ${HOST}\n${'-'.repeat(72)}`);
for (const r of rows) {
  const line = `${r.ok ? '✓' : '✗'} ${String(r.status).padStart(3)} (${r.attempts}x)  ${r.url}`;
  console.log(r.note ? `${line}\n     ${r.note}` : line);
}
const passed = rows.filter((r) => r.ok).length;
const total = rows.length;
console.log('-'.repeat(72));
console.log(`${passed === total ? '✓' : '✗'} ${passed}/${total} checks passing`);

// Optional ingest into monitor_events so the admin page can show latest results.
if (INGEST_URL && CRON_SECRET) {
  try {
    const res = await fetch(INGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
      body: JSON.stringify({ ok: passed === total, host: HOST, passed, total, rows }),
    });
    console.log(`ingest → HTTP ${res.status}`);
  } catch (err) {
    console.warn(`ingest failed: ${String(err)}`);
  }
}

if (passed !== total) process.exit(1);
