/**
 * Tiny client-side logger for PWA update events.
 *
 * Records when the update prompt is shown, dismissed, or accepted, plus
 * the currently controlling service worker version. Writes to
 * localStorage under `pw:pwa-events` (capped at 50 rows) and also
 * dispatches a `CustomEvent` so analytics/GTM can pick it up.
 *
 * No PII, no network calls of its own — this is a QA/telemetry hook
 * we can read from /admin/pwa-diagnostics.
 */
export type PwaEvent =
  | { type: "prompt-shown"; version?: string; at: string }
  | { type: "reload-clicked"; version?: string; at: string }
  | { type: "prompt-dismissed"; version?: string; at: string }
  | { type: "sw-updated"; version?: string; at: string }
  | { type: "controller-changed"; version?: string; at: string };

const KEY = "pw:pwa-events";
const MAX = 50;

export function readPwaEvents(): PwaEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PwaEvent[]) : [];
  } catch {
    return [];
  }
}

export function logPwaEvent(evt: Omit<PwaEvent, "at"> & { at?: string }) {
  if (typeof window === "undefined") return;
  const row = { ...evt, at: evt.at || new Date().toISOString() } as PwaEvent;
  try {
    const list = readPwaEvents();
    list.push(row);
    while (list.length > MAX) list.shift();
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage may be blocked in private mode */
  }
  try {
    window.dispatchEvent(new CustomEvent("pw:pwa-event", { detail: row }));
    // Optional GTM/dataLayer hook, no-op if absent.
    (window as any).dataLayer?.push?.({ event: "pwa_event", ...row });
  } catch {
    /* noop */
  }
}

export function clearPwaEvents() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(KEY); } catch { /* noop */ }
}
