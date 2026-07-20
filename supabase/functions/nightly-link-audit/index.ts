import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Nightly internal-link audit.
// 1. Fetches public/link-audit.json from the live site.
// 2. Persists a row to link_audit_runs (service role).
// 3. Attempts to email a summary via Resend if RESEND_API_KEY is configured.
//    When no email transport is set up we still store the audit and set
//    email_status = 'skipped_no_transport'.

const SITE_URL = 'https://plowwow.com';
const AUDIT_URL = `${SITE_URL}/link-audit.json`;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function isAuthorized(req: Request): Promise<boolean> {
  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  const providedCronSecret = req.headers.get('x-cron-secret');
  if (CRON_SECRET && providedCronSecret && providedCronSecret === CRON_SECRET) return true;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return false;
  try {
    const anon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.slice('Bearer '.length);
    const { data: claimsRes } = await anon.auth.getClaims(token);
    const uid = claimsRes?.claims?.sub;
    if (!uid) return false;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin
      .schema('private')
      .rpc('has_role', { _user_id: uid, _role: 'admin' });
    return isAdmin === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!(await isAuthorized(req))) {
    return new Response(
      JSON.stringify({ error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const resp = await fetch(AUDIT_URL, { cache: 'no-store' });
    if (!resp.ok) {
      const body = await resp.text();
      console.error(`Failed to fetch audit JSON [${resp.status}]: ${body}`);
      return new Response(
        JSON.stringify({ error: 'audit_fetch_failed', status: resp.status, body }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const report = await resp.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: inserted, error: insertError } = await supabase
      .from('link_audit_runs')
      .insert({
        posts_total: report.totals.posts,
        cities_total: report.totals.cities,
        orphan_posts_count: report.totals.orphanPosts,
        cities_without_posts_count: report.totals.citiesWithoutPosts,
        report,
        email_status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('DB insert failed:', insertError.message);
      return new Response(
        JSON.stringify({ error: 'db_insert_failed', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Try Resend if configured
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const notifyTo = Deno.env.get('AUDIT_NOTIFY_EMAIL');
    let emailStatus = 'skipped_no_transport';

    if (resendKey && notifyTo) {
      const html = `
        <h2>PlowWow — Nightly Internal Link Audit</h2>
        <p><strong>${report.totals.posts}</strong> blog posts, <strong>${report.totals.cities}</strong> city hubs.</p>
        <p><strong>${report.totals.orphanPosts}</strong> orphan posts (no city match)<br/>
        <strong>${report.totals.citiesWithoutPosts}</strong> cities without any neighborhood posts</p>
        <h3>Orphan posts</h3>
        <ul>${report.orphanPosts.map((p: any) => `<li>${p.slug}</li>`).join('') || '<li>None</li>'}</ul>
        <h3>Cities with 0 neighborhood posts</h3>
        <ul>${report.citiesWithoutPosts.map((c: any) => `<li>${c.name} — ${SITE_URL}${c.path}</li>`).join('') || '<li>None</li>'}</ul>
        <p><a href="${SITE_URL}/admin/link-audit">Open dashboard</a></p>
      `;
      const gw = 'https://connector-gateway.lovable.dev/resend/emails';
      const r = await fetch(gw, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'X-Connection-Api-Key': resendKey,
        },
        body: JSON.stringify({
          from: 'PlowWow SEO <onboarding@resend.dev>',
          to: [notifyTo],
          subject: `PlowWow audit — ${report.totals.orphanPosts} orphans, ${report.totals.citiesWithoutPosts} empty cities`,
          html,
        }),
      });
      emailStatus = r.ok ? 'sent' : `failed_${r.status}`;
      if (!r.ok) console.error('Email send failed:', r.status, await r.text());
    }

    await supabase
      .from('link_audit_runs')
      .update({ email_status: emailStatus })
      .eq('id', inserted!.id);

    return new Response(
      JSON.stringify({ ok: true, id: inserted!.id, emailStatus, totals: report.totals }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('nightly-link-audit crashed:', msg);
    return new Response(
      JSON.stringify({ error: 'unexpected', details: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
