// Shared deterministic guardrails for every SEO-related vitest run.
// Import once at the top of an SEO test file.
import { vi, beforeAll, beforeEach, afterAll } from "vitest";

// 1. Freeze "now" so Date-derived metadata (lastmod, JSON-LD dates) is stable.
export const FROZEN_NOW = new Date("2026-01-15T12:00:00.000Z");

beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, now: FROZEN_NOW });
});

afterAll(() => {
  vi.useRealTimers();
});

// 2. Any real network call is a bug in an SEO unit test. Fail loudly instead of hanging.
const originalFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = vi.fn(async (...args: unknown[]) => {
    throw new Error(
      `[seo-test-guard] real network call blocked: ${JSON.stringify(args[0])}`,
    );
  }) as unknown as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});

// 3. Clean DOM between tests so meta assertions never see leftovers.
beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

// 4. Stable resolveTimeout so waitFor never varies with CI load.
export const WAIT = { timeout: 3000, interval: 25 } as const;
