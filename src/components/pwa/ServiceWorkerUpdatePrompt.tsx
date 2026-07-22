import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Listens for two update signals from the service worker:
 *   1. A new SW has moved into the `waiting` state (there is a fresh
 *      build ready to activate).
 *   2. The active SW broadcasts `{ type: "sw-updated" }` after it
 *      finishes purging old caches on `activate`.
 *
 * Shows a small toast prompting the user to reload. Clicking the
 * button tells the waiting worker to `skipWaiting`, then reloads
 * once the new worker takes control.
 *
 * Only registers in production on the top-level origin — Lovable
 * preview iframes are already excluded by the existing preloader
 * guard, but we double-check here to avoid surprising editors.
 */
export function ServiceWorkerUpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!import.meta.env.PROD) return;
    if (window.top !== window.self) return;

    let cancelled = false;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg || cancelled) return;

      const trackWaiting = (sw: ServiceWorker | null) => {
        if (!sw) return;
        setWaiting(sw);
        setVisible(true);
      };

      trackWaiting(reg.waiting);

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            trackWaiting(installing);
          }
        });
      });
    });

    const onMessage = (evt: MessageEvent) => {
      if (evt.data && evt.data.type === "sw-updated") setVisible(true);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    let reloaded = false;
    const onController = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
      navigator.serviceWorker.removeEventListener("controllerchange", onController);
    };
  }, []);

  if (!visible) return null;

  const reload = () => {
    if (waiting) waiting.postMessage({ type: "SKIP_WAITING" });
    else window.location.reload();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur"
    >
      <p className="text-sm font-medium text-foreground">A new version of PlowWow is available.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Reload to get the latest icons, blog posts, and fixes.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={reload}>Reload</Button>
        <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>Later</Button>
      </div>
    </div>
  );
}

export default ServiceWorkerUpdatePrompt;
