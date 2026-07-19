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
      const channels: string[] = [];
      const emailEnabled = cfg.notify_email_enabled ?? true;
      const slackEnabled = cfg.notify_slack_enabled ?? false;
      const nowIso = new Date().toISOString();
      const update: Record<string, unknown> = {
        last_triggered_at: nowIso,
        last_count: count,
      };
      if (!alreadyRecent) {
        const summary = `Alert: ${cfg.name} — ${count} matching events (${cfg.kinds.join(", ")}) in the last ${cfg.window_minutes}m (threshold ${cfg.threshold}).`;
        if (emailEnabled && RESEND_API_KEY && cfg.notify_email) {
          try {
            const emailRes = await fetch("https://api.resend.com/emails", {
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
            });
            if (emailRes.ok) {
              channels.push("email");
              update.last_email_sent_at = nowIso;
              update.last_email_error = null;
            } else {
              const body = await emailRes.text();
              update.last_email_error = `${emailRes.status}: ${body.slice(0, 240)}`;
            }
          } catch (err) {
            update.last_email_error = err instanceof Error ? err.message : String(err);
          }
        } else if (emailEnabled && !RESEND_API_KEY) {
          update.last_email_error = "RESEND_API_KEY missing";
        }
        if (slackEnabled && cfg.slack_webhook_url) {
          try {
            const slackRes = await fetch(cfg.slack_webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: `:rotating_light: *${cfg.name}* — ${count} in ${cfg.window_minutes}m (threshold ${cfg.threshold})`,
                blocks: [
                  { type: "section", text: { type: "mrkdwn", text: `:rotating_light: *${cfg.name}*\n${summary}` } },
                  { type: "context", elements: [{ type: "mrkdwn", text: `<https://plowwow.com/admin/quote-metrics|Open metrics dashboard>` }] },
                ],
              }),
            });
            if (slackRes.ok) {
              channels.push("slack");
              update.last_slack_sent_at = nowIso;
              update.last_slack_error = null;
            } else {
              const body = await slackRes.text();
              update.last_slack_error = `${slackRes.status}: ${body.slice(0, 240)}`;
            }
          } catch (err) {
            update.last_slack_error = err instanceof Error ? err.message : String(err);
          }
        } else if (slackEnabled && !cfg.slack_webhook_url) {
          update.last_slack_error = "slack_webhook_url missing";
        }
      }
      await admin.from("quote_alert_configs").update(update).eq("id", cfg.id);
      results.push({ id: cfg.id, name: cfg.name, count, triggered: !alreadyRecent, channels });
    } else {
      results.push({ id: cfg.id, name: cfg.name, count, triggered: false });
    }
  }
  return json(200, { checked: results.length, results });
});
