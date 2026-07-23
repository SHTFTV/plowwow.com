// Pings key production assets. Alerts to Slack on any non-200. Scheduled via pg_cron.
// Public endpoint: no auth required, safe (read-only, no secrets echoed).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SITE = 'https://plowwow.com';
const CRITICAL = [
  '/blog-index.json',
  '/sitemap-blog.xml',
  '/asset-manifest.json',
];
const SLACK = Deno.env.get('SLACK_WEBHOOK_URL');

async function head(path: string) {
  try {
    const res = await fetch(`${SITE}${path}`, { redirect: 'follow', cache: 'no-store' });
    return { path, status: res.status, ok: res.ok };
  } catch (err) {
    return { path, status: 0, ok: false, error: String(err) };
  }
}

async function alert(text: string) {
  if (!SLACK) return { alerted: false, reason: 'no SLACK_WEBHOOK_URL' };
  try {
    const r = await fetch(SLACK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return { alerted: r.ok, reason: `slack HTTP ${r.status}` };
  } catch (err) {
    return { alerted: false, reason: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const results = await Promise.all(CRITICAL.map(head));
  const failed = results.filter((r) => !r.ok);
  let alertResult: { alerted: boolean; reason: string } | null = null;
  if (failed.length) {
    const summary = failed
      .map((f) => `• \`${f.path}\` → HTTP ${f.status}${'error' in f ? ` (${f.error})` : ''}`)
      .join('\n');
    alertResult = await alert(`🚨 *PlowWow live asset check failed*\n${summary}\nHost: ${SITE}`);
  }

  return new Response(
    JSON.stringify({ checkedAt: new Date().toISOString(), site: SITE, results, alert: alertResult }, null, 2),
    { status: failed.length ? 503 : 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
