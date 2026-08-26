import { useRef, useState } from "react";
import { z } from "zod";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { Snowflake, Send } from "lucide-react";

const quoteSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number")
    .max(20)
    .regex(/^[0-9+\-()\s]+$/, "Invalid phone number"),
  address: z.string().trim().min(5, "Please enter your address").max(200),
  postalCode: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      "Enter a valid Canadian postal code (e.g. V6B 1A1)",
    ),
  serviceType: z.enum(
    ["residential-plowing", "commercial-plowing", "salting", "snow-relocation", "seasonal-contract"],
    { errorMap: () => ({ message: "Select a service type" }) },
  ),
  contactMethod: z.enum(["phone", "email", "text"]),
  notes: z.string().trim().max(1000).optional(),
});

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  serviceType: string;
  contactMethod: "phone" | "email" | "text";
  notes: string;
};

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  serviceType: "",
  contactMethod: "phone",
  notes: "",
};

type BlockCode =
  | "honeypot"
  | "too_fast"
  | "email_limit"
  | "ip_limit"
  | "burst_limit"
  | "invalid"
  | "insert_error"
  | "error";

const BLOCK_COPY: Record<BlockCode, { title: string; description: string }> = {
  honeypot: {
    title: "Submission blocked",
    description: "That request looked automated. Please try again from a real browser.",
  },
  too_fast: {
    title: "Slow down a moment",
    description:
      "Your request came in faster than a person could type it — please take a couple of seconds to review, then resubmit.",
  },
  email_limit: {
    title: "Daily limit reached",
    description:
      "This email has already submitted several quotes today. Email dispatch@plowwow.com to add more, or try again tomorrow.",
  },
  ip_limit: {
    title: "Too many requests",
    description:
      "Too many quote requests from your network in the last hour. Please try again in a little while.",
  },
  burst_limit: {
    title: "Please wait a minute",
    description: "You're submitting too quickly. Wait about a minute and try once more.",
  },
  invalid: {
    title: "Please review the form",
    description: "Some fields need attention — see the highlighted errors above.",
  },
  insert_error: {
    title: "Couldn't save your request",
    description: "Our system hit a temporary snag. Please try again in a moment.",
  },
  error: {
    title: "Something went wrong",
    description: "Please check your connection and try again.",
  },
};

