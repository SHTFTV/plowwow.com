import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { applyPageMeta } from "@/lib/pageMeta";

// Client-side cooldown between resend attempts. The edge function also enforces
// a 30s cooldown per email so a single-page abuser can't just refresh.
const RESEND_COOLDOWN_MS = 60_000;

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Enter a valid email address" })
  .max(254, { message: "Email is too long" });

type ResendStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "sent" }
  | { kind: "cooldown"; secondsLeft: number }
  | { kind: "error"; message: string };

// A small inline "resend confirmation" form shared by the expired/invalid
// states. It handles its own rate-limit UX so the parent stays declarative.
const ResendConfirmationForm = ({
  headline,
  defaultEmail = "",
}: {
  headline: string;
  defaultEmail?: string;
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<ResendStatus>({ kind: "idle" });

  const startCooldown = () => {
    let seconds = Math.floor(RESEND_COOLDOWN_MS / 1000);
    setStatus({ kind: "cooldown", secondsLeft: seconds });
    const id = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(id);
        setStatus({ kind: "idle" });
      } else {
        setStatus({ kind: "cooldown", secondsLeft: seconds });
      }
    }, 1000);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.kind === "loading" || status.kind === "cooldown") return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Invalid email",
      });
      return;
    }
    setStatus({ kind: "loading" });
    const { data, error } = await supabase.functions.invoke(
      "newsletter-subscribe",
      { body: { email: parsed.data.toLowerCase(), source: "confirm-resend" } },
    );
    if (error) {
      // Read the real failure text out of the FunctionsHttpError context.
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
      if (code === "too_soon") {
        // Server said slow down — mirror it as a cooldown.
        startCooldown();
        return;
      }
      setStatus({
        kind: "error",
        message:
          code === "invalid_email"
            ? "That email doesn't look valid."
            : "Couldn't resend the confirmation. Please try again in a moment.",
      });
      return;
    }
    // Success (both `confirmation_sent` and `already_confirmed`) → cool down
    // the button so the user can't hammer it.
    if ((data as { status?: string })?.status === "already_confirmed") {
      setStatus({ kind: "sent" });
      return;
    }
    setStatus({ kind: "sent" });
    startCooldown();
  };

  const disabled = status.kind === "loading" || status.kind === "cooldown";
  const buttonLabel =
    status.kind === "cooldown"
      ? `Resend in ${status.secondsLeft}s`
      : status.kind === "loading"
      ? "Sending…"
      : status.kind === "sent"
      ? "Sent — check your inbox"
      : "Resend confirmation email";

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2 text-left" aria-label={headline}>
      <label htmlFor="resend-email" className="text-xs font-medium block">
        {headline}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail
            className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60"
            aria-hidden
          />
          <input
            id="resend-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status.kind === "loading"}
            className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm"
            aria-invalid={status.kind === "error"}
            aria-describedby="resend-status"
          />
        </div>
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-60 whitespace-nowrap"
        >
          {status.kind === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin inline mr-1" aria-hidden />
          ) : null}
          {buttonLabel}
        </button>
      </div>
      <div
        id="resend-status"
        role="status"
        aria-live="polite"
        className={`text-xs min-h-[1rem] ${
          status.kind === "error"
            ? "text-destructive"
            : status.kind === "sent"
            ? "text-primary"
            : "opacity-70"
        }`}
      >
        {status.kind === "error" && status.message}
        {status.kind === "sent" &&
          "Confirmation email sent. Check your inbox (including spam)."}
        {status.kind === "cooldown" &&
          `Please wait ${status.secondsLeft}s before requesting another email.`}
      </div>
    </form>
  );
};


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
    applyPageMeta({
      title: "Confirm your subscription — PlowWow",
      description:
        "Confirming your PlowWow newsletter subscription so you can start receiving snow-season updates.",
      path: "/newsletter/confirm",
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
            <p className="text-sm opacity-80 mb-4">
              Confirmation links are valid for 7 days. Enter your email below
              and we'll send you a fresh confirmation link.
            </p>
            <ResendConfirmationForm headline="Email to resend confirmation to" />
            <div className="mt-4 text-xs opacity-70">
              Already subscribed on a different device?{" "}
              <Link to="/" className="underline">
                Back to home
              </Link>
            </div>
          </>
        )}
        {state.kind === "invalid" && (
          <>
            <XCircle className="w-10 h-10 mx-auto mb-4 text-destructive" aria-hidden />
            <h1 className="text-2xl font-semibold mb-2">Invalid confirmation link</h1>
            <p className="text-sm opacity-80 mb-2">
              This link doesn't match an active subscription. Common reasons:
            </p>
            <ul className="text-sm opacity-80 mb-4 text-left list-disc pl-6 space-y-1">
              <li>It was already used to confirm your subscription.</li>
              <li>The link was truncated or mistyped when copied.</li>
              <li>A newer confirmation email replaced this one.</li>
            </ul>
            <p className="text-sm opacity-80 mb-4">
              Enter your email to receive a new confirmation link:
            </p>
            <ResendConfirmationForm headline="Email to resend confirmation to" />
            <div className="mt-4 text-xs opacity-70">
              <Link to="/" className="underline">
                Back to home
              </Link>
            </div>
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
