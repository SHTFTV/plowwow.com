import { useEffect, useState } from "react";
import { blogPosts } from "@/generated/blog-posts";

// Homepage diagnostics — visible only when the page is loaded with
// `?diag=1` (or `?diag=blog`). Shows the current blog-index generation
// timestamp and the exact slugs the carousel is rendering, so we can
// confirm the freshest posts are active on the deployed site without
// digging through DevTools.

type LiveIndex = { generatedAt?: string; count?: number; carousel?: string[] };

export default function HomeBlogDiagnostics({ renderedSlugs }: { renderedSlugs: string[] }) {
  const [enabled, setEnabled] = useState(false);
  const [live, setLive] = useState<LiveIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const on = params.has("diag");
    setEnabled(on);
    if (!on) return;
    fetch(`/blog-index.json?_cb=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setLive)
      .catch((e) => setError(String(e?.message || e)));
  }, []);

  if (!enabled) return null;

  const mismatch =
    live?.carousel && renderedSlugs.length
      ? renderedSlugs.filter((s, i) => live.carousel![i] !== s)
      : [];

  return (
    <section
      aria-label="Homepage blog diagnostics"
      className="container my-8 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5 text-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">Blog carousel diagnostics</h2>
        <span className="text-xs text-muted-foreground">visible because <code>?diag</code> is in the URL</span>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-y-2 sm:grid-cols-[220px_1fr] sm:gap-x-4">
        <dt className="text-muted-foreground">blog-index.json generatedAt</dt>
        <dd className="font-mono text-xs">{live?.generatedAt ?? (error ? `error: ${error}` : "…")}</dd>
        <dt className="text-muted-foreground">total posts (live)</dt>
        <dd className="font-mono text-xs">{live?.count ?? "…"}</dd>
        <dt className="text-muted-foreground">rendered carousel slugs</dt>
        <dd className="font-mono text-xs">
          <ol className="list-decimal pl-5">
            {renderedSlugs.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </dd>
        <dt className="text-muted-foreground">live blog-index carousel</dt>
        <dd className="font-mono text-xs">
          {live?.carousel ? (
            <ol className="list-decimal pl-5">{live.carousel.map((s) => <li key={s}>{s}</li>)}</ol>
          ) : "…"}
        </dd>
        <dt className="text-muted-foreground">status</dt>
        <dd className={"font-mono text-xs " + (mismatch.length ? "text-destructive" : "text-primary")}>
          {live?.carousel
            ? mismatch.length
              ? `stale — carousel drifts on: ${mismatch.join(", ")}`
              : "in sync"
            : "fetching…"}
        </dd>
      </dl>
    </section>
  );
}
