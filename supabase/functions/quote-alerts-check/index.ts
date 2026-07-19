import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const privateDb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { db: { schema: "private" } });

  const { data: configs, error } = await admin
    .from("quote_alert_configs").select("*").eq("enabled", true);
  if (error) return json(500, { error: error.message });

  const results: Array<Record<string, unknown>> = [];

  for (const cfg of configs ?? []) {
    const windowStart = new Date(Date.now() - cfg.window_minutes * 60_000).toISOString();
    const { data: events, error: evErr } = await privateDb
      .from("quote_request_events")
      .select("id, kind, created_at")
      .gte("created_at", windowStart)
      .in("kind", cfg.kinds);
    if (evErr) {
      results.push({ id: cfg.id, error: evErr.message });
      continue;
    }
    const count = events?.length ?? 0;

    if (count >= cfg.threshold) {
      // Debounce: only re-alert if last_triggered_at is older than the window
      const alreadyRecent =
        cfg.last_triggered_at &&
        new Date(cfg.last_triggered_at).getTime() > Date.now() - cfg.window_minutes * 60_000;
      if (!alreadyRecent && RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "PlowWow alerts <alerts@plowwow.com>",
            to: [cfg.notify_email],
            subject: `[PlowWow] Quote abuse alert: ${cfg.name} (${count} in ${cfg.window_minutes}m)`,
            html: `<h2>Alert: ${cfg.name}</h2>
              <p><strong>${count}</strong> matching events (kinds: ${cfg.kinds.join(", ")}) in the last <strong>${cfg.window_minutes} minutes</strong>, threshold ${cfg.threshold}.</p>
              <p><a href="https://plowwow.com/admin/quote-metrics">Open metrics dashboard</a></p>`,
          }),
        }).catch(() => {});
      }
      await admin.from("quote_alert_configs").update({
        last_triggered_at: new Date().toISOString(),
        last_count: count,
      }).eq("id", cfg.id);
      results.push({ id: cfg.id, name: cfg.name, count, triggered: !alreadyRecent });
    } else {
      results.push({ id: cfg.id, name: cfg.name, count, triggered: false });
    }
  }
  return json(200, { checked: results.length, results });
});