const ContactForm = () => {
  const [data, setData] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [blockMessage, setBlockMessage] = useState<{ title: string; description: string } | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    setBlockMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockMessage(null);
    const result = quoteSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        const k = i.path[0] as string;
        if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
      });
      setErrors(fieldErrors);
      toast({
        title: "Please fix the errors",
        description: "Some fields need your attention.",
        variant: "destructive",
      });
      return;
    }

    if (!isSupabaseConfigured) {
      const copy = {
        title: "Quote requests are temporarily unavailable",
        description: "Please contact dispatch@plowwow.com and we’ll help you directly.",
      };
      setBlockMessage(copy);
      toast({ title: copy.title, description: copy.description, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: res, error } = await supabase.functions.invoke<
        { success?: boolean; error?: string; code?: BlockCode; details?: Record<string, string[]> }
      >("submit-quote", {
        body: { ...result.data, hp: honeypot, startedAt: startedAtRef.current },
      });

      const invokeErr = error as { context?: Response } | null;
      let payload = res ?? null;
      if (invokeErr?.context && typeof invokeErr.context.text === "function") {
        try {
          const text = await invokeErr.context.text();
          payload = text ? JSON.parse(text) : payload;
        } catch { /* ignore */ }
      }

      const code = payload?.code as string | undefined;
      if (code && code !== "ok" && code !== "honeypot") {
        const copy = (BLOCK_COPY as Record<string, { title: string; description: string }>)[code] ?? BLOCK_COPY.error;
        setBlockMessage(copy);
        toast({ title: copy.title, description: copy.description, variant: "destructive" });
        if (code === "invalid" && payload?.details) {
          const fieldErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(payload.details)) {
            if (Array.isArray(v) && v[0]) fieldErrors[k] = v[0];
          }
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        return;
      }
      if (payload?.error && !payload.success) {
        const copy = BLOCK_COPY.error;
        setBlockMessage({ title: copy.title, description: payload.error });
        toast({ title: copy.title, description: payload.error, variant: "destructive" });
        return;
      }

      toast({
        title: "Quote request sent!",
        description: "We'll get back to you within 24 hours.",
      });
      setData(initial);
      setHoneypot("");
      startedAtRef.current = Date.now();
    } catch {
      const copy = BLOCK_COPY.error;
      setBlockMessage(copy);
      toast({ title: copy.title, description: copy.description, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-section-alt">
      <div className="container max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-heading font-bold mb-4">
            <Snowflake className="w-4 h-4" />
            Free Quote
          </div>
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground mb-3">
            Request a Snow Removal Quote
          </h2>
          <p className="text-muted-foreground text-lg">
            Tell us about your property and we'll get back to you with a custom quote.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl shadow-lg p-6 md:p-10 space-y-6 border border-border"
          noValidate
        >
          <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="company_website">Company website</label>
            <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>
          {blockMessage && (
            <div role="alert" aria-live="polite" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="font-heading font-bold text-destructive text-sm">{blockMessage.title}</p>
              <p className="text-sm text-destructive/90 mt-1">{blockMessage.description}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Doe" maxLength={100} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" maxLength={255} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" type="tel" value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="604-555-1234" maxLength={20} aria-invalid={!!errors.phone} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal code *</Label>
              <Input id="postalCode" value={data.postalCode} onChange={(e) => update("postalCode", e.target.value.toUpperCase())} placeholder="V6B 1A1" maxLength={7} aria-invalid={!!errors.postalCode} />
              {errors.postalCode && <p className="text-sm text-destructive">{errors.postalCode}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Service address *</Label>
            <Input id="address" value={data.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, Vancouver, BC" maxLength={200} aria-invalid={!!errors.address} />
            {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service type *</Label>
            <Select value={data.serviceType} onValueChange={(v) => update("serviceType", v)}>
              <SelectTrigger id="serviceType" aria-invalid={!!errors.serviceType}><SelectValue placeholder="Choose a service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="residential-plowing">Residential Snow Plowing</SelectItem>
                <SelectItem value="commercial-plowing">Commercial Snow Plowing</SelectItem>
                <SelectItem value="salting">Salting / De-icing</SelectItem>
                <SelectItem value="snow-relocation">Snow Relocation</SelectItem>
                <SelectItem value="seasonal-contract">Seasonal Contract</SelectItem>
              </SelectContent>
            </Select>
            {errors.serviceType && <p className="text-sm text-destructive">{errors.serviceType}</p>}
          </div>
          <div className="space-y-3">
            <Label>Preferred contact method *</Label>
            <RadioGroup value={data.contactMethod} onValueChange={(v) => update("contactMethod", v as FormState["contactMethod"])} className="grid grid-cols-3 gap-3">
              {[{ v: "phone", l: "Phone call" }, { v: "email", l: "Email" }, { v: "text", l: "Text / SMS" }].map((o) => (
                <label key={o.v} htmlFor={"cm-" + o.v} className="flex items-center gap-2 border border-border rounded-lg px-4 py-3 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value={o.v} id={"cm-" + o.v} />
                  <span className="text-sm font-medium">{o.l}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional details (optional)</Label>
            <Textarea id="notes" value={data.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Driveway size, special access notes, etc." maxLength={1000} rows={4} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 font-heading font-bold rounded-full h-12 text-base">
            {submitting ? "Sending..." : <><Send className="w-4 h-4" />Request Free Quote</>}
          </Button>
          <p className="text-xs text-muted-foreground text-center">We typically respond within 24 hours. No obligation.</p>
        </form>
      </div>
    </section>
  );
};

export default ContactForm;