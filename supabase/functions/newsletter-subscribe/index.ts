// Newsletter double opt-in: (1) receive email, (2) upsert an unconfirmed
// signup row with a fresh token, (3) send a confirmation email through
// the Resend connector gateway. Confirmation happens via newsletter-confirm.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://plowwow.com";
const FROM = "PlowWow <onboarding@resend.dev>";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildEmailHtml(confirmUrl: string) {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#ffffff;color:#0f172a;padding:24px;line-height:1.55">
    <div style="max-width:520px;margin:0 auto">
      <h1 style="font-size:22px;margin:0 0 12px">Confirm your PlowWow subscription</h1>
      <p style="margin:0 0 16px">Thanks for signing up for PlowWow's snow-season updates — neighborhood guides, strata liability tips, and de-icing news.</p>
      <p style="margin:0 0 20px">To activate your subscription, please confirm your email:</p>
      <p style="margin:0 0 24px"><a href="${confirmUrl}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Confirm subscription</a></p>
      <p style="margin:0 0 8px;font-size:13px;color:#475569">Or paste this link into your browser:</p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all;color:#334155"><a href="${confirmUrl}" style="color:#2563eb">${confirmUrl}</a></p>
      <p style="margin:0;font-size:12px;color:#64748b">If you didn't sign up, you can safely ignore this email — your subscription won't be activated without confirmation.</p>
    </div>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "server_not_configured" }, 500);
  }

  let payload: { email?: string; source?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const source = (payload.source ?? "footer").slice(0, 64);
  if (!email || email.length > 254 || !emailRe.test(email)) {
    return json({ error: "invalid_email" }, 400);
  }

  const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Look up existing row (unique on email).
  const { data: existing, error: selErr } = await supabase
    .from("newsletter_signups")
    .select("id, confirmed_at, confirmation_sent_at")
    .eq("email", email)
    .maybeSingle();
  if (selErr) {
    console.error("newsletter select failed:", selErr);
    return json({ error: "database_error" }, 500);
  }

  // If already confirmed, respond success without re-sending — avoids being
  // a re-confirmation spam vector.
  if (existing?.confirmed_at) {
    return json({ status: "already_confirmed" });
  }

  // Server-side resend cooldown: 30s between emails per address. Cheaper and
  // more robust than trusting the client — a page refresh can't bypass it.
  const COOLDOWN_MS = 30_000;
  if (existing?.confirmation_sent_at) {
    const last = new Date(existing.confirmation_sent_at).getTime();
    const wait = COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) {
      return json({ error: "too_soon", retry_after_ms: wait }, 429);
    }
  }

  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + TOKEN_TTL_MS);


  if (existing) {
    const { error: updErr } = await supabase
      .from("newsletter_signups")
      .update({
        source,
        user_agent: ua,
        confirmation_token: token,
        confirmation_sent_at: now.toISOString(),
        token_expires_at: expires.toISOString(),
      })
      .eq("id", existing.id);
    if (updErr) {
      console.error("newsletter update failed:", updErr);
      return json({ error: "database_error" }, 500);
    }
  } else {
    const { error: insErr } = await supabase.from("newsletter_signups").insert({
      email,
      source,
      user_agent: ua,
      confirmation_token: token,
      confirmation_sent_at: now.toISOString(),
      token_expires_at: expires.toISOString(),
    });
    if (insErr) {
      console.error("newsletter insert failed:", insErr);
      return json({ error: "database_error" }, 500);
    }
  }

  const confirmUrl = `${SITE_URL}/newsletter/confirm?token=${token}`;
  const emailRes = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: "Confirm your PlowWow subscription",
      html: buildEmailHtml(confirmUrl),
      text: `Confirm your PlowWow subscription: ${confirmUrl}\n\nIf you didn't sign up, ignore this email.`,
    }),
  });

  if (!emailRes.ok) {
    const details = await emailRes.text();
    console.error(`resend send failed [${emailRes.status}]:`, details);
    return json(
      { error: "email_send_failed", status: emailRes.status, details },
      502,
    );
  }

  return json({ status: "confirmation_sent" });
});
