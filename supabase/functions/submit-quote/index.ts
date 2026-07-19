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
  // Spam protection (client-injected, never persisted)
  hp: z.string().max(0).optional(), // honeypot: must be empty
  startedAt: z.number().int().positive().optional(),
});

// In-memory burst limiter (per warm container). Complements the DB check below.
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

// Persistent rate limits (survive cold starts) enforced through private schema.
const EMAIL_LIMIT_PER_DAY = 3;
const IP_LIMIT_PER_HOUR = 8;

// Minimum time between form render and submit — real users take >2s
const MIN_FORM_FILL_MS = 2000;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (burstLimited(ip)) {
      return jsonResponse(429, { error: "Too many requests. Please try again shortly." });
    }

    const body = await req.json().catch(() => null);
    const parsed = QuoteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(400, {
        error: "Invalid input",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const data = parsed.data;

    // Honeypot: if filled, silently accept (do not persist) so bots don't retry.
    if (data.hp && data.hp.length > 0) {
      console.warn("Honeypot triggered", { ip });
      return jsonResponse(200, { success: true });
    }

    // Timing check: too-fast submissions are almost certainly automated.
    if (data.startedAt && Date.now() - data.startedAt < MIN_FORM_FILL_MS) {
      console.warn("Submission too fast", { ip, elapsed: Date.now() - data.startedAt });
      return jsonResponse(429, { error: "Please take a moment to review, then resubmit." });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Backend is not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      db: { schema: "private" },
    });

    // Persistent rate limit: check recent submissions by email + IP
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: emailRecent } = await supabase
      .from("quote_request_submission_log")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email.toLowerCase())
      .gte("created_at", oneDayAgo);
    // supabase-js returns count via response header; fall back to a fresh query when needed
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
      return jsonResponse(429, {
        error: "You've submitted several quotes recently. Please email dispatch@plowwow.com to add more.",
      });
    }
    if ((ipCount ?? 0) >= IP_LIMIT_PER_HOUR) {
      return jsonResponse(429, {
        error: "Too many quote requests from your network. Please try again later.",
      });
    }
    void emailRecent;

    // Insert quote using service role (public INSERT is now revoked on the table)
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
      console.error("Insert error:", error);
      return jsonResponse(500, { error: "Could not save quote request" });
    }

    // Log the submission for future rate-limit checks (best-effort)
    await supabase.from("quote_request_submission_log").insert({
      email: data.email.toLowerCase(),
      ip,
    });

    console.log(
      JSON.stringify({
        event: "quote_request_received",
        id: inserted.id,
        email: data.email,
        serviceType: data.serviceType,
      }),
    );

    return jsonResponse(200, { success: true, id: inserted.id });
  } catch (err) {
    console.error("submit-quote error:", err);
    return jsonResponse(500, { error: "Unexpected error" });
  }
});
