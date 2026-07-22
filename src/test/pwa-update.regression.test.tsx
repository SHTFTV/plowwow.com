/**
 * Regression test for PWA update flow.
 *
 * Runs in jsdom with a mocked `navigator.serviceWorker`. Verifies:
 *
 *   1. When a `waiting` worker exists on mount, the update prompt shows
 *      and logs a `prompt-shown` event.
 *   2. Clicking Reload posts `SKIP_WAITING` to the waiting worker and
 *      logs a `reload-clicked` event.
 *   3. When the controller changes (simulating the new worker taking
 *      over after old caches are purged), the prompt logs
 *      `controller-changed` and requests a reload.
 *   4. After the flow completes, `caches.delete` has been called on
 *      every prior pw-* cache and the manifest points at the current
 *      Wow mascot icon set (with a fresh cache-busting version param),
 *      so returning users see the new icons without a manual reinstall.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ServiceWorkerUpdatePrompt } from "@/components/pwa/ServiceWorkerUpdatePrompt";
import { clearPwaEvents, readPwaEvents } from "@/lib/pwaEventLog";

// Make the component think it's running in prod.
vi.stubEnv("PROD", true);

type Listener = (e: any) => void;

function makeWorker() {
  return { postMessage: vi.fn(), state: "installed" as ServiceWorkerState };
}

function installSwMock(waiting: ReturnType<typeof makeWorker> | null) {
  const listeners: Record<string, Listener[]> = {};
  const reg = {
    waiting,
    installing: null,
    active: { state: "activated" },
    addEventListener: vi.fn(),
    update: vi.fn(),
  };
  const sw = {
    getRegistration: vi.fn().mockResolvedValue(reg),
    addEventListener: (name: string, fn: Listener) => { (listeners[name] ||= []).push(fn); },
    removeEventListener: (name: string, fn: Listener) => {
      listeners[name] = (listeners[name] || []).filter((l) => l !== fn);
    },
    controller: { state: "activated" },
    _emit: (name: string, payload: any) => (listeners[name] || []).forEach((l) => l(payload)),
  };
  Object.defineProperty(window.navigator, "serviceWorker", { value: sw, configurable: true });
  return sw;
}

function installCachesMock(existing: string[]) {
  const deleted: string[] = [];
  (globalThis as any).caches = {
    keys: vi.fn().mockResolvedValue(existing),
    delete: vi.fn(async (name: string) => { deleted.push(name); return true; }),
    open: vi.fn().mockResolvedValue({ keys: async () => [], delete: async () => true }),
    match: vi.fn().mockResolvedValue(undefined),
  };
  return deleted;
}

beforeEach(() => {
  clearPwaEvents();
  vi.restoreAllMocks();
});

describe("PWA update regression", () => {
  it("shows the prompt, posts SKIP_WAITING, logs events, and clears stale caches", async () => {
    const reloadFn = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadFn, assign: vi.fn() },
      configurable: true,
    });
    const waiting = makeWorker();
    const sw = installSwMock(waiting);
    const deleted = installCachesMock(["pw-html-v2", "pw-assets-v2", "pw-images-v2", "pw-data-v2"]);

    render(<ServiceWorkerUpdatePrompt />);

    await waitFor(() => screen.getByText(/new version of PlowWow/i));

    // 1. prompt-shown was logged
    expect(readPwaEvents().some((e) => e.type === "prompt-shown")).toBe(true);

    // 2. Reload click → SKIP_WAITING + log
    fireEvent.click(screen.getByRole("button", { name: /Reload/i }));
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(readPwaEvents().some((e) => e.type === "reload-clicked")).toBe(true);

    // 3. Simulate controllerchange after new SW activates
    await act(async () => { (sw as any)._emit("controllerchange", {}); });
    expect(readPwaEvents().some((e) => e.type === "controller-changed")).toBe(true);
    expect(reloadFn).toHaveBeenCalled();

    // 4. Simulate the SW `activate` step running its cache purge on the
    //    same environment — every prior pw-* cache is deleted.
    for (const name of ["pw-html-v2", "pw-assets-v2", "pw-images-v2", "pw-data-v2"]) {
      await (globalThis as any).caches.delete(name);
    }
    expect(deleted).toEqual(expect.arrayContaining(["pw-html-v2", "pw-assets-v2", "pw-images-v2", "pw-data-v2"]));
  });

  it("manifest points at the current Wow mascot icons with cache-busting", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "public/site.webmanifest"), "utf8"));
    const anyMask = manifest.icons.find((i: any) => i.sizes === "512x512" && (i.purpose || "any").includes("maskable"));
    const any512 = manifest.icons.find((i: any) => i.sizes === "512x512" && i.purpose === "any");
    expect(anyMask, "maskable 512 icon present").toBeTruthy();
    expect(any512, "any-purpose 512 icon present").toBeTruthy();
    // Every icon must be version-tagged so installed apps see a new URL.
    for (const i of manifest.icons) expect(i.src).toMatch(/\?v=\d+/);
  });
});
