import { expect } from "vitest";

// Error codes: https://docs.postgrest.org/en/stable/references/errors.html
type ApiResult = {
  status: number;
  data?: unknown;
  error: { code?: string } | null;
};

function assertApiResponded(result: ApiResult) {
  const context = `Expected a reachable Supabase Data API, received HTTP ${result.status}. A transport failure, outage or quota response does not verify RLS.`;
  expect(result.status, context).toBeGreaterThanOrEqual(200);
  expect(result.status, context).toBeLessThan(500);
  expect(result.status, context).not.toBe(429);
}

export function assertAnonReadBlocked(result: ApiResult) {
  assertApiResponded(result);
  if (result.error) {
    // Invalid keys, missing relations and fetch errors are not policy evidence.
    expect(result.error.code, "Read denial must come from a database access policy").toBe("42501");
  } else {
    expect(result.data, "A successful anonymous SELECT must expose no rows").toEqual([]);
  }
}

export function assertPolicyDenial(result: ApiResult, allowedCodes: string[]) {
  assertApiResponded(result);
  expect(result.error, "The prohibited operation must be rejected by the Data API").not.toBeNull();
  expect(allowedCodes, "Transport errors, invalid keys and unrelated API errors cannot prove policy enforcement")
    .toContain(result.error?.code);
}
