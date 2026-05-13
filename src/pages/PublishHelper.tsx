import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Copy, Download, ExternalLink, Loader2, RefreshCw, Rocket, Save, Trash2, XCircle } from "lucide-react";

const STORAGE_KEY = "plowwow:liveUrl";

type RawError = {
  name: string;
  message: string;
  stack?: string;
};

type ProbeAttempt = {
  url: string;
  mode: "cors" | "no-cors";
  ok: boolean;
  status: number | null;
  ms: number;
  error?: RawError;
};

type CheckResult =
  | { kind: "ok"; status: number; ms: number; url: string; swapped?: boolean; attempts: ProbeAttempt[] }
  | { kind: "reachable"; ms: number; url: string; swapped?: boolean; attempts: ProbeAttempt[] }
  | { kind: "error"; message: string; attempts: ProbeAttempt[] };

const toRawError = (err: unknown): RawError => {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { name: "NonError", message: String(err) };
};

const PublishHelper = () => {
  const [liveUrl, setLiveUrl] = useState("");
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [includeStackTraces, setIncludeStackTraces] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    setLiveUrl(saved);
    setDraft(saved);
  }, []);

  const normalize = (v: string) => {
    const t = v.trim();
    if (!t) return "";
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  };

  const save = () => {
    const url = normalize(draft);
    if (!url) {
      toast.error("Enter a URL first");
      return;
    }
    try {
      new URL(url);
    } catch {
      toast.error("That doesn't look like a valid URL");
      return;
    }
    localStorage.setItem(STORAGE_KEY, url);
    setLiveUrl(url);
    setDraft(url);
    toast.success("Live URL saved");
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLiveUrl("");
    setDraft("");
    toast("Cleared");
  };

  const copy = async () => {
    if (!liveUrl) return;
    await navigator.clipboard.writeText(liveUrl);
    toast.success("Copied to clipboard");
  };

  const copyDebug = async () => {
    if (!result) return;
    const lines = [
      `Saved URL: ${liveUrl}`,
      `Checked at: ${new Date().toISOString()}`,
    ];
    if (result.kind === "ok") {
      lines.push(`Tried URL: ${result.url}`);
      lines.push(`Scheme swap: ${result.swapped ? "yes" : "no"}`);
      lines.push(`HTTP status: ${result.status}`);
      lines.push(`Response time: ${result.ms} ms`);
    } else if (result.kind === "reachable") {
      lines.push(`Tried URL: ${result.url}`);
      lines.push(`Scheme swap: ${result.swapped ? "yes" : "no"}`);
      lines.push(`HTTP status: unavailable (CORS)`);
      lines.push(`Response time: ${result.ms} ms`);
    } else {
      lines.push(`Tried URL: ${liveUrl} (and scheme-swapped fallback)`);
      lines.push(`Result: error`);
      lines.push(`Message: ${result.message}`);
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Debug summary copied");
  };

  const copyDebugJson = async () => {
    if (!result) return;
    const base = {
      savedUrl: liveUrl,
      checkedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      attempts: result.attempts,
    };
    const payload =
      result.kind === "ok"
        ? {
            ...base,
            result: {
              outcome: "ok" as const,
              triedUrl: result.url,
              schemeSwapped: !!result.swapped,
              httpStatus: result.status,
              responseTimeMs: result.ms,
            },
          }
        : result.kind === "reachable"
        ? {
            ...base,
            result: {
              outcome: "reachable" as const,
              triedUrl: result.url,
              schemeSwapped: !!result.swapped,
              httpStatus: null,
              httpStatusNote: "unavailable due to CORS",
              responseTimeMs: result.ms,
            },
          }
        : {
            ...base,
            result: {
              outcome: "error" as const,
              triedUrl: liveUrl,
              schemeSwapAttempted: true,
              message: result.message,
            },
          };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success("Debug JSON copied");
  };

  const copyAttemptsText = async () => {
    if (!result || result.attempts.length === 0) return;
    const lines: string[] = [];
    lines.push("=".repeat(50));
    lines.push(`ATTEMPTS  (${result.attempts.length})`);
    lines.push(`Saved URL: ${liveUrl}`);
    lines.push("=".repeat(50));
    lines.push("");

    for (let i = 0; i < result.attempts.length; i++) {
      const a = result.attempts[i];
      lines.push("-".repeat(50));
      lines.push(`ATTEMPT ${i + 1}`);
      lines.push(`  URL   : ${a.url}`);
      lines.push(`  Mode  : ${a.mode}`);
      lines.push(`  Result: ${a.ok ? "ok" : "failed"}`);
      if (a.status !== null) {
        lines.push(`  Status: HTTP ${a.status}`);
      }
      lines.push(`  Time  : ${a.ms} ms`);
      if (a.error) {
        lines.push("");
        lines.push(`  Error : ${a.error.name}: ${a.error.message}`);
        if (includeStackTraces && a.error.stack) {
          lines.push("  Stack trace:");
          for (const row of a.error.stack.split("\n")) {
            lines.push(`    ${row}`);
          }
        }
      }
      lines.push("-".repeat(50));
      lines.push("");
    }

    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Attempts copied as text");
  };

  const copyAttemptsCsv = async () => {
    if (!result || result.attempts.length === 0) return;
    const escapeCsv = (v: string | number | null): string => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows: (string | number)[][] = [
      ["Attempt", "URL", "Mode", "Result", "HTTP Status", "Time (ms)", "Error Name", "Error Message"],
    ];
    for (let i = 0; i < result.attempts.length; i++) {
      const a = result.attempts[i];
      rows.push([
        i + 1,
        a.url,
        a.mode,
        a.ok ? "ok" : "failed",
        a.status ?? "",
        a.ms,
        a.error?.name ?? "",
        a.error?.message ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
    await navigator.clipboard.writeText(csv);
    toast.success("Attempts copied as CSV");
  };

  const downloadAttemptsCsv = () => {
    if (!result || result.attempts.length === 0) return;
    const escapeCsv = (v: string | number | null): string => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows: (string | number)[][] = [
      ["Attempt", "URL", "Mode", "Result", "HTTP Status", "Time (ms)", "Error Name", "Error Message"],
    ];
    for (let i = 0; i < result.attempts.length; i++) {
      const a = result.attempts[i];
      rows.push([
        i + 1,
        a.url,
        a.mode,
        a.ok ? "ok" : "failed",
        a.status ?? "",
        a.ms,
        a.error?.name ?? "",
        a.error?.message ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "attempts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded attempts.csv");
  };

  const swapScheme = (url: string) =>
    url.startsWith("https://")
      ? "http://" + url.slice("https://".length)
      : url.startsWith("http://")
      ? "https://" + url.slice("http://".length)
      : url;

  const probe = async (url: string): Promise<{
    ok: boolean;
    status: number | null;
    ms: number;
    message?: string;
    attempts: ProbeAttempt[];
  }> => {
    const attempts: ProbeAttempt[] = [];

    const start1 = performance.now();
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const ms = Math.round(performance.now() - start1);
      attempts.push({ url, mode: "cors", ok: true, status: res.status, ms });
      return { ok: true, status: res.status, ms, attempts };
    } catch (err) {
      const ms = Math.round(performance.now() - start1);
      attempts.push({ url, mode: "cors", ok: false, status: null, ms, error: toRawError(err) });
    }

    const start2 = performance.now();
    try {
      await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store" });
      const ms = Math.round(performance.now() - start2);
      attempts.push({ url, mode: "no-cors", ok: true, status: null, ms });
      return { ok: true, status: null, ms, attempts };
    } catch (err) {
      const ms = Math.round(performance.now() - start2);
      const raw = toRawError(err);
      attempts.push({ url, mode: "no-cors", ok: false, status: null, ms, error: raw });
      return { ok: false, status: null, ms, message: raw.message, attempts };
    }
  };

  const verify = async () => {
    if (!liveUrl) return;
    setChecking(true);
    setResult(null);

    const all: ProbeAttempt[] = [];
    let attempt = await probe(liveUrl);
    all.push(...attempt.attempts);
    let usedUrl = liveUrl;
    let swapped = false;

    if (!attempt.ok) {
      const alt = swapScheme(liveUrl);
      if (alt !== liveUrl) {
        toast(`Retrying with ${alt.startsWith("https") ? "https" : "http"}…`);
        const second = await probe(alt);
        all.push(...second.attempts);
        if (second.ok) {
          attempt = second;
          usedUrl = alt;
          swapped = true;
        }
      }
    }

    if (attempt.ok) {
      if (attempt.status !== null) {
        setResult({ kind: "ok", status: attempt.status, ms: attempt.ms, url: usedUrl, swapped, attempts: all });
        const msg = `${attempt.status} in ${attempt.ms} ms${swapped ? " (after scheme swap)" : ""}`;
        attempt.status >= 200 && attempt.status < 400 ? toast.success(msg) : toast.error(msg);
      } else {
        setResult({ kind: "reachable", ms: attempt.ms, url: usedUrl, swapped, attempts: all });
        toast.success(
          `Reachable in ${attempt.ms} ms${swapped ? " (after scheme swap)" : ""} (status hidden by CORS)`,
        );
      }
    } else {
      setResult({ kind: "error", message: attempt.message ?? "Network error", attempts: all });
      toast.error("Could not reach the URL on http or https");
    }

    setChecking(false);
  };

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="container max-w-2xl">
        <div className="mb-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to site
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-black">Publish helper</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Quick reminder of how to publish, plus a place to stash your live URL.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">How to publish</CardTitle>
            <CardDescription>Publishing happens inside the Lovable editor — not from this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <Badge variant="secondary" className="mb-2">Desktop</Badge>
              <p className="text-muted-foreground">
                Click the <strong className="text-foreground">Publish</strong> button in the
                top-right of the Lovable editor → <strong className="text-foreground">Update</strong>.
              </p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Mobile</Badge>
              <p className="text-muted-foreground">
                Switch to Preview, tap the <strong className="text-foreground">…</strong> button
                in the bottom-right → <strong className="text-foreground">Publish</strong>.
              </p>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground">
                Frontend changes go live after you click Update. Backend changes (functions,
                database) deploy automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your live public URL</CardTitle>
            <CardDescription>
              Paste it here once published — we'll keep it on this device for quick copy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="url"
                placeholder="https://your-site.lovable.app"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                aria-label="Live public URL"
              />
              <Button onClick={save} className="sm:w-auto">
                <Save className="w-4 h-4 mr-2" /> Save
              </Button>
            </div>

            {liveUrl && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Saved URL
                </p>
                <p className="font-mono text-sm break-all mb-3">{liveUrl}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={verify} disabled={checking}>
                    {checking ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    {checking ? "Checking…" : "Verify reachable"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={copy}>
                    <Copy className="w-4 h-4 mr-2" /> Copy
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" /> Open
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clear}>
                    <Trash2 className="w-4 h-4 mr-2" /> Clear
                  </Button>
                </div>

                {result && (
                  <div className="mt-3 text-sm flex items-start gap-2">
                    {result.kind === "ok" && (
                      <>
                        {result.status >= 200 && result.status < 400 ? (
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                        )}
                        <span>
                          HTTP <strong>{result.status}</strong> · {result.ms} ms
                          {result.swapped && (
                            <span className="text-muted-foreground"> · via {result.url}</span>
                          )}
                        </span>
                      </>
                    )}
                    {result.kind === "reachable" && (
                      <>
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <span>
                          Reachable in <strong>{result.ms} ms</strong>
                          {result.swapped && (
                            <span className="text-muted-foreground"> · via {result.url}</span>
                          )}
                          {" "}— status hidden by cross-origin policy (normal for published sites).
                        </span>
                      </>
                    )}
                    {result.kind === "error" && (
                      <>
                        <XCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                        <div className="flex-1">
                          <p className="text-muted-foreground mb-2">
                            Could not reach the URL: {result.message}
                          </p>
                          <Button size="sm" variant="outline" onClick={verify} disabled={checking}>
                            {checking ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            {checking ? "Retrying…" : "Retry"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {result && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={copyDebug}>
                      <Copy className="w-4 h-4 mr-2" /> Copy debug summary
                    </Button>
                    <Button size="sm" variant="outline" onClick={copyDebugJson}>
                      <Copy className="w-4 h-4 mr-2" /> Copy as JSON
                    </Button>
                    {result.attempts.length > 0 && (
                      <Button size="sm" variant="outline" onClick={copyAttemptsText}>
                        <Copy className="w-4 h-4 mr-2" /> Copy attempts as text
                      </Button>
                    )}
                    {result.attempts.length > 0 && (
                      <Button size="sm" variant="outline" onClick={copyAttemptsCsv}>
                        <Copy className="w-4 h-4 mr-2" /> Copy attempts as CSV
                      </Button>
                    )}
                    {result.attempts.length > 0 && (
                      <Button size="sm" variant="outline" onClick={downloadAttemptsCsv}>
                        <Download className="w-4 h-4 mr-2" /> Download CSV
                      </Button>
                    )}
                    {result.attempts.length > 0 && (
                      <div className="flex items-center gap-2 ml-auto">
                        <Switch
                          id="stack-toggle"
                          checked={includeStackTraces}
                          onCheckedChange={setIncludeStackTraces}
                        />
                        <Label htmlFor="stack-toggle" className="text-xs cursor-pointer">
                          Include stack traces
                        </Label>
                      </div>
                    )}
                  </div>
                )}

                {result && result.attempts.length > 0 && (
                  <details className="mt-3 rounded-md border border-border bg-background/60">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Attempts ({result.attempts.length})
                    </summary>
                    <ol className="divide-y divide-border">
                      {result.attempts.map((a, i) => (
                        <li key={i} className="px-3 py-2 text-xs space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={a.ok ? "secondary" : "destructive"}>
                              {a.ok ? "ok" : "failed"}
                            </Badge>
                            <Badge variant="outline">{a.mode}</Badge>
                            {a.status !== null && <Badge variant="outline">HTTP {a.status}</Badge>}
                            <span className="text-muted-foreground">{a.ms} ms</span>
                          </div>
                          <p className="font-mono break-all">{a.url}</p>
                          {a.error && (
                            <div className="mt-1 rounded bg-muted/60 p-2">
                              <p className="font-mono">
                                <span className="text-destructive font-semibold">{a.error.name}</span>
                                : {a.error.message}
                              </p>
                              {a.error.stack && (
                                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
                                  {a.error.stack}
                                </pre>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PublishHelper;
