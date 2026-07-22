import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(3).max(40).optional().or(z.literal("")),
  address: z.string().trim().min(3).max(300),
  city: z.string().trim().min(1).max(120),
  province: z.string().trim().min(2).max(60).optional().or(z.literal("")),
  propertyType: z.string().trim().min(1).max(40),
  serviceLevel: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  estimator: z
    .object({
      low: z.number().int().nonnegative(),
      high: z.number().int().nonnegative(),
      unit: z.enum(["season", "visit", "pass"]),
      propertySize: z.string().max(20).optional(),
      frequency: z.string().max(40).optional(),
      drivewayMeters: z.number().nonnegative().max(10000).optional(),
    })
    .optional(),
});

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unitLabel(u: "season" | "visit" | "pass") {
  return u === "season" ? "per season" : u === "visit" ? "per visit" : "per pass";
}

function serviceLabel(s: string) {
  switch (s) {
    case "seasonal":
      return "Seasonal contract (Nov–Mar)";
    case "per-visit":
      return "Per-visit / on-demand";
    case "de-icing-only":
      return "De-icing / salting only";
    default:
      return s;
  }
}

function propertyLabel(p: string) {
  switch (p) {
    case "strata":
      return "Strata / townhome complex";
    case "commercial":
      return "Commercial / retail";
    case "residential":
      return "Residential / driveway";
    case "industrial":
      return "Industrial / logistics";
    case "medical":
      return "Medical / hospital-adjacent";
    default:
      return p;
  }
}

function buildHtml(d: z.infer<typeof BodySchema>) {
  const estRow = d.estimator
    ? `
      <tr><td style="padding:6px 0;color:#64748b;">Live estimate</td>
          <td style="padding:6px 0;font-weight:700;">$${d.estimator.low.toLocaleString()} – $${d.estimator.high.toLocaleString()} ${unitLabel(d.estimator.unit)}</td></tr>
      ${d.estimator.propertySize ? `<tr><td style="padding:6px 0;color:#64748b;">Property size</td><td style="padding:6px 0;">${esc(d.estimator.propertySize)}</td></tr>` : ""}
      ${d.estimator.frequency ? `<tr><td style="padding:6px 0;color:#64748b;">Frequency</td><td style="padding:6px 0;">${esc(d.estimator.frequency)}</td></tr>` : ""}
      ${d.estimator.drivewayMeters ? `<tr><td style="padding:6px 0;color:#64748b;">Driveway length</td><td style="padding:6px 0;">${d.estimator.drivewayMeters} m</td></tr>` : ""}
    `
    : "";

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#ffffff;color:#0f172a;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;">
    <h1 style="font-size:22px;margin:0 0 8px;">Thanks, ${esc(d.name.split(" ")[0])}. Your ${esc(d.city)} quote request is in.</h1>
    <p style="color:#475569;line-height:1.5;">A PlowWow dispatcher will reply within one business day. If snow is falling right now, call <a href="tel:6047611518" style="color:#0d2a4a;font-weight:600;">604-761-1518</a> for priority dispatch.</p>

    <h2 style="font-size:16px;margin:24px 0 8px;">What happens next</h2>
    <ol style="color:#334155;line-height:1.55;padding-left:18px;">
      <li>Local ${esc(d.city)} route lead reviews your site details.</li>
      <li>We pull satellite imagery and confirm access, drive-aisle geometry, and salting priorities.</li>
      <li>You receive a firm quote by email — often the same day — with a start date and contract PDF.</li>
      <li>Sign, and you're on the ${esc(d.city)} route for the season.</li>
    </ol>

    <h2 style="font-size:16px;margin:24px 0 8px;">Your details</h2>
    <table style="width:100%;font-size:14px;border-top:1px solid #e2e8f0;">
      <tr><td style="padding:6px 0;color:#64748b;width:38%;">Name</td><td style="padding:6px 0;">${esc(d.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;">${esc(d.email)}</td></tr>
      ${d.phone ? `<tr><td style="padding:6px 0;color:#64748b;">Phone</td><td style="padding:6px 0;">${esc(d.phone)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#64748b;">Property address</td><td style="padding:6px 0;">${esc(d.address)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">City</td><td style="padding:6px 0;">${esc(d.city)}${d.province ? ", " + esc(d.province) : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Property type</td><td style="padding:6px 0;">${esc(propertyLabel(d.propertyType))}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Service level</td><td style="padding:6px 0;">${esc(serviceLabel(d.serviceLevel))}</td></tr>
      ${estRow}
      ${d.notes ? `<tr><td style="padding:6px 0;color:#64748b;">Site notes</td><td style="padding:6px 0;white-space:pre-wrap;">${esc(d.notes)}</td></tr>` : ""}
    </table>

    <p style="color:#64748b;font-size:12px;margin-top:24px;">This is a confirmation of your quote request only — not a binding quote. The estimate range shown reflects typical ${esc(d.city)} pricing for the details you provided; your final quote is confirmed by a route lead.</p>
    <p style="color:#94a3b8;font-size:12px;margin-top:12px;">PlowWow · 604-761-1518 · <a href="https://plowwow.com" style="color:#94a3b8;">plowwow.com</a></p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.error("Missing LOVABLE_API_KEY or RESEND_API_KEY");
    return json(500, { error: "email_not_configured" });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return json(400, {
      error: "invalid_body",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const d = parsed.data;
  const from = "PlowWow <quotes@plowwow.com>";
  const subject = `Your ${d.city} snow removal quote request — PlowWow`;
  const html = buildHtml(d);
  const text =
    `Thanks, ${d.name}. Your ${d.city} quote request is in.\n\n` +
    `Property: ${d.address}, ${d.city}${d.province ? ", " + d.province : ""}\n` +
    `Type: ${propertyLabel(d.propertyType)}\n` +
    `Service: ${serviceLabel(d.serviceLevel)}\n` +
    (d.estimator
      ? `Estimate: $${d.estimator.low}–$${d.estimator.high} ${unitLabel(d.estimator.unit)}\n`
      : "") +
    `\nWe reply within one business day. Storm-day: call 604-761-1518.`;

  const emailRes = await fetch(
    "https://connector-gateway.lovable.dev/resend/emails",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from,
        to: [d.email],
        subject,
        html,
        text,
        reply_to: "dispatch@plowwow.com",
      }),
    },
  );

  if (!emailRes.ok) {
    const details = await emailRes.text();
    console.error(`resend send failed [${emailRes.status}]:`, details);
    return json(502, {
      error: "email_send_failed",
      status: emailRes.status,
      details,
    });
  }

  return json(200, { ok: true });
});
