import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" })
    .max(254, { message: "Email is too long" }),
});

type Status = "idle" | "loading" | "success" | "error";

interface Props {
  source?: string;
}

const NewsletterSignup = ({ source = "footer" }: Props) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setStatus("error");
      setMessage(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setStatus("loading");
    setMessage("");
    const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
      body: { email: parsed.data.email.toLowerCase(), source },
    });
    if (error) {
      setStatus("error");
      setMessage("Sign-up failed. Please try again in a moment.");
      return;
    }
    if ((data as { status?: string })?.status === "already_confirmed") {
      setStatus("success");
      setMessage("You're already subscribed — thanks!");
      setEmail("");
      return;
    }
    setStatus("success");
    setMessage("Check your inbox — click the link to confirm your subscription.");
    setEmail("");
  };


  return (
    <form onSubmit={onSubmit} className="space-y-2" aria-label="Newsletter signup">
      <label htmlFor="newsletter-email" className="text-sm font-medium block">
        Get snow-season updates
      </label>
      <p className="text-xs opacity-70">
        Neighborhood guides, strata liability tips, and de-icing news. No spam.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" aria-hidden="true" />
          <input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-background/10 border border-footer-foreground/30 pl-8 pr-3 py-2 text-sm text-footer-foreground placeholder:text-footer-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={status === "error"}
            aria-describedby="newsletter-status"
            maxLength={254}
            disabled={status === "loading"}
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity inline-flex items-center gap-1.5"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : status === "success" ? (
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          ) : null}
          Subscribe
        </button>
      </div>
      <div
        id="newsletter-status"
        role="status"
        aria-live="polite"
        className={`text-xs min-h-[1rem] ${
          status === "error" ? "text-red-300" : "opacity-80"
        }`}
      >
        {message}
      </div>
    </form>
  );
};

export default NewsletterSignup;
