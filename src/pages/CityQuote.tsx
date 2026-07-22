import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Phone, MapPin, ArrowLeft, Loader2, Calculator } from "lucide-react";

import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotFound from "./NotFound";
import AddressPreview from "@/components/city/AddressPreview";
import { getCityBySlug } from "@/data/cities";
import { getLocationDeep } from "@/data/locations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AddressGeocodeHit } from "@/lib/addressGeocode";
import {
  estimatePrice,
  formatEstimate,
  type PropertySize,
  type Frequency,
  type PropertyType,
  type ServiceLevel,
} from "@/lib/pricingEstimator";

const BURNABY_META = {
  slug: "burnaby",
  name: "Burnaby",
  province: "BC",
  tagline: "Burnaby Snow Removal & De-icing",
};

const quoteSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Phone is required").max(30),
  address: z.string().trim().min(3, "Property address is required").max(200),
  propertyType: z.enum(["strata", "commercial", "residential", "industrial", "medical"]),
  serviceLevel: z.enum(["seasonal", "per-visit", "de-icing-only"]),
  propertySize: z.enum(["small", "medium", "large", "xlarge"]),
  frequency: z.enum(["as-needed", "every-2cm", "every-storm", "24-7"]),
  drivewayMeters: z.coerce.number().min(0).max(10000),
  notes: z.string().trim().max(2000).optional(),
  // honeypot — must remain empty
  website: z.string().max(0).optional(),
});

type QuoteInput = z.infer<typeof quoteSchema>;

