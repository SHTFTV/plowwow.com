import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const QuoteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(20).regex(/^[0-9+\-()\s]+$/),
  address: z.string().trim().min(5).max(200),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/),
  serviceType: z.enum([
    "residential-plowing",
    "commercial-plowing",
    "salting",
    "snow-relocation",
    "seasonal-contract",
  ]),
  contactMethod: z.enum(["phone", "email", "text"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  hp: z.string().max(0).optional(),
  startedAt: z.number().int().positive().optional(),
});

const burstBucket = new Map<string, { count: number; resetAt: number }>();
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 60_000;
function burstLimited(ip: string): boolean {
  const now = Date.now();
  const entry = burstBucket.get(ip);
  if (!entry || entry.resetAt < now) {
    burstBucket.set(ip, { count: 1, resetAt: now + BURST_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > BURST_LIMIT;
}

const EMAIL_LIMIT_PER_DAY = 3;
const IP_LIMIT_PER_HOUR = 8;
const MIN_FORM_FILL_MS = 2000;

type EventKind =
  | "ok"
  | "honeypot"
  | "too_fast"
  | "email_limit"
  | "ip_limit"
  | "burst_limit"
  | "invalid"
  | "insert_error"
  | "error";

// Friendly, user-safe error messages returned alongside a machine-readable code
const ERROR_COPY: Record<Exclude<EventKind, "ok">, string> = {
  honeypot: "Your submission looked automated. Please try again.",
  too_fast: "Please take a moment to review your details, then resubmit.",
  email_limit:
    "You've already submitted several quotes today. Email dispatch@plowwow.com to add more, or try again tomorrow.",
  ip_limit:
    "Too many quote requests from your network in the last hour. Please try again shortly.",
  burst_limit: "Too many requests in a short time. Please wait a minute and try again.",
  invalid: "Some fields need attention — please review the form and resubmit.",
  insert_error: "We couldn't save your request. Please try again in a moment.",
  error: "Something unexpected went wrong. Please try again.",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
let privateClient: any = null;
function getPrivateClient() {
  if (privateClient) return privateClient;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  privateClient = createClient(url, key, { db: { schema: "private" } });
  return privateClient;
}

async function logEvent(params: {
  kind: EventKind;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  // deno-lint-ignore no-explicit-any
  meta?: Record<string, any>;
}) {
  const { kind, email, ip, userAgent, meta } = params;
  // Structured log line — easy to ship to log-based metrics
  console.log(
    JSON.stringify({
      event: "quote_submit",
      kind,
      email: email ?? null,
      ip: ip ?? null,
      user_agent: userAgent ?? null,
      meta: meta ?? {},
      ts: new Date().toISOString(),
    }),
  );
  try {
    const db = getPrivateClient();
    if (!db) return;
    await db.from("quote_request_events").insert({
      kind,
      email: email ?? null,
      ip: ip ?? null,
      user_agent: userAgent ?? null,
      meta: meta ?? {},
    });
  } catch (err) {
    console.error("event log insert failed:", err);
  }
}

function errorResponse(status: number, kind: Exclude<EventKind, "ok">, extra?: Record<string, unknown>) {
  return jsonResponse(status, {
    error: ERROR_COPY[kind],
    code: kind,
    ...(extra ?? {}),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") ?? null;

  try {
    if (burstLimited(ip)) {
      await logEvent({ kind: "burst_limit", ip, userAgent });
      return errorResponse(429, "burst_limit");
    }

    const body = await req.json().catch(() => null);
    const parsed = QuoteSchema.safeParse(body);
    // Early denylist check on IP only (email not yet known)
    const dbEarly = getPrivateClient();
    if (dbEarly) {
      const { data: denyIp } = await dbEarly.rpc("is_quote_denylisted", {
        _email: "",
        _ip: ip,
      });
      if (denyIp === true) {
        await logEvent({ kind: "ip_limit", ip, userAgent, meta: { denylisted: true } });
        return errorResponse(429, "ip_limit");
      }
    }
    if (!parsed.success) {
      await logEvent({
        kind: "invalid",
        ip,
        userAgent,
        meta: { fields: Object.keys(parsed.error.flatten().fieldErrors) },
      });
      return jsonResponse(400, {
        error: ERROR_COPY.invalid,
        code: "invalid",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const data = parsed.data;

    if (data.hp && data.hp.length > 0) {
      await logEvent({ kind: "honeypot", email: data.email, ip, userAgent });
      // Silently accept for bots but return code so tests can assert.
      return jsonResponse(200, { success: true, code: "honeypot" });
    }

    if (data.startedAt && Date.now() - data.startedAt < MIN_FORM_FILL_MS) {
      await logEvent({
        kind: "too_fast",
        email: data.email,
        ip,
        userAgent,
        meta: { elapsed_ms: Date.now() - data.startedAt },
      });
      return errorResponse(429, "too_fast");
    }

    // Denylist by email (after parse)
    if (dbEarly) {
      const { data: denyEmail } = await dbEarly.rpc("is_quote_denylisted", {
        _email: data.email,
        _ip: "",
      });
      if (denyEmail === true) {
        await logEvent({ kind: "email_limit", email: data.email, ip, userAgent, meta: { denylisted: true } });
        return errorResponse(429, "email_limit");
      }
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Backend is not configured");

    const supabase = getPrivateClient()!;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: emailCount } = await supabase
      .from("quote_request_submission_log")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email.toLowerCase())
      .gte("created_at", oneDayAgo);
    const { count: ipCount } = await supabase
      .from("quote_request_submission_log")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", oneHourAgo);

    if ((emailCount ?? 0) >= EMAIL_LIMIT_PER_DAY) {
      await logEvent({
        kind: "email_limit",
        email: data.email,
        ip,
        userAgent,
        meta: { count: emailCount },
      });
      return errorResponse(429, "email_limit");
    }
    if ((ipCount ?? 0) >= IP_LIMIT_PER_HOUR) {
      await logEvent({
        kind: "ip_limit",
        email: data.email,
        ip,
        userAgent,
        meta: { count: ipCount },
      });
      return errorResponse(429, "ip_limit");
    }

    const publicDb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: inserted, error } = await publicDb
      .from("quote_requests")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        postal_code: data.postalCode.toUpperCase(),
        service_type: data.serviceType,
        contact_method: data.contactMethod,
        notes: data.notes || null,
      })
      .select("id")
      .single();

    if (error) {
      await logEvent({
        kind: "insert_error",
        email: data.email,
        ip,
        userAgent,
        meta: { db_error: error.message },
      });
      return errorResponse(500, "insert_error");
    }

    await supabase.from("quote_request_submission_log").insert({
      email: data.email.toLowerCase(),
      ip,
    });

    await logEvent({
      kind: "ok",
      email: data.email,
      ip,
      userAgent,
      meta: { id: inserted.id, service_type: data.serviceType },
    });

    return jsonResponse(200, { success: true, id: inserted.id, code: "ok" });
  } catch (err) {
    console.error("submit-quote error:", err);
    await logEvent({
      kind: "error",
      ip,
      userAgent,
      meta: { message: err instanceof Error ? err.message : String(err) },
    });
    return errorResponse(500, "error");
  }
});
