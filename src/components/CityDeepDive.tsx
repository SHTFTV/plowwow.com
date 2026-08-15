import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Cloud,
  Snowflake,
  MapPin,
  Bus,
  Building2,
  Scale,
  DollarSign,
  ListChecks,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Star,
  Phone,
  Mail,
} from "lucide-react";
import type { LocationDeepData } from "@/data/locations";

type WeatherState = {
  temp: number | null;
  snowfall: number | null;
  code: number | null;
  loading: boolean;
  error: string | null;
};

const conditionFromCode = (code: number | null): string => {
  if (code === null) return "Loading…";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Active snowfall";
  if ([66, 67].includes(code)) return "Freezing rain — ice risk";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain — refreeze possible";
  if ([45, 48].includes(code)) return "Fog — icy surface risk";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if (code === 0) return "Clear";
  return "Monitor conditions";
};

const CityDeepDive = ({ data }: { data: LocationDeepData }) => {
  const [weather, setWeather] = useState<WeatherState>({
    temp: null,
    snowfall: null,
    code: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(data.weather_api.open_meteo_url);
        if (!r.ok) throw new Error(`Weather ${r.status}`);
        const d = await r.json();
        if (cancelled) return;
        setWeather({
          temp: d?.current?.temperature_2m ?? null,
          snowfall: d?.current?.snowfall ?? null,
          code: d?.current?.weather_code ?? null,
          loading: false,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setWeather((w) => ({ ...w, loading: false, error: (e as Error).message }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.weather_api.open_meteo_url]);

  const serviceSchemas = ["Residential Snow Removal", "Strata Snow Removal", "Commercial Snow Removal", "De-Icing & Salting"].map((name) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: name,
    provider: { "@type": "LocalBusiness", name: "PlowWow" },
    areaServed: `${data.city}, BC`,
    description: `${name} across ${data.city} — 24/7 dispatch, seasonal contracts, WorkSafeBC insured.`,
  }));

  return (
    <>
      {serviceSchemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}

      {/* Live weather */}
      <section className="py-12 bg-gradient-to-br from-primary/5 to-secondary/5" id="weather">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <Cloud className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black text-foreground">
              Current conditions in {data.city} — updated live
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div>
              <p className="text-xs uppercase font-bold text-muted-foreground">Temperature</p>
              <p className="text-3xl font-black text-foreground mt-1">
                {weather.loading ? "…" : weather.temp !== null ? `${Math.round(weather.temp)}°C` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-muted-foreground">Conditions</p>
              <p className="text-lg font-bold text-foreground mt-2">
                {weather.loading ? "Loading…" : conditionFromCode(weather.code)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-muted-foreground">Today's snowfall</p>
              <p className="text-3xl font-black text-foreground mt-1">
                {weather.loading ? "…" : weather.snowfall !== null ? `${weather.snowfall.toFixed(1)} cm` : "—"}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Data via Open-Meteo. Full {data.city} forecast on{" "}
            <a
              href={data.weather_api.environment_canada_url}
              target="_blank"
              rel="noopener"
              className="text-primary font-semibold hover:underline"
            >
              Environment Canada
            </a>
            . PlowWow seasonal-contract clients receive same-day advisories by email or SMS whenever a snowfall or Arctic outflow warning is issued for {data.city}.
          </p>
        </div>
      </section>

      {/* Google Maps embed */}
      <section className="py-12" id="service-map">
        <div className="container max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-black text-foreground">
              {data.city} service area — pinned landmarks
            </h2>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
            <iframe
              title={`${data.city} service area map`}
              src={`https://www.google.com/maps?q=${data.google_business_pin.embed_query}&z=11&output=embed`}
              width="100%"
              height="420"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            <a
              href={data.google_business_pin.maps_url}
              target="_blank"
              rel="noopener"
              className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              View PlowWow {data.city} on Google Maps <ExternalLink className="w-3.5 h-3.5" />
            </a>
            . Approximate service radius: 30 km from {data.city} centre. Priority landmarks below are the property clusters we dispatch to first during any Fraser Valley snow event.
          </p>
        </div>
      </section>

      {/* Intro long */}
      <section className="py-14" id="why-different">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-black text-foreground mb-6">
            Why snow removal in {data.city} is not like anywhere else
          </h2>
          {data.intro_long.split("\n\n").map((para, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-4">
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* Conditions long */}
      <section className="py-14 bg-muted/30" id="conditions">
        <div className="container max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <Snowflake className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-black text-foreground">
              {data.city} snow &amp; weather conditions
            </h2>
          </div>
          <p className="text-sm font-semibold text-primary mb-4">
            Avg annual snowfall: {data.avg_annual_snowfall_cm} cm · Season: {data.snow_season_start}–{data.snow_season_end} · Freeze-thaw cycles: {data.freeze_thaw_cycles}/winter
          </p>
          {data.conditions_long.split("\n\n").map((para, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-4">
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* Transit routes */}
      <section className="py-14" id="transit">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <Bus className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-black text-foreground">
              Bus routes &amp; transit priority clearing in {data.city}
            </h2>
          </div>
          <p className="text-muted-foreground mb-6">
            TransLink expects property owners to clear frontages adjacent to bus stops before the first morning trip. Strata and commercial properties along the following {data.city} corridors are prioritised in our dispatch schedule.
          </p>
          <ul className="grid md:grid-cols-2 gap-3 mb-6">
            {data.transit_routes.map((t) => (
              <li key={t.route} className="rounded-xl border border-border bg-card p-4">
                <p className="font-bold text-foreground">{t.route}</p>
                <p className="text-sm text-muted-foreground">{t.corridor}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.operator}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Real-time transit information: <a href="https://www.translink.ca" target="_blank" rel="noopener" className="text-primary font-semibold hover:underline">TransLink</a>. During active storms our operations desk coordinates directly with TransLink priority-route status so bus-stop frontages are cleared ahead of the first morning trip on every seasonal-contract site.
          </p>
        </div>
      </section>

      {/* Landmarks */}
      <section className="py-14 bg-muted/30" id="landmarks">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-black text-foreground">
              Landmarks &amp; property types we serve in {data.city}
            </h2>
          </div>
          <ul className="space-y-4">
            {data.landmarks.map((l) => (
              <li key={l.name} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-foreground">{l.name}</h3>
                  <span className="text-xs uppercase font-bold text-primary shrink-0">{l.type}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {landmarkBlurb(l.name, l.type, data.city)}
                </p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(l.name + " " + data.city + " BC")}`}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 mt-2"
                >
                  Pin on Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Bylaw */}
      <section className="py-14" id="bylaw">
        <div className="container max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-black text-foreground">
              {data.city} snow clearing bylaw &amp; strata compliance
            </h2>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 mb-4">
            <p className="text-sm uppercase font-bold text-primary mb-2">The rule</p>
            <p className="text-foreground font-semibold mb-4">{data.bylaw.rule}</p>
            <p className="text-sm uppercase font-bold text-primary mb-2">Authority</p>
            <p className="text-foreground mb-4">{data.bylaw.authority}</p>
            <p className="text-sm uppercase font-bold text-primary mb-2">Non-compliance</p>
            <p className="text-foreground">{data.bylaw.fine}</p>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Under Section 72 of the BC Strata Property Act, the strata corporation is responsible for repairing and maintaining common property — including walkways, drive aisles, and parking areas. That statutory duty does not transfer to individual owners and cannot be waived by a bylaw. In practical terms, if someone slips on an un-cleared walkway on your strata's common property, the corporation is the defendant.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            The Occupiers Liability Act of BC extends similar duties to commercial and residential property occupiers. Courts apply a "reasonable in the circumstances" standard, which in {data.city}'s freeze-thaw climate means documented, scheduled, professional snow and ice management — not ad-hoc shovelling by whoever is available.
          </p>
          <a
            href={data.bylaw.link}
            target="_blank"
            rel="noopener"
            className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
          >
            Read the {data.city} bylaw <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* Neighbourhoods */}
      <section className="py-14 bg-muted/30" id="neighbourhoods">
        <div className="container max-w-4xl">
          <h2 className="text-3xl font-black text-foreground mb-6">
            Neighbourhoods we serve in {data.city}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {data.neighbourhoods.map((n) => (
              <div key={n.name} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-bold text-foreground mb-2">{n.name} snow removal</h3>
                <p className="text-sm text-muted-foreground">{n.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-14" id="pricing">
        <div className="container max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-black text-foreground">
              Snow removal pricing in {data.city}
            </h2>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
            {[
              ["Residential seasonal", data.pricing.residential_seasonal],
              ["Strata seasonal", data.pricing.strata_seasonal],
              ["Commercial seasonal", data.pricing.commercial_seasonal],
              ["Per-visit", data.pricing.per_visit],
              ["De-ice treatment", data.pricing.de_ice_treatment],
            ].map(([label, val], i) => (
              <div
                key={label}
                className={`flex justify-between items-center p-4 ${
                  i % 2 === 0 ? "bg-muted/30" : ""
                }`}
              >
                <span className="font-semibold text-foreground">{label}</span>
                <span className="font-bold text-primary">{val}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Pricing in {data.city} is driven by property size, slope, access, event-count exposure, and de-icing scope. Fixed seasonal contracts nearly always beat per-visit for any property that cannot tolerate a 6:00 AM insurance exposure — the seasonal price is capped regardless of how many events the winter delivers, while per-visit pricing scales linearly with a difficult season. Get an accurate quote for your {data.city} property in under 60 seconds using our online form.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-14 bg-muted/30" id="compare">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <ListChecks className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-black text-foreground">
              PlowWow vs other options in {data.city}
            </h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="p-3 text-left">Factor</th>
                  <th className="p-3 text-center">PlowWow</th>
                  {data.comparison_table.competitors.map((c) => (
                    <th key={c} className="p-3 text-center">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.comparison_table.factors.map((f, i) => (
                  <tr key={f} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                    <td className="p-3 font-semibold text-foreground">{f}</td>
                    <td className="p-3 text-center">
                      <CheckCircle2 className="w-5 h-5 text-primary inline" />
                    </td>
                    {data.comparison_table.competitors.map((c) => (
                      <td key={c} className="p-3 text-center">
                        <XCircle className="w-5 h-5 text-muted-foreground/50 inline" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {data.testimonials.length > 0 && (
      <section className="py-14" id="testimonials">
        <div className="container max-w-4xl">
          <h2 className="text-3xl font-black text-foreground mb-6">
            What {data.city} clients say about PlowWow
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {data.testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border border-border bg-card p-5">
                <div className="flex mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-3">"{t.quote}"</p>
                <p className="text-sm font-bold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.role} · {t.neighbourhood}, {data.city}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Prep */}
      <section className="py-14 bg-muted/30" id="prep">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-black text-foreground mb-6">
            {data.city} winter preparation guide
          </h2>
          {data.prep_long.split("\n\n").map((para, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-4">
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* Mistakes */}
      <section className="py-14" id="mistakes">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-black text-foreground mb-6">
            Common winter mistakes {data.city} property owners make
          </h2>
          {data.mistakes_long.split("\n\n").map((para, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-4">
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* Nearby */}
      <section className="py-14 bg-muted/30" id="nearby">
        <div className="container max-w-4xl">
          <h2 className="text-3xl font-black text-foreground mb-4">
            Snow removal in nearby cities
          </h2>
          <p className="text-muted-foreground mb-4">
            Serving clients between {data.city} and neighbouring Fraser Valley and Metro Vancouver municipalities — same crews, same response standards, same seasonal-contract structure.
          </p>
          <div className="flex flex-wrap gap-2">
            {data.internal_links.map((slug) => (
              <Link
                key={slug}
                to={`/${slug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Authority */}
      <section className="py-14" id="authority">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-black text-foreground mb-4">
            Official resources for {data.city} property owners
          </h2>
          <ul className="space-y-3">
            {data.external_authority_links.map((l) => (
              <li key={l.url} className="rounded-xl border border-border bg-card p-4">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener"
                  className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  {l.label} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-primary text-primary-foreground" id="cta">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Get your {data.city} snow removal quote today
          </h2>
          <p className="text-lg mb-6 opacity-90">
            Seasonal contracts for {data.city} are limited. Secure your spot before first snowfall.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href={`tel:${data.phone.replace(/-/g, "")}`}
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground font-bold px-6 py-3 rounded-full hover:bg-secondary/90 shadow-lg"
            >
              <Phone className="w-5 h-5" /> {data.phone}
            </a>
            <a
              href={`mailto:${data.email}`}
              className="inline-flex items-center gap-2 bg-white/10 border-2 border-white font-bold px-6 py-3 rounded-full hover:bg-white hover:text-primary"
            >
              <Mail className="w-5 h-5" /> {data.email}
            </a>
            <Link
              to="/quote"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground font-bold px-6 py-3 rounded-full hover:bg-secondary/90 shadow-lg"
            >
              Request Free Quote
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

function landmarkBlurb(name: string, type: string, city: string): string {
  const base: Record<string, string> = {
    commercial: `${name} is a high-traffic retail environment where parking-lot access, loading-dock clearance, and pedestrian walkway safety all need to be maintained through every hour of a snow event. PlowWow crews service commercial anchors like ${name} on documented routes with GPS-tracked equipment and post-event incident logs delivered to property managers within 24 hours.`,
    venue: `${name} generates concentrated pedestrian traffic on event nights, which means every parking-area slip becomes a documented incident. Coordinated pre-event brine application and post-event walkway de-icing is standard for venues like ${name} — the liability profile does not tolerate reactive service.`,
    landmark: `${name} sits in a sensitive area where heritage guidelines and environmental restrictions govern which de-icing products can be used and where equipment can be staged. PlowWow's ${city} crews are briefed on the site-specific rules for locations like ${name} before the season starts.`,
    government: `${name} anchors the civic core of ${city}, which means public expectations for clearing timelines are effectively immediate. Adjacent commercial and strata properties benefit from the higher municipal clearing standards in the ${name} corridor.`,
    institution: `${name} serves a large daily population of students, staff, and visitors. Adjacent multi-tenant residential and mixed-use strata properties around ${name} face heightened slip-and-fall exposure during class-day mornings and are prioritised in our overnight dispatch.`,
    park: `${name} borders residential and strata properties where environmental sensitivity matters. Near ${name} we default to magnesium chloride blends and reduced application rates to protect landscaping, tree roots, and adjacent watercourses.`,
    transit: `${name} is a critical transit access point where property frontages must be cleared before the first morning trip. Adjacent commercial and strata properties along ${name} approaches receive priority dispatch on every event.`,
  };
  return base[type] ?? `${name} is a priority service area in ${city}.`;
}

export default CityDeepDive;
