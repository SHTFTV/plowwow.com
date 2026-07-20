// Newsletter double opt-in confirmation. Validates the token, checks TTL,
// and flips confirmed_at. Idempotent: re-clicking after confirmation still
// returns { status: "already_confirmed" }.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE)
    return json({ error: "server_not_configured" }, 500);

  let payload: { token?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const token = (payload.token ?? "").trim();
  if (!token || !/^[a-f0-9]{16,128}$/i.test(token))
    return json({ error: "invalid_token" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const { data: row, error: selErr } = await supabase
    .from("newsletter_signups")
    .select("id, email, confirmed_at, token_expires_at")
    .eq("confirmation_token", token)
    .maybeSingle();
  if (selErr) {
    console.error("newsletter-confirm select failed:", selErr);
    return json({ error: "database_error" }, 500);
  }
  if (!row) return json({ error: "token_not_found" }, 404);

  if (row.confirmed_at) return json({ status: "already_confirmed", email: row.email });

  if (row.token_expires_at && new Date(row.token_expires_at) < new Date())
    return json({ error: "token_expired" }, 410);

  const { error: updErr } = await supabase
    .from("newsletter_signups")
    .update({
      confirmed_at: new Date().toISOString(),
      confirmation_token: null,
      token_expires_at: null,
    })
    .eq("id", row.id);
  if (updErr) {
    console.error("newsletter-confirm update failed:", updErr);
    return json({ error: "database_error" }, 500);
  }

  return json({ status: "confirmed", email: row.email });
});
