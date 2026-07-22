import { useCallback, useEffect, useRef, useState } from "react";
import { readPwaEvents, clearPwaEvents, type PwaEvent } from "@/lib/pwaEventLog";

type ManifestIcon = { src: string; sizes: string; type?: string; purpose?: string };
type IconReport = { total: number; failed: number; entries: Array<Record<string, unknown>> };
type SwInfo = {
  scope: string | null;
  scriptURL: string | null;
  controller: string | null;
  updateViaCache: string | null;
  lastUpdateCheck: string | null;
  hasWaiting: boolean;
  hasInstalling: boolean;
};

const REPORT_URL = "/pwa-icon-report.json";
const MANIFEST_URL = "/site.webmanifest";
const POLL_MS = 4000;
const EMPTY_SW_INFO: SwInfo = { scope: null, scriptURL: null, controller: null, updateViaCache: null, lastUpdateCheck: null, hasWaiting: false, hasInstalling: false };

async function readServiceWorker(): Promise<{ state: string; info: SwInfo; version: string | null }> {
  if (!("serviceWorker" in navigator)) return { state: "unsupported", info: EMPTY_SW_INFO, version: null };
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return { state: "no registration", info: EMPTY_SW_INFO, version: null };
  const sw = reg.active || reg.waiting || reg.installing;
  const info: SwInfo = {
    scope: reg.scope || null,
    scriptURL: sw?.scriptURL || null,
    controller: navigator.serviceWorker.controller?.scriptURL || null,
    updateViaCache: (reg as any).updateViaCache || null,
    lastUpdateCheck: new Date().toISOString(),
    hasWaiting: !!reg.waiting,
    hasInstalling: !!reg.installing,
  };
  let version: string | null = null;
  if (sw) {
    version = await new Promise<string | null>((resolve) => {
      const mc = new MessageChannel();
      const t = setTimeout(() => resolve(null), 300);
      mc.port1.onmessage = (e) => { clearTimeout(t); resolve(e.data?.version || null); };
      try { sw.postMessage({ type: "VERSION" }, [mc.port2]); } catch { clearTimeout(t); resolve(null); }
    });
  }
  return { state: sw?.state || "unknown", info, version };
}

