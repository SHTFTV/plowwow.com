// Post-publish gate. Verifies /blog-index.json, /sitemap-blog.xml, and the newest
// 5 blog post URLs all return HTTP 200 on the live host. Non-zero exit on any miss.
//
// Usage: `bun run deploy:check` (default host = https://plowwow.com)
//        HOST=https://staging.example.com bun run deploy:check

const HOST = (process.env.HOST ?? 'https://plowwow.com').replace(/\/$/, '');

type Row = { url: string; status: number; ok: boolean; note?: string };

const fetchStatus = async (url: string): Promise<Row> => {
  try {
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store' });
    return { url, status: res.status, ok: res.status === 200 };
  } catch (err) {
    return { url, status: 0, ok: false, note: String(err) };
  }
};

const rows: Row[] = [];

// 1. blog-index.json (also feeds slug list)
const idxUrl = `${HOST}/blog-index.json`;
const idxRes = await fetch(idxUrl, { cache: 'no-store' });
rows.push({ url: idxUrl, status: idxRes.status, ok: idxRes.status === 200 });

let newestSlugs: string[] = [];
if (idxRes.ok) {
  try {
    const idx = (await idxRes.json()) as {
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
    rows[0].ok = false;
    rows[0].note = `parse: ${String(err)}`;
  }
}

// 2. sitemap-blog.xml (also fallback slug source)
const smUrl = `${HOST}/sitemap-blog.xml`;
const smRes = await fetch(smUrl, { cache: 'no-store' });
rows.push({ url: smUrl, status: smRes.status, ok: smRes.status === 200 });

if (!newestSlugs.length && smRes.ok) {
  const xml = await smRes.text();
  newestSlugs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, ''))
    .slice(0, 5);
}

// 3. Newest 5 posts return 200
if (!newestSlugs.length) {
  rows.push({ url: '(newest 5 slugs)', status: 0, ok: false, note: 'could not derive slug list' });
} else {
  const postRows = await Promise.all(
    newestSlugs.map((slug) => fetchStatus(`${HOST}/${slug}/`)),
  );
  rows.push(...postRows);
}

// Report
console.log(`\nDeploy check @ ${HOST}\n${'-'.repeat(60)}`);
for (const r of rows) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.status.toString().padStart(3)}  ${r.url}${r.note ? `  (${r.note})` : ''}`);
}
const failed = rows.filter((r) => !r.ok);
console.log('-'.repeat(60));
console.log(`${failed.length ? '✗' : '✓'} ${rows.length - failed.length}/${rows.length} checks passing`);
if (failed.length) process.exit(1);
