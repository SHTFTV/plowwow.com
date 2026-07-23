// Ingest endpoint for scripts/deploy-check.ts. Persists a deploy_check row.
// Auth: requires x-cron-secret header matching CRON_SECRET.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');
  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: {
    ok?: boolean;
    host?: string;
    passed?: number;
    total?: number;
    rows?: Array<{ url: string; status: number; ok: boolean; note?: string; attempts?: number }>;
  };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error } = await admin.from('monitor_events').insert({
    kind: 'deploy_check',
    ok: body.ok ?? false,
    path: body.host ?? null,
    http_status: null,
    details: {
      passed: body.passed ?? 0,
      total: body.total ?? 0,
      rows: (body.rows ?? []).slice(0, 50),
    },
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ recorded: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
