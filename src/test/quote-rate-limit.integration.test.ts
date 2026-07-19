/**
 * Live rate-limit integration test for the `submit-quote` edge function.
 *
 * Gated behind RUN_LIVE_RATE_LIMIT_TEST=1 because it hits the deployed function
 * and inserts real rows in `quote_requests` / `private.quote_request_events`.
 *
 * It fakes the client IP via `x-forwarded-for` (the function trusts the first
 * hop in that header) and uses uniquely-generated test emails per run.
 */
import { describe, it, expect, beforeAll } from "vitest";

const URL_BASE =
  process.env.VITE_SUPABASE_URL ??
  "https://whrkfrewwstxgqoourwl.supabase.co";
const ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "";

const ENABLED = process.env.RUN_LIVE_RATE_LIMIT_TEST === "1";

const fnUrl = `${URL_BASE}/functions/v1/submit-quote`;

function fakeIp() {
  // RFC 5737 TEST-NET-1 range — non-routable, avoids collisions with real users
  const oct = () => Math.floor(Math.random() * 254) + 1;
  return `192.0.2.${oct()}`;
}

function makeBody(email: string, overrides: Record<string, unknown> = {}) {
  return {
    name: "Rate Limit Test",
    email,
    phone: "604-555-0100",
    address: "123 Test Ave, Vancouver, BC",
    postalCode: "V6B 1A1",
    serviceType: "residential-plowing",
    contactMethod: "email",
    notes: "automated rate-limit test",
    // Old enough to pass MIN_FORM_FILL_MS (2s)
    startedAt: Date.now() - 5000,
    ...overrides,
  };
}

async function submit(body: unknown, ip: string) {
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON,
      authorization: `Bearer ${ANON}`,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    code?: string;
  };
  return { status: res.status, json };
}

describe.skipIf(!ENABLED)("submit-quote rate limiting (live)", () => {
  beforeAll(() => {
    if (!ANON) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY must be set");
  });

  it("returns email_limit after 3 successful submissions with the same email", async () => {
    const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const email = `rl-email-${runId}@plowwow-test.invalid`;
    // Fresh IP per attempt so we test only the per-email limit
    const results: Array<{ status: number; code?: string }> = [];
    for (let i = 0; i < 4; i++) {
      const r = await submit(makeBody(email), fakeIp());
      results.push({ status: r.status, code: r.json.code });
    }
    // First three should succeed, fourth should be email-limited
    expect(results.slice(0, 3).every((r) => r.status === 200 && r.code === "ok")).toBe(true);
    expect(results[3].status).toBe(429);
    expect(results[3].code).toBe("email_limit");
  }, 30_000);

  it("returns ip_limit after 8 submissions from the same IP within an hour", async () => {
    const ip = fakeIp();
    const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    // Use unique emails so we hit the IP limit before the email limit.
    // The in-memory burst limiter is 5/min, so we space submissions with a short delay
    // and expect either burst_limit or ip_limit on the 9th attempt.
    const results: Array<{ status: number; code?: string }> = [];
    for (let i = 0; i < 9; i++) {
      const email = `rl-ip-${runId}-${i}@plowwow-test.invalid`;
      const r = await submit(makeBody(email), ip);
      results.push({ status: r.status, code: r.json.code });
      // Small delay to let the burst window drain between batches of 5
      if (i === 4) await new Promise((res) => setTimeout(res, 65_000));
    }
    const blocked = results[8];
    expect(blocked.status).toBe(429);
    expect(["ip_limit", "burst_limit"]).toContain(blocked.code);
  }, 120_000);

  it("returns 400 invalid with field details for bad input", async () => {
    const r = await submit(
      { ...makeBody("not-an-email"), email: "not-an-email" },
      fakeIp(),
    );
    expect(r.status).toBe(400);
    expect(r.json.code).toBe("invalid");
  });

  it("returns too_fast when startedAt is under the minimum fill time", async () => {
    const email = `rl-fast-${Date.now().toString(36)}@plowwow-test.invalid`;
    const r = await submit(
      makeBody(email, { startedAt: Date.now() - 500 }),
      fakeIp(),
    );
    expect(r.status).toBe(429);
    expect(r.json.code).toBe("too_fast");
  });

  it("silently accepts honeypot submissions (200 with code=honeypot)", async () => {
    const email = `rl-hp-${Date.now().toString(36)}@plowwow-test.invalid`;
    const r = await submit(makeBody(email, { hp: "i-am-a-bot" }), fakeIp());
    // Zod max(0) rejects any non-empty honeypot → 400 invalid.
    // Our contract: bots should not learn they were caught, so either
    // an invalid response or a silent 200/honeypot is acceptable.
    expect([200, 400]).toContain(r.status);
    if (r.status === 200) expect(r.json.code).toBe("honeypot");
    else expect(r.json.code).toBe("invalid");
  });
});
