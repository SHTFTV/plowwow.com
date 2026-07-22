import { useEffect, useState } from "react";
import { readPwaEvents, clearPwaEvents, type PwaEvent } from "@/lib/pwaEventLog";

type ManifestIcon = { src: string; sizes: string; type?: string; purpose?: string };
type IconReport = { total: number; failed: number; entries: Array<Record<string, unknown>> };

const REPORT_URL = "/pwa-icon-report.json";
const MANIFEST_URL = "/site.webmanifest";

export default function PwaDiagnostics() {
  const [manifest, setManifest] = useState<any>(null);
  const [report, setReport] = useState<IconReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [swVersion, setSwVersion] = useState<string | null>(null);
  const [swState, setSwState] = useState<string>("unknown");
  const [swInfo, setSwInfo] = useState<{
    scope: string | null;
    scriptURL: string | null;
    controller: string | null;
    updateViaCache: string | null;
    lastUpdateCheck: string | null;
    hasWaiting: boolean;
    hasInstalling: boolean;
  }>({ scope: null, scriptURL: null, controller: null, updateViaCache: null, lastUpdateCheck: null, hasWaiting: false, hasInstalling: false });
  const [events, setEvents] = useState<PwaEvent[]>([]);

  useEffect(() => {
    document.title = "PWA Diagnostics — PlowWow";
    fetch(MANIFEST_URL).then((r) => r.json()).then(setManifest).catch(() => setManifest({ error: "failed to load" }));
    fetch(REPORT_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then(setReport)
      .catch((e) => setReportError(String(e?.message || e)));
    setEvents(readPwaEvents());

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) { setSwState("no registration"); return; }
        const sw = reg.active || reg.waiting || reg.installing;
        setSwState(sw?.state || "unknown");
        setSwInfo({
          scope: reg.scope || null,
          scriptURL: sw?.scriptURL || null,
          controller: navigator.serviceWorker.controller?.scriptURL || null,
          updateViaCache: (reg as any).updateViaCache || null,
          lastUpdateCheck: new Date().toISOString(),
          hasWaiting: !!reg.waiting,
          hasInstalling: !!reg.installing,
        });
        if (sw) {
          const mc = new MessageChannel();
          mc.port1.onmessage = (e) => e.data?.version && setSwVersion(e.data.version);
          try { sw.postMessage({ type: "VERSION" }, [mc.port2]); } catch { /* noop */ }
        }
        fetch("/sw.js").then((r) => r.text()).then((t) => {
          const m = /VERSION\s*=\s*["']([^"']+)["']/.exec(t);
          if (m && !swVersion) setSwVersion(m[1]);
        }).catch(() => {});
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const refreshEvents = () => setEvents(readPwaEvents());
  const resetEvents = () => { clearPwaEvents(); setEvents([]); };
  const forceCheck = async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
    refreshEvents();
  };
  const killSw = () => { window.location.assign("/?sw=off"); };
  const hardReset = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.allSettled(names.map((n) => caches.delete(n)));
      }
      try { localStorage.removeItem("pwa-event-log"); } catch { /* noop */ }
    } finally {
      // Force a network fetch of the freshest HTML; bypass HTTP cache.
      const url = new URL(window.location.href);
      url.searchParams.set("_cb", String(Date.now()));
      window.location.replace(url.toString());
    }
  };

  const downloadReport = async () => {
    const [diag, liveCarousel] = await Promise.all([
      fetch("/diagnostics.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : { error: r.status }).catch((e) => ({ error: String(e?.message || e) })),
      fetch("/blog-index.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : { error: r.status }).catch((e) => ({ error: String(e?.message || e) })),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      href: window.location.href,
      userAgent: navigator.userAgent,
      diagnostics: diag,
      liveCarousel,
      serviceWorker: {
        state: swState,
        version: swVersion,
        controllerPresent: !!navigator.serviceWorker?.controller,
        ...swInfo,
      },
      pwaEvents: readPwaEvents(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pwa-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const icons: ManifestIcon[] = manifest?.icons || [];

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black text-foreground">PWA Diagnostics</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        QA view of installed manifest, service worker, and validated icon set.
      </p>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Service worker</h2>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">VERSION constant</dt>
          <dd className="font-mono">{swVersion ?? "…"}</dd>
          <dt className="text-muted-foreground">State</dt>
          <dd className="font-mono">{swState}</dd>
          <dt className="text-muted-foreground">Controller</dt>
          <dd className="font-mono" data-testid="sw-controller">{navigator.serviceWorker?.controller ? "controlled" : "no controller"}</dd>
          <dt className="text-muted-foreground">Registration scope</dt>
          <dd className="font-mono break-all">{swInfo.scope ?? "-"}</dd>
          <dt className="text-muted-foreground">Active script URL</dt>
          <dd className="font-mono break-all">{swInfo.scriptURL ?? "-"}</dd>
          <dt className="text-muted-foreground">Controller script URL</dt>
          <dd className="font-mono break-all">{swInfo.controller ?? "-"}</dd>
          <dt className="text-muted-foreground">updateViaCache</dt>
          <dd className="font-mono">{swInfo.updateViaCache ?? "-"}</dd>
          <dt className="text-muted-foreground">Waiting / Installing</dt>
          <dd className="font-mono">{String(swInfo.hasWaiting)} / {String(swInfo.hasInstalling)}</dd>
          <dt className="text-muted-foreground">Last update check</dt>
          <dd className="font-mono">{swInfo.lastUpdateCheck ?? "-"}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={forceCheck} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Check for update</button>
          <button onClick={killSw} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">Kill switch (?sw=off)</button>
          <button onClick={hardReset} className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">Reset caches & reload</button>
          <button onClick={downloadReport} data-testid="download-diagnostics" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">Download diagnostics report</button>
        </div>
      </section>


      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Manifest icons ({icons.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-1 pr-3">Preview</th><th className="pr-3">src</th><th className="pr-3">sizes</th><th className="pr-3">purpose</th></tr>
            </thead>
            <tbody>
              {icons.map((i) => (
                <tr key={i.src} className="border-t border-border/60">
                  <td className="py-2 pr-3"><img src={i.src} alt="" width={32} height={32} className="h-8 w-8 rounded" /></td>
                  <td className="pr-3 font-mono text-xs">{i.src}</td>
                  <td className="pr-3 font-mono text-xs">{i.sizes}</td>
                  <td className="pr-3 font-mono text-xs">{i.purpose || "any"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Latest CI validation report</h2>
        {reportError && (
          <p className="mt-2 text-xs text-muted-foreground">
            No <code>/pwa-icon-report.json</code> published yet — run <code>bun run pwa:icons</code> and copy the report into <code>public/</code> to expose it here. ({reportError})
          </p>
        )}
        {report && (
          <>
            <p className="mt-2 text-sm">
              <span className={report.failed ? "text-destructive" : "text-primary"}>
                {report.total - report.failed}/{report.total} icons OK
              </span>
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-1 pr-3">src</th><th className="pr-3">sizes</th><th className="pr-3">actual</th><th className="pr-3">mascotScore</th><th className="pr-3">status</th></tr>
                </thead>
                <tbody>
                  {report.entries.map((e: any) => (
                    <tr key={`${e.source}:${e.src}`} className="border-t border-border/60">
                      <td className="py-1 pr-3 font-mono">{e.src}</td>
                      <td className="pr-3">{e.sizes}</td>
                      <td className="pr-3">{e.actual || "-"}</td>
                      <td className="pr-3">{e.mascotScore || "-"}</td>
                      <td className={"pr-3 font-semibold " + (e.status === "OK" ? "text-primary" : "text-destructive")}>{e.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Update-prompt event log ({events.length})</h2>
          <div className="flex gap-2">
            <button onClick={refreshEvents} className="rounded-md border border-border px-3 py-1 text-xs">Refresh</button>
            <button onClick={resetEvents} className="rounded-md border border-border px-3 py-1 text-xs">Clear</button>
          </div>
        </div>
        {events.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No update events recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {[...events].reverse().map((e, i) => (
              <li key={i}><span className="text-muted-foreground">{e.at}</span> — {e.type}{"version" in e && e.version ? ` (v=${e.version})` : ""}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
