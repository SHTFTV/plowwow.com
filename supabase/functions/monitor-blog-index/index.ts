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
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const NOTIFY_EMAIL = Deno.env.get('AUDIT_NOTIFY_EMAIL');

async function head(path: string) {
  try {
    const res = await fetch(`${SITE}${path}`, { redirect: 'follow', cache: 'no-store' });
    return { path, status: res.status, ok: res.ok };
  } catch (err) {
    return { path, status: 0, ok: false, error: String(err) };
  }
}

async function alert(subject: string, body: string) {
  const channels: Record<string, unknown> = {};
  if (SLACK) {
    try {
      const r = await fetch(SLACK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${subject}\n${body}` }),
      });
      channels.slack = { ok: r.ok, status: r.status };
    } catch (err) { channels.slack = { ok: false, error: String(err) }; }
  }
  if (RESEND_KEY && NOTIFY_EMAIL) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'PlowWow Monitor <alerts@plowwow.com>',
          to: [NOTIFY_EMAIL],
          subject,
          text: body,
        }),
      });
      channels.email = { ok: r.ok, status: r.status };
    } catch (err) { channels.email = { ok: false, error: String(err) }; }
  }
  if (!SLACK && !(RESEND_KEY && NOTIFY_EMAIL)) channels.none = 'no alert transport configured';
  return channels;
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
