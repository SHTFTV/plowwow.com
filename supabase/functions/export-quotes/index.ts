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

const esc = (v: unknown) => {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
};

const COLS = [
  "created_at","name","email","phone","address","postal_code",
  "service_type","contact_method","status","notes",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Missing auth" });

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Invalid session" });
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: roleRow } = await admin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleRow) return json(403, { error: "Not admin" });

  const filters = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const { data: job, error: jobErr } = await admin
    .from("quote_export_jobs")
    .insert({ requested_by: userId, status: "running", filters })
    .select("id").single();
  if (jobErr || !job) return json(500, { error: jobErr?.message ?? "job insert failed" });

  try {
    const PAGE = 1000;
    let from = 0;
    let total = 0;

    // Build a filter slug and human-readable summary for traceability
    const filterEntries = Object.entries(filters).filter(([, v]) => v != null && v !== "" && v !== "all");
    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    const filterSlug = filterEntries.length
      ? filterEntries.map(([k, v]) => `${slugify(k)}-${slugify(String(v))}`).join("_").slice(0, 120)
      : "all";
    const generatedAt = new Date().toISOString();
    const summaryLines = [
      `# PlowWow quote_requests export`,
      `# generated_at=${generatedAt}`,
      `# requested_by=${userId}`,
      `# filters=${JSON.stringify(filters)}`,
    ];
    const chunks: string[] = [...summaryLines, COLS.join(",")];

    while (true) {
      let q = admin.from("quote_requests").select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status as string);
      if (filters.service_type && filters.service_type !== "all") q = q.eq("service_type", filters.service_type as string);
      if (filters.date_from) q = q.gte("created_at", filters.date_from as string);
      if (filters.date_to) q = q.lte("created_at", filters.date_to as string);
      if (filters.search) {
        const safe = String(filters.search).replace(/[%,()]/g, " ");
        const p = `%${safe}%`;
        q = q.or(`name.ilike.${p},email.ilike.${p},phone.ilike.${p},address.ilike.${p},postal_code.ilike.${p}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) {
        chunks.push(COLS.map((c) => esc((r as Record<string, unknown>)[c])).join(","));
      }
      total += data.length;
      if (data.length < PAGE) break;
      from += PAGE;
      if (total >= 100_000) break; // hard cap safety
    }

    const csv = chunks.join("\n");
    const datePart = generatedAt.slice(0, 10);
    const filename = `quote-requests_${datePart}_${filterSlug}_${total}rows.csv`;
    const path = `${userId}/${Date.now()}_${filename}`;
    const { error: upErr } = await admin.storage.from("quote-exports").upload(path, new Blob([csv], { type: "text/csv" }), {
      contentType: "text/csv",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await admin.storage.from("quote-exports")
      .createSignedUrl(path, 60 * 60, { download: filename });
    if (signErr) throw signErr;

    await admin.from("quote_export_jobs").update({
      status: "completed",
      row_count: total,
      file_path: path,
      signed_url: signed.signedUrl,
    }).eq("id", job.id);

    return json(200, { job_id: job.id, row_count: total, signed_url: signed.signedUrl, filename });
  } catch (err) {
    await admin.from("quote_export_jobs").update({
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    }).eq("id", job.id);
    return json(500, { error: err instanceof Error ? err.message : String(err), job_id: job.id });
  }
});
