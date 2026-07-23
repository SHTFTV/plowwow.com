// Pings key production assets, persists results, and triggers an auto-republish
// webhook when /blog-index.json has failed for 2+ consecutive checks.
//
// Alerts (Slack + Resend), DB persistence, and optional redeploy webhook are all
// best-effort: any one failing does NOT block the check itself.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE = 'https://plowwow.com';
const CRITICAL = [
  '/blog-index.json',
  '/sitemap-blog.xml',
  '/asset-manifest.json',
];
const SLACK = Deno.env.get('SLACK_WEBHOOK_URL');
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const NOTIFY_EMAIL = Deno.env.get('AUDIT_NOTIFY_EMAIL');
const REDEPLOY_WEBHOOK = Deno.env.get('REDEPLOY_WEBHOOK_URL');
const REDEPLOY_COOLDOWN_MIN = 30;
const FAILURE_THRESHOLD = 2;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

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

async function persistCheck(r: { path: string; status: number; ok: boolean; error?: string }) {
  try {
    await admin.from('monitor_events').insert({
      kind: 'asset_check',
      ok: r.ok,
      path: r.path,
      http_status: r.status,
      details: r.error ? { error: r.error } : {},
    });
  } catch (err) { console.error('persist asset_check failed', err); }
}

async function recordAlert(subject: string, channels: Record<string, unknown>) {
  try {
    await admin.from('monitor_events').insert({
      kind: 'alert',
      ok: false,
      path: null,
      http_status: null,
      details: { subject, channels },
    });
  } catch (err) { console.error('persist alert failed', err); }
}

// Consecutive failures for a single path since the last OK.
async function consecutiveFailures(path: string): Promise<number> {
  const { data } = await admin
    .from('monitor_events')
    .select('ok')
    .eq('kind', 'asset_check')
    .eq('path', path)
    .order('created_at', { ascending: false })
    .limit(10);
  if (!data) return 0;
  let n = 0;
  for (const row of data) { if (row.ok) break; n++; }
  return n;
}

async function maybeRedeploy(path: string) {
  if (!REDEPLOY_WEBHOOK) {
    return { skipped: true, reason: 'no REDEPLOY_WEBHOOK_URL configured' };
  }
  // Cooldown: don't hammer the deploy hook.
  const since = new Date(Date.now() - REDEPLOY_COOLDOWN_MIN * 60_000).toISOString();
  const { data: recent } = await admin
    .from('monitor_events')
    .select('id')
    .eq('kind', 'redeploy_triggered')
    .gte('created_at', since)
    .limit(1);
  if (recent && recent.length) {
    return { skipped: true, reason: `cooldown (<${REDEPLOY_COOLDOWN_MIN}m since last)` };
  }
  try {
    const r = await fetch(REDEPLOY_WEBHOOK, { method: 'POST' });
    const detail = { path, webhook_status: r.status, ok: r.ok };
    await admin.from('monitor_events').insert({
      kind: 'redeploy_triggered',
      ok: r.ok,
      path,
      http_status: r.status,
      details: detail,
    });
    return detail;
  } catch (err) {
    await admin.from('monitor_events').insert({
      kind: 'redeploy_triggered',
      ok: false,
      path,
      http_status: 0,
      details: { error: String(err) },
    });
    return { ok: false, error: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const results = await Promise.all(CRITICAL.map(head));
  await Promise.all(results.map(persistCheck));
  const failed = results.filter((r) => !r.ok);

  let alertResult: Record<string, unknown> | null = null;
  let redeploy: Record<string, unknown> | null = null;

  if (failed.length) {
    const summary = failed
      .map((f) => `- ${f.path} -> HTTP ${f.status}${'error' in f ? ` (${(f as {error?:string}).error})` : ''}`)
      .join('\n');
    const subject = 'PlowWow live asset check failed';
    alertResult = await alert(subject, `${summary}\nHost: ${SITE}`);
    await recordAlert(subject, alertResult);

    // Auto-redeploy trigger if blog-index.json has failed 2+ times in a row.
    const indexFail = failed.find((f) => f.path === '/blog-index.json');
    if (indexFail) {
      const streak = await consecutiveFailures('/blog-index.json');
      if (streak >= FAILURE_THRESHOLD) {
        redeploy = { streak, ...await maybeRedeploy('/blog-index.json') };
      } else {
        redeploy = { streak, skipped: true, reason: `below threshold (${FAILURE_THRESHOLD})` };
      }
    }
  }

  return new Response(
    JSON.stringify({
      checkedAt: new Date().toISOString(),
      site: SITE,
      results,
      alert: alertResult,
      redeploy,
    }, null, 2),
    { status: failed.length ? 503 : 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
