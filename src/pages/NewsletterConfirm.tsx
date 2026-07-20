import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyPageMeta } from "@/lib/pageMeta";

type State =
  | { kind: "loading" }
  | { kind: "confirmed"; email?: string }
  | { kind: "already"; email?: string }
  | { kind: "expired" }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

const NewsletterConfirm = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    setPageMeta({
      title: "Confirm your subscription — PlowWow",
      description:
        "Confirming your PlowWow newsletter subscription so you can start receiving snow-season updates.",
      canonicalPath: "/newsletter/confirm",
      noindex: true,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setState({ kind: "invalid" });
        return;
      }
      const { data, error } = await supabase.functions.invoke(
        "newsletter-confirm",
        { body: { token } },
      );
      if (cancelled) return;
      if (error) {
        // Non-2xx from the edge function is surfaced through error.context.
        const anyErr = error as { context?: { text?: () => Promise<string> } };
        let raw = "";
        try {
          raw = (await anyErr.context?.text?.()) ?? "";
        } catch {
          /* ignore */
        }
        let code = "";
        try {
          code = JSON.parse(raw)?.error ?? "";
        } catch {
          /* ignore */
        }
        if (code === "token_expired") setState({ kind: "expired" });
        else if (code === "token_not_found" || code === "invalid_token")
          setState({ kind: "invalid" });
        else setState({ kind: "error", message: code || "Something went wrong." });
        return;
      }
      const status = (data as { status?: string; email?: string })?.status;
      const email = (data as { email?: string })?.email;
      if (status === "confirmed") setState({ kind: "confirmed", email });
      else if (status === "already_confirmed") setState({ kind: "already", email });
      else setState({ kind: "error", message: "Unexpected response." });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {state.kind === "loading" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" aria-hidden />
            <h1 className="text-xl font-semibold">Confirming your subscription…</h1>
          </>
        )}
        {state.kind === "confirmed" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-primary" aria-hidden />
            <h1 className="text-2xl font-semibold mb-2">You're subscribed 🎉</h1>
            <p className="text-sm opacity-80 mb-6">
              {state.email
                ? `${state.email} is now on the list.`
                : "You're now on the list."}{" "}
              Watch your inbox for snow-season updates from PlowWow.
            </p>
            <Link
              to="/blog"
              className="inline-block rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
            >
              Read the latest posts
            </Link>
          </>
        )}
        {state.kind === "already" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-primary" aria-hidden />
            <h1 className="text-2xl font-semibold mb-2">Already confirmed</h1>
            <p className="text-sm opacity-80 mb-6">
              {state.email ? `${state.email} is` : "You're"} already subscribed —
              nothing else to do.
            </p>
            <Link
              to="/"
              className="inline-block rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Back to home
            </Link>
          </>
        )}
        {state.kind === "expired" && (
          <>
            <XCircle className="w-10 h-10 mx-auto mb-4 text-destructive" aria-hidden />
            <h1 className="text-2xl font-semibold mb-2">This link has expired</h1>
            <p className="text-sm opacity-80 mb-6">
              Confirmation links are valid for 7 days. Enter your email again to
              get a fresh confirmation email.
            </p>
            <Link
              to="/"
              className="inline-block rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
            >
              Resubscribe from the home page
            </Link>
          </>
        )}
        {state.kind === "invalid" && (
          <>
            <XCircle className="w-10 h-10 mx-auto mb-4 text-destructive" aria-hidden />
            <h1 className="text-2xl font-semibold mb-2">Invalid confirmation link</h1>
            <p className="text-sm opacity-80 mb-6">
              This link doesn't match an active subscription. It may have already
              been used or was mistyped.
            </p>
            <Link
              to="/"
              className="inline-block rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Back to home
            </Link>
          </>
        )}
        {state.kind === "error" && (
          <>
            <XCircle className="w-10 h-10 mx-auto mb-4 text-destructive" aria-hidden />
            <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm opacity-80 mb-6">
              {state.message} Please try clicking the link again in a moment.
            </p>
          </>
        )}
      </div>
    </main>
  );
};

export default NewsletterConfirm;
