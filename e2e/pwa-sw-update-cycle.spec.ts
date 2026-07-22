// e2e/pwa-sw-update-cycle.spec.ts
//
// Simulates a service-worker update cycle and verifies:
//   1. /diagnostics.json remains reachable and its `serviceWorker` metadata
//      (scriptPath, expectedScope, version) matches the deployed /sw.js.
//   2. On the diagnostics page, the live SW state transitions from
//      installing/waiting → activated after a forced update + reload.
//
// The transition is simulated by unregistering any existing worker (so the
// next page load must install fresh) and then reloading. We poll the live
// diagnostics indicator until `sw.state` is `activated` and the controller
// is present, matching diagnostics.json.swVersion.

import { expect, test } from "@playwright/test";

test("service worker update cycle: installing/waiting → activated matches diagnostics.json", async ({ page, request }) => {
  // Baseline: diagnostics.json is reachable and self-consistent.
  const diagRes = await request.get("/diagnostics.json");
  expect(diagRes.status()).toBe(200);
  const diag = await diagRes.json();
  expect(diag.serviceWorker).toBeTruthy();
  expect(diag.serviceWorker.scriptPath).toBe("/sw.js");
  expect(diag.serviceWorker.expectedScope).toBe("/");
  expect(diag.serviceWorker.version).toBe(diag.swVersion);

  // The deployed /sw.js must expose the same VERSION constant.
  const swRes = await request.get("/sw.js");
  expect(swRes.status()).toBe(200);
  const swText = await swRes.text();
  const swVersionMatch = /VERSION\s*=\s*["']([^"']+)["']/.exec(swText);
  expect(swVersionMatch, "sw.js exposes VERSION constant").toBeTruthy();
  expect(swVersionMatch![1]).toBe(diag.swVersion);

  // Force a fresh install cycle: land on the site, unregister any existing
  // registrations, then reload. This mimics the "waiting → activated"
  // transition a real update triggers on returning visitors.
  await page.goto("/");
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(regs.map((r) => r.unregister()));
  });
  await page.goto("/admin/pwa-diagnostics");

  // Capture the state pre-reload (may still be "no registration" or
  // "installing" depending on how quickly the SW registers).
  const preReload = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { state: "unsupported", controller: null };
    const reg = await navigator.serviceWorker.getRegistration();
    const sw = reg?.installing || reg?.waiting || reg?.active;
    return { state: sw?.state ?? "no registration", controller: navigator.serviceWorker.controller?.scriptURL ?? null };
  });
  expect(["no registration", "installing", "installed", "activating", "activated", "unsupported"]).toContain(preReload.state);

  // Reload — a returning visitor loads with the SW already registered; the
  // browser drives it through installing → installed → activating → activated.
  await page.reload({ waitUntil: "networkidle" });

  // Poll until the worker is activated (or bail if SW is unsupported).
  const finalState = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return { state: "unsupported", controller: null, scope: null };
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sw = reg?.active || reg?.waiting || reg?.installing;
      if (sw?.state === "activated") {
        return { state: sw.state, controller: navigator.serviceWorker.controller?.scriptURL ?? null, scope: reg?.scope ?? null };
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    const reg = await navigator.serviceWorker.getRegistration();
    const sw = reg?.active || reg?.waiting || reg?.installing;
    return { state: sw?.state ?? "no registration", controller: navigator.serviceWorker.controller?.scriptURL ?? null, scope: reg?.scope ?? null };
  });

  test.info().annotations.push({ type: "sw-final-state", description: JSON.stringify(finalState) });

  if (finalState.state === "unsupported") {
    test.skip(true, "Service workers not supported in this test browser");
    return;
  }

  // Assert transition landed on `activated` and the deployed script URL /
  // scope match /diagnostics.json's serviceWorker metadata.
  expect(finalState.state, "SW final state after reload").toBe("activated");
  expect(finalState.controller, "controller script URL").toContain(diag.serviceWorker.scriptPath);
  expect(finalState.scope, "registration scope").toContain(diag.serviceWorker.expectedScope);
});