export default function PwaDiagnostics() {
  const [manifest, setManifest] = useState<any>(null);
  const [report, setReport] = useState<IconReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [swVersion, setSwVersion] = useState<string | null>(null);
  const [swState, setSwState] = useState<string>("unknown");
  const [swInfo, setSwInfo] = useState<SwInfo>(EMPTY_SW_INFO);
  const [events, setEvents] = useState<PwaEvent[]>([]);
  const [liveDiag, setLiveDiag] = useState<any>(null);
  const [liveCarousel, setLiveCarousel] = useState<any>(null);
  const [poll, setPoll] = useState<boolean>(true);
  const [changedAt, setChangedAt] = useState<string | null>(null);
  const [uploadedReport, setUploadedReport] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastSigRef = useRef<string>("");

  const refreshLive = useCallback(async () => {
    const [{ state, info, version }, diag, carousel] = await Promise.all([
      readServiceWorker(),
      fetch("/diagnostics.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("/blog-index.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);
    setSwState(state);
    setSwInfo(info);
    if (version) setSwVersion(version);
    else if (diag?.swVersion) setSwVersion((prev) => prev ?? diag.swVersion);
    setLiveDiag(diag);
    setLiveCarousel(carousel);
    const sig = JSON.stringify({
      state, scriptURL: info.scriptURL, controller: info.controller,
      hasWaiting: info.hasWaiting, hasInstalling: info.hasInstalling,
      swVersion: version ?? diag?.swVersion ?? null,
      carousel: diag?.carousel, blogIndexAt: diag?.blogIndexAt,
      liveCarousel: carousel?.carousel,
    });
    if (lastSigRef.current && lastSigRef.current !== sig) {
      setChangedAt(new Date().toISOString());
    }
    lastSigRef.current = sig;
  }, []);

  useEffect(() => {
    document.title = "PWA Diagnostics — PlowWow";
    fetch(MANIFEST_URL).then((r) => r.json()).then(setManifest).catch(() => setManifest({ error: "failed to load" }));
    fetch(REPORT_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then(setReport)
      .catch((e) => setReportError(String(e?.message || e)));
    setEvents(readPwaEvents());
    void refreshLive();
  }, [refreshLive]);

  useEffect(() => {
    if (!poll) return;
    const id = window.setInterval(() => { void refreshLive(); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [poll, refreshLive]);



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

  const onUploadReport = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setUploadedReport(parsed);
      } catch (e) {
        setUploadError(`Not a valid JSON report: ${String((e as Error)?.message || e)}`);
        setUploadedReport(null);
      }
    };
    reader.onerror = () => setUploadError("Failed to read file");
    reader.readAsText(file);
  };

  const compareRows = (() => {
    if (!uploadedReport) return null;
    const current = {
      swVersion: swVersion,
      "diagnostics.generatedAt": liveDiag?.generatedAt ?? null,
      "diagnostics.blogIndexAt": liveDiag?.blogIndexAt ?? null,
      "diagnostics.carousel": liveDiag?.carousel ?? null,
      "diagnostics.totalPosts": liveDiag?.totalPosts ?? null,
      "sw.scriptURL": swInfo.scriptURL,
      "sw.controller": swInfo.controller,
      "sw.scope": swInfo.scope,
      "sw.state": swState,
    };
    const prev = {
      swVersion: uploadedReport?.serviceWorker?.version ?? uploadedReport?.diagnostics?.swVersion ?? null,
      "diagnostics.generatedAt": uploadedReport?.diagnostics?.generatedAt ?? null,
      "diagnostics.blogIndexAt": uploadedReport?.diagnostics?.blogIndexAt ?? null,
      "diagnostics.carousel": uploadedReport?.diagnostics?.carousel ?? null,
      "diagnostics.totalPosts": uploadedReport?.diagnostics?.totalPosts ?? null,
      "sw.scriptURL": uploadedReport?.serviceWorker?.scriptURL ?? null,
      "sw.controller": uploadedReport?.serviceWorker?.controller ?? null,
      "sw.scope": uploadedReport?.serviceWorker?.scope ?? null,
      "sw.state": uploadedReport?.serviceWorker?.state ?? null,
    };
    return Object.keys(current).map((k) => {
      const a = JSON.stringify((current as any)[k]);
      const b = JSON.stringify((prev as any)[k]);
      return { field: k, current: a, previous: b, changed: a !== b };
    });
  })();

  const icons: ManifestIcon[] = manifest?.icons || [];
  const changedRecent = changedAt && Date.now() - new Date(changedAt).getTime() < POLL_MS * 2;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-foreground">PWA Diagnostics</h1>
        <div className="flex items-center gap-2 text-xs" data-testid="live-indicator">
          <span
            aria-label={changedRecent ? "values changed" : poll ? "live polling" : "polling paused"}
            className={
              "inline-block h-2.5 w-2.5 rounded-full " +
              (changedRecent ? "bg-destructive animate-pulse" : poll ? "bg-primary animate-pulse" : "bg-muted-foreground")
            }
          />
          <span className="text-muted-foreground">
            {poll ? `Polling every ${POLL_MS / 1000}s` : "Paused"}
            {changedAt ? ` · last change ${new Date(changedAt).toLocaleTimeString()}` : ""}
          </span>
          <button
            onClick={() => setPoll((v) => !v)}
            className="ml-2 rounded-md border border-border px-2 py-0.5 text-xs"
          >
            {poll ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => void refreshLive()}
            className="rounded-md border border-border px-2 py-0.5 text-xs"
          >
            Refresh now
          </button>
        </div>
      </div>
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

      <section className="mt-6 rounded-xl border border-border bg-card p-5" data-testid="compare-reports">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Compare reports</h2>
          <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs font-semibold">
            Upload previous JSON report
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              data-testid="compare-upload"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadReport(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {uploadError && <p className="mt-2 text-xs text-destructive">{uploadError}</p>}
        {!uploadedReport && !uploadError && (
          <p className="mt-2 text-xs text-muted-foreground">
            Upload a previously downloaded diagnostics report to see field-level diffs against the current state.
          </p>
        )}
        {compareRows && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs" data-testid="compare-table">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-1 pr-3">Field</th><th className="pr-3">Previous</th><th className="pr-3">Current</th><th className="pr-3">Δ</th></tr>
              </thead>
              <tbody>
                {compareRows.map((r) => (
                  <tr key={r.field} className={"border-t border-border/60 " + (r.changed ? "bg-destructive/5" : "")} data-changed={r.changed ? "1" : "0"}>
                    <td className="py-1 pr-3 font-mono">{r.field}</td>
                    <td className="pr-3 font-mono break-all">{r.previous}</td>
                    <td className="pr-3 font-mono break-all">{r.current}</td>
                    <td className={"pr-3 font-semibold " + (r.changed ? "text-destructive" : "text-muted-foreground")}>{r.changed ? "changed" : "same"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              {compareRows.filter((r) => r.changed).length} of {compareRows.length} fields changed.
              {" "}Live carousel from <code>/blog-index.json</code>: {liveCarousel?.carousel?.length ?? 0} slugs.
            </p>
          </div>
        )}
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
