/**
 * RLS & policy regression tests.
 *
 * Runs against the live Supabase project using ONLY the public anon key.
 * Asserts that anonymous clients cannot bypass the security posture set by
 * migrations. These tests guard against regressions of the findings fixed in
 * `20260719204204_*.sql` and the follow-up quote-request hardening migration.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://whrkfrewwstxgqoourwl.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndocmtmcmV3d3N0eGdxb291cndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mjc1NDUsImV4cCI6MjA5NDEwMzU0NX0.7tU6tUHTgSyYXARTSy0IrIx9pTOVcIj0Ax5QsXwNH34";

// Skip the whole suite when explicitly disabled (e.g. offline CI shard).
const runLive = process.env.SKIP_LIVE_RLS !== "1";

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

describe.runIf(runLive)("RLS regression: anonymous access is locked down", () => {
  it("quote_requests: anon cannot read", async () => {
    const { data, error } = await anon.from("quote_requests").select("id").limit(1);
    // RLS-blocked SELECT returns an empty set (no leak) — either an error or empty data.
    if (!error) expect(data ?? []).toEqual([]);
  });

  it("quote_requests: anon cannot insert directly (must use submit-quote edge function)", async () => {
    const { error } = await anon.from("quote_requests").insert({
      name: "Regression Test",
      email: `rls-test-${Date.now()}@example.com`,
      phone: "6045551234",
      address: "123 Test St, Vancouver, BC",
      postal_code: "V6B 1A1",
      service_type: "seasonal-contract",
      contact_method: "email",
      status: "new",
    });
    expect(error).not.toBeNull();
  });

  it("guest_post_submissions: anon can INSERT but only with status='pending'", async () => {
    // Attempt to escalate status to 'approved' — must fail the WITH CHECK.
    const { error: escalationErr } = await anon.from("guest_post_submissions").insert({
      name: "Bad Actor",
      email: `rls-escalation-${Date.now()}@example.com`,
      topic: "Escalation attempt",
      message: "should be rejected",
      status: "approved" as unknown as "pending",
    });
    expect(escalationErr).not.toBeNull();
  });

  it("guest_post_submissions: anon cannot read", async () => {
    const { data, error } = await anon
      .from("guest_post_submissions")
      .select("id")
      .limit(1);
    if (!error) expect(data ?? []).toEqual([]);
  });

  it("user_roles: anon cannot read", async () => {
    const { data, error } = await anon.from("user_roles").select("*").limit(1);
    if (!error) expect(data ?? []).toEqual([]);
  });

  it("has_role: not exposed on the public API schema", async () => {
    const { error } = await anon.rpc("has_role", {
      _user_id: "00000000-0000-0000-0000-000000000000",
      _role: "admin",
    });
    // Function was moved into the private schema; anon RPC must fail.
    expect(error).not.toBeNull();
  });

  it("private schema: not reachable via the Data API", async () => {
    const client = anon as unknown as {
      schema: (name: string) => {
        from: (t: string) => {
          select: (c: string) => { limit: (n: number) => Promise<{ error: unknown }> };
        };
      };
    };
    const { error } = await client
      .schema("private")
      .from("quote_request_submission_log")
      .select("id")
      .limit(1);
    expect(error).not.toBeNull();
  });
});
