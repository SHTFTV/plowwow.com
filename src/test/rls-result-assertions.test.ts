import { describe, it, expect } from "vitest";
import { assertAnonReadBlocked, assertPolicyDenial } from "./rls-result-assertions";

describe("RLS response evidence", () => {
  it("accepts an actual empty anonymous SELECT and a database policy denial", () => {
    assertAnonReadBlocked({ status: 200, data: [], error: null });
    assertAnonReadBlocked({ status: 401, data: null, error: { code: "42501" } });
    assertPolicyDenial({ status: 403, error: { code: "42501" } }, ["42501"]);
  });

  it("accepts explicit schema/function exposure restrictions", () => {
    assertPolicyDenial({ status: 406, error: { code: "PGRST106" } }, ["PGRST106", "42501"]);
    assertPolicyDenial({ status: 404, error: { code: "PGRST202" } }, ["PGRST202", "42501"]);
  });

  for (const status of [0, 429, 500, 503]) {
    it(`rejects HTTP ${status} as evidence of a working RLS policy`, () => {
      const unavailable = { status, data: null, error: { code: "" } };
      expect(() => assertAnonReadBlocked(unavailable)).toThrow();
      expect(() => assertPolicyDenial(unavailable, ["42501"])).toThrow();
    });
  }

  it("rejects invalid credentials and missing tables instead of misreporting them as locked down", () => {
    for (const code of ["PGRST301", "42P01", undefined]) {
      const unrelated = { status: 401, error: { code } };
      expect(() => assertAnonReadBlocked(unrelated)).toThrow();
      expect(() => assertPolicyDenial(unrelated, ["42501"])).toThrow();
    }
  });

  it("rejects leaked rows and a successful prohibited operation", () => {
    expect(() => assertAnonReadBlocked({ status: 200, data: [{ id: "fixture" }], error: null })).toThrow();
    expect(() => assertPolicyDenial({ status: 201, error: null }, ["42501"])).toThrow();
  });
});