const CityQuote = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const navigate = useNavigate();
  const slug = citySlug?.replace(/\/+$/, "") ?? "";
  const city = slug === "burnaby" ? null : getCityBySlug(slug);
  const deep = getLocationDeep(slug);

  const cityMeta = useMemo(() => {
    if (slug === "burnaby") return BURNABY_META;
    if (city)
      return {
        slug: city.slug,
        name: city.name,
        province: city.province,
        tagline: city.tagline,
      };
    return null;
  }, [slug, city]);

  const [formStartedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [addressConfirmed, setAddressConfirmed] =
    useState<AddressGeocodeHit | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteInput, string>>>({});
  const [form, setForm] = useState<QuoteInput>({
    name: "",
    email: "",
    phone: "",
    address: "",
    propertyType: "strata",
    serviceLevel: "seasonal",
    propertySize: "medium",
    frequency: "every-2cm",
    drivewayMeters: 0,
    notes: "",
    website: "",
  });

  const avgSnowfall = deep?.avg_annual_snowfall_cm;
  const estimate = useMemo(
    () =>
      estimatePrice({
        propertyType: form.propertyType,
        serviceLevel: form.serviceLevel,
        propertySize: form.propertySize,
        drivewayMeters: Number(form.drivewayMeters) || 0,
        frequency: form.frequency,
        avgSnowfallCm: avgSnowfall,
      }),
    [
      form.propertyType,
      form.serviceLevel,
      form.propertySize,
      form.frequency,
      form.drivewayMeters,
      avgSnowfall,
    ],
  );

  useEffect(() => {
    if (!cityMeta) return;
    const title = `${cityMeta.name} Snow Removal Quote | PlowWow`;
    const desc = `Request a snow removal quote for your ${cityMeta.name} property — strata, commercial, or residential. 24/7 dispatch across ${cityMeta.name}, ${cityMeta.province}.`;
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", desc);
    setMeta("robots", "noindex,follow");
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `https://plowwow.com/${cityMeta.slug}/quote`);
  }, [cityMeta]);

  if (!cityMeta) return <NotFound />;

  const update = <K extends keyof QuoteInput>(k: K, v: QuoteInput[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    if (k === "address") setAddressConfirmed(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = quoteSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof QuoteInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof QuoteInput;
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    setSubmitting(true);
    try {
      const geocodePayload = addressConfirmed
        ? {
            lat: addressConfirmed.lat,
            lon: addressConfirmed.lon,
            formatted: addressConfirmed.formatted,
          }
        : undefined;
      const { data, error } = await supabase.functions.invoke("submit-quote", {
        body: {
          ...parsed.data,
          city: cityMeta.name,
          citySlug: cityMeta.slug,
          province: cityMeta.province,
          source: `city-quote/${cityMeta.slug}`,
          formLoadedAt: formStartedAt,
          estimator: {
            low: estimate.low,
            high: estimate.high,
            unit: estimate.unit,
            propertySize: parsed.data.propertySize,
            frequency: parsed.data.frequency,
            drivewayMeters: parsed.data.drivewayMeters,
          },
          geocode: geocodePayload,
        },
      });
      if (error) throw error;
      const denied = (data as { blocked?: boolean } | null)?.blocked;
      if (denied) {
        toast({
          title: "Submission blocked",
          description: "Please contact us by phone at 604-761-1518.",
          variant: "destructive",
        });
        return;
      }
      // Fire-and-forget confirmation email — never block the redirect if
      // Resend is temporarily unavailable.
      supabase.functions
        .invoke("send-quote-confirmation", {
          body: {
            name: parsed.data.name,
            email: parsed.data.email,
            phone: parsed.data.phone,
            address: parsed.data.address,
            city: cityMeta.name,
            province: cityMeta.province,
            propertyType: parsed.data.propertyType,
            serviceLevel: parsed.data.serviceLevel,
            notes: parsed.data.notes,
            estimator: {
              low: estimate.low,
              high: estimate.high,
              unit: estimate.unit,
              propertySize: parsed.data.propertySize,
              frequency: parsed.data.frequency,
              drivewayMeters: parsed.data.drivewayMeters,
            },
          },
        })
        .catch((e) => console.warn("confirmation email failed", e));

      // Persist a summary of the submission so /quote/confirmed can render
      // a downloadable PDF without re-fetching anything from the server.
      try {
        const summary = {
          quoteId: (data as { id?: string } | null)?.id ?? null,
          submittedAt: new Date().toISOString(),
          city: cityMeta.name,
          citySlug: cityMeta.slug,
          province: cityMeta.province,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          address: parsed.data.address,
          propertyType: parsed.data.propertyType,
          serviceLevel: parsed.data.serviceLevel,
          propertySize: parsed.data.propertySize,
          frequency: parsed.data.frequency,
          drivewayMeters: parsed.data.drivewayMeters,
          notes: parsed.data.notes ?? "",
          estimate: {
            low: estimate.low,
            high: estimate.high,
            unit: estimate.unit,
            visitsHint: estimate.visitsHint,
          },
          geocode: addressConfirmed
            ? {
                lat: addressConfirmed.lat,
                lon: addressConfirmed.lon,
                formatted: addressConfirmed.formatted,
              }
            : null,
          avgSnowfallCm: avgSnowfall ?? null,
        };
        sessionStorage.setItem(
          "plowwow.lastQuote",
          JSON.stringify(summary),
        );
      } catch {
        /* sessionStorage unavailable — PDF will render generic copy */
      }

      navigate(`/quote/confirmed?city=${encodeURIComponent(cityMeta.slug)}`);
    } catch (err) {
      toast({
        title: "Something went wrong",
        description:
          "We couldn't submit your request. Call 604-761-1518 or try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const priceHint = deep?.pricing;

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <section className="bg-[#0d2a4a] text-white">
          <div className="container py-12">
            <Link
              to={`/${cityMeta.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back to {cityMeta.name}
            </Link>
            <h1 className="text-3xl md:text-5xl font-black mb-3">
              {cityMeta.name} Snow Removal Quote
            </h1>
            <p className="text-white/90 max-w-2xl">
              Tell us about your {cityMeta.name} property. We'll match you to the
              nearest seasonal-contract crew and reply within one business day.
              Storm-day inquiries — call{" "}
              <a href="tel:6047611518" className="underline font-semibold">
                604-761-1518
              </a>
              .
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container grid lg:grid-cols-3 gap-8">
            <form
              onSubmit={onSubmit}
              className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm space-y-5"
              noValidate
            >
              <div className="bg-muted/40 border border-border rounded-lg p-4 flex items-center gap-3 text-sm">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Service area: {cityMeta.name}, {cityMeta.province}
                  </p>
                  <p className="text-muted-foreground">
                    Auto-filled from this page. Change the property address below
                    if the site is in a different municipality.
                  </p>
                </div>
              </div>

              {/* honeypot */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Leave this field empty</label>
                <input
                  id="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website ?? ""}
                  onChange={(e) => update("website", e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field
                  id="name"
                  label="Your name"
                  value={form.name}
                  onChange={(v) => update("name", v)}
                  error={errors.name}
                  autoComplete="name"
                  required
                />
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                  error={errors.email}
                  autoComplete="email"
                  required
                />
                <Field
                  id="phone"
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => update("phone", v)}
                  error={errors.phone}
                  autoComplete="tel"
                  required
                />
                <Field
                  id="address"
                  label={`Property address in ${cityMeta.name}`}
                  value={form.address}
                  onChange={(v) => update("address", v)}
                  error={errors.address}
                  autoComplete="street-address"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  id="propertyType"
                  label="Property type"
                  value={form.propertyType}
                  onChange={(v) => update("propertyType", v as QuoteInput["propertyType"])}
                  options={[
                    ["strata", "Strata / townhome complex"],
                    ["commercial", "Commercial / retail"],
                    ["residential", "Residential / driveway"],
                    ["industrial", "Industrial / logistics"],
                    ["medical", "Medical / hospital-adjacent"],
                  ]}
                />
                <Select
                  id="serviceLevel"
                  label="Service level"
                  value={form.serviceLevel}
                  onChange={(v) => update("serviceLevel", v as QuoteInput["serviceLevel"])}
                  options={[
                    ["seasonal", "Seasonal contract (Nov–Mar)"],
                    ["per-visit", "Per-visit / on-demand"],
                    ["de-icing-only", "De-icing / salting only"],
                  ]}
                />
              </div>

              <fieldset className="border border-border rounded-xl p-4 space-y-4">
                <legend className="text-sm font-heading font-bold px-2 inline-flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-primary" />
                  Quick estimator
                </legend>
                <div className="grid md:grid-cols-2 gap-4">
                  <Select
                    id="propertySize"
                    label="Property size"
                    value={form.propertySize}
                    onChange={(v) => update("propertySize", v as PropertySize)}
                    options={[
                      ["small", "Small — driveway / single unit"],
                      ["medium", "Medium — small strata / storefront"],
                      ["large", "Large — mid-size lot"],
                      ["xlarge", "X-Large — big-box / industrial"],
                    ]}
                  />
                  {form.serviceLevel === "seasonal" && (
                    <Select
                      id="frequency"
                      label="Service frequency"
                      value={form.frequency}
                      onChange={(v) => update("frequency", v as Frequency)}
                      options={[
                        ["as-needed", "As-needed (light trigger)"],
                        ["every-2cm", "Every 2 cm (standard)"],
                        ["every-storm", "Every storm (strict)"],
                        ["24-7", "24/7 zero-tolerance"],
                      ]}
                    />
                  )}
                  <Field
                    id="drivewayMeters"
                    label="Driveway / lane length (m, optional)"
                    type="number"
                    value={String(form.drivewayMeters)}
                    onChange={(v) => update("drivewayMeters", Number(v) as QuoteInput["drivewayMeters"])}
                  />
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                  <p className="font-heading font-bold text-foreground text-lg">
                    {formatEstimate(estimate)}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {estimate.visitsHint}. Live estimate for {cityMeta.name}
                    {avgSnowfall ? ` (${avgSnowfall} cm avg snowfall)` : ""} —
                    final quote confirmed by a local route lead.
                  </p>
                </div>
              </fieldset>


              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-semibold text-foreground mb-1"
                >
                  Site notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Access hours, drive-aisle geometry, parkade ramps, accessibility ramps, dock schedule…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-heading font-bold px-6 py-3 hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>Request my {cityMeta.name} quote</>
                )}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                We reply within one business day. Storm-day inquiries — call
                604-761-1518.
              </p>
            </form>

            <aside className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-heading font-bold text-lg mb-2">
                  {cityMeta.name} at a glance
                </h2>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {deep && (
                    <>
                      <li>
                        <strong className="text-foreground">Avg snowfall:</strong>{" "}
                        {deep.avg_annual_snowfall_cm} cm/yr
                      </li>
                      <li>
                        <strong className="text-foreground">Season:</strong>{" "}
                        {deep.snow_season_start} – {deep.snow_season_end}
                      </li>
                      <li>
                        <strong className="text-foreground">Freeze-thaw:</strong>{" "}
                        {deep.freeze_thaw_cycles} cycles / winter
                      </li>
                    </>
                  )}
                </ul>
              </div>
              {priceHint && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-heading font-bold text-lg mb-2">
                    Typical {cityMeta.name} pricing
                  </h2>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Residential seasonal: {priceHint.residential_seasonal}</li>
                    <li>Strata seasonal: {priceHint.strata_seasonal}</li>
                    <li>Commercial seasonal: {priceHint.commercial_seasonal}</li>
                    <li>Per-visit: {priceHint.per_visit}</li>
                    <li>De-icing pass: {priceHint.de_ice_treatment}</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ranges only — final pricing depends on lot geometry, access,
                    and service level.
                  </p>
                </div>
              )}
              <a
                href="tel:6047611518"
                className="flex items-center gap-3 rounded-2xl bg-secondary text-secondary-foreground font-heading font-bold p-5 hover:opacity-90"
              >
                <Phone className="w-5 h-5" />
                <span>
                  Call 604-761-1518
                  <span className="block text-xs font-normal opacity-90">
                    Storm-day priority dispatch
                  </span>
                </span>
              </a>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
};
const Field = ({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  required,
}: FieldProps) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-semibold text-foreground mb-1"
    >
      {label}
      {required && <span className="text-destructive"> *</span>}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      maxLength={255}
      aria-invalid={error ? "true" : "false"}
      aria-describedby={error ? `${id}-err` : undefined}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />
    {error && (
      <p id={`${id}-err`} role="alert" className="text-xs text-destructive mt-1">
        {error}
      </p>
    )}
  </div>
);

type SelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
};
const Select = ({ id, label, value, onChange, options }: SelectProps) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-semibold text-foreground mb-1"
    >
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  </div>
);

export default CityQuote;
