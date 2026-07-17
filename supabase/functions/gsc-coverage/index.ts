import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Fetches Google Search Console coverage data using the builder's connected
// GSC account (via connector gateway). Requires the caller to be an admin.
//
// Returns:
//  - list of submitted sitemaps + last-submitted / errors / warnings
//  - inspection results for a small sample of routes (first 10 of sitemap)
//  - counts by coverageState
// Persists a snapshot row to gsc_coverage_snapshots.

const GW = 'https://connector-gateway.lovable.dev/google_search_console';
const SITE = 'https://plowwow.com/';
const SITE_ENC = encodeURIComponent(SITE);

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  return data ? { user, admin } : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const gscKey = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');
  const lovKey = Deno.env.get('LOVABLE_API_KEY');
  if (!gscKey || !lovKey) {
    return new Response(
      JSON.stringify({ error: 'gsc_not_connected', hint: 'Connect Google Search Console.' }),
      { status: 428, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const H = {
    Authorization: `Bearer ${lovKey}`,
    'X-Connection-Api-Key': gscKey,
    'Content-Type': 'application/json',
  };

  // Sitemaps
  const smResp = await fetch(`${GW}/webmasters/v3/sites/${SITE_ENC}/sitemaps`, { headers: H });
  if (!smResp.ok) {
    const body = await smResp.text();
    return new Response(
      JSON.stringify({ error: 'gsc_sitemaps_failed', status: smResp.status, details: body }),
      { status: smResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const sitemapsJson = await smResp.json();
  const sitemaps = sitemapsJson.sitemap ?? [];

  // Sample URLs from the app sitemap
  let sampleUrls: string[] = [];
  try {
    const xml = await (await fetch('https://plowwow.com/sitemap.xml')).text();
    sampleUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1])
      .filter((u) => !u.endsWith('/sitemap.xml'))
      .slice(0, 10);
  } catch (_) { /* ignore */ }

  // URL inspection
  const inspections: any[] = [];
  for (const u of sampleUrls) {
    const r = await fetch(`${GW}/v1/urlInspection/index:inspect`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ inspectionUrl: u, siteUrl: SITE }),
    });
    if (r.ok) {
      const j = await r.json();
      const idx = j?.inspectionResult?.indexStatusResult ?? {};
      inspections.push({
        url: u,
        coverageState: idx.coverageState,
        verdict: idx.verdict,
        lastCrawlTime: idx.lastCrawlTime,
        pageFetchState: idx.pageFetchState,
        indexingState: idx.indexingState,
        robotsTxtState: idx.robotsTxtState,
      });
    } else {
      inspections.push({ url: u, error: `${r.status}` });
    }
  }

  // Aggregate coverage
  const counts: Record<string, number> = {};
  for (const i of inspections) {
    const k = i.coverageState || 'Unknown';
    counts[k] = (counts[k] ?? 0) + 1;
  }
  const indexed = inspections.filter((i) => i.verdict === 'PASS').length;
  const discoveredNotIndexed = inspections.filter((i) =>
    /discovered/i.test(i.coverageState || '')
  ).length;
  const crawledNotIndexed = inspections.filter((i) =>
    /crawled/i.test(i.coverageState || '')
  ).length;
  const excluded = inspections.filter((i) => i.verdict === 'FAIL' || i.verdict === 'NEUTRAL').length;
  // Normalize errors into a safe { url, reason }[] shape. Values coming from
  // GSC may be missing, numeric, nested, or non-string — coerce and clamp so
  // downstream renderers and the DB jsonb column always see stable strings.
  const toReason = (i: any): string => {
    const raw =
      i?.error ??
      i?.coverageState ??
      i?.verdict ??
      i?.pageFetchState ??
      'Unknown';
    let s: string;
    if (typeof raw === 'string') s = raw;
    else if (raw == null) s = 'Unknown';
    else if (typeof raw === 'number' || typeof raw === 'boolean') s = String(raw);
    else {
      try { s = JSON.stringify(raw); } catch { s = String(raw); }
    }
    s = s.trim();
    if (!s) s = 'Unknown';
    return s.length > 500 ? s.slice(0, 497) + '…' : s;
  };
  const errors = inspections
    .filter((i) => i && (i.error || i.verdict === 'FAIL'))
    .map((i) => ({ url: typeof i.url === 'string' ? i.url : String(i.url ?? ''), reason: toReason(i) }))
    .filter((e) => e.url.length > 0);

  await auth.admin.from('gsc_coverage_snapshots').insert({
    site_url: SITE,
    sitemaps_submitted: sitemaps.length,
    urls_submitted: sampleUrls.length,
    urls_indexed: indexed,
    urls_discovered_not_indexed: discoveredNotIndexed,
    urls_crawled_not_indexed: crawledNotIndexed,
    urls_excluded: excluded,
    errors,
    raw: { sitemaps, inspections, counts },
  });

  return new Response(
    JSON.stringify({
      site: SITE,
      sitemaps,
      inspections,
      counts,
      summary: {
        indexed,
        discoveredNotIndexed,
        crawledNotIndexed,
        excluded,
        sampled: sampleUrls.length,
      },
      errors,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
