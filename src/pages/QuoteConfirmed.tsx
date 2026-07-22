import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Phone, ArrowRight, Download, MapPin } from "lucide-react";

import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCityBySlug } from "@/data/cities";
import { osmEmbedUrl } from "@/lib/addressGeocode";
import {
  generateQuotePdf,
  readLastQuote,
  type QuoteSummary,
} from "@/lib/quoteSummary";
import { toast } from "@/hooks/use-toast";

const QuoteConfirmed = () => {
  const [params] = useSearchParams();
  const slug = (params.get("city") ?? "").replace(/\/+$/, "");
  const city = useMemo(() => {
    if (slug === "burnaby")
      return { slug: "burnaby", name: "Burnaby", province: "BC" };
    const c = getCityBySlug(slug);
    return c ? { slug: c.slug, name: c.name, province: c.province } : null;
  }, [slug]);

  const [summary, setSummary] = useState<QuoteSummary | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setSummary(readLastQuote());
  }, []);

  useEffect(() => {
    const title = city
      ? `Quote received — ${city.name} | PlowWow`
      : "Quote received | PlowWow";
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
    setMeta("robots", "noindex,follow");
    setMeta(
      "description",
      "Your PlowWow snow removal quote request was received. Download your quote PDF or wait for our reply within one business day.",
    );
  }, [city]);

  const money = (n: number) =>
    n.toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    });

  const downloadPdf = async () => {
    if (!summary) return;
    setDownloading(true);
    try {
      const blob = await generateQuotePdf(summary);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date(summary.submittedAt)
        .toISOString()
        .slice(0, 10);
      a.download = `plowwow-quote-${summary.citySlug}-${stamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "PDF download failed",
        description:
          "We saved your request but couldn't build the PDF here. Email dispatch@plowwow.com and we'll send it.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-16">
          <div className="container max-w-3xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black mb-4 text-foreground">
                We got your request{city ? `, ${city.name}` : ""}.
              </h1>
              <p className="text-lg text-muted-foreground">
                A PlowWow account manager will reply within one business day
                with a scoped seasonal quote for your{" "}
                {city ? `${city.name} ` : ""}property. If you're inside a live
                storm window, call{" "}
                <a
                  href="tel:6047611518"
                  className="font-semibold text-primary hover:underline"
                >
                  604-761-1518
                </a>{" "}
                for priority dispatch.
              </p>
            </div>

            {summary && (
              <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-heading font-black text-2xl text-foreground">
                      Your quote summary
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {summary.city}, {summary.province} — submitted{" "}
                      {new Date(summary.submittedAt).toLocaleString("en-CA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadPdf}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground font-heading font-bold px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    {downloading ? "Building PDF…" : "Download PDF"}
                  </button>
                </div>

                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Live estimator range
                  </p>
                  <p className="font-heading font-black text-3xl text-foreground">
                    {money(summary.estimate.low)} –{" "}
                    {money(summary.estimate.high)}{" "}
                    <span className="text-base font-semibold text-muted-foreground">
                      {summary.estimate.unit}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.estimate.visitsHint}. Final quote confirmed by a
                    local route lead.
                  </p>
                </div>

                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Address</dt>
                    <dd className="font-semibold text-foreground">
                      {summary.address}
                    </dd>
                  </div>
                  {summary.geocode?.formatted && (
                    <div>
                      <dt className="text-muted-foreground">Geocoded to</dt>
                      <dd className="font-semibold text-foreground">
                        {summary.geocode.formatted}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Property type</dt>
                    <dd className="font-semibold text-foreground capitalize">
                      {summary.propertyType.replace(/-/g, " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Service level</dt>
                    <dd className="font-semibold text-foreground capitalize">
                      {summary.serviceLevel.replace(/-/g, " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Property size</dt>
                    <dd className="font-semibold text-foreground capitalize">
                      {summary.propertySize}
                    </dd>
                  </div>
                  {summary.serviceLevel === "seasonal" && (
                    <div>
                      <dt className="text-muted-foreground">Frequency</dt>
                      <dd className="font-semibold text-foreground capitalize">
                        {summary.frequency.replace(/-/g, " ")}
                      </dd>
                    </div>
                  )}
                  {summary.drivewayMeters > 0 && (
                    <div>
                      <dt className="text-muted-foreground">Driveway length</dt>
                      <dd className="font-semibold text-foreground">
                        {summary.drivewayMeters} m
                      </dd>
                    </div>
                  )}
                  {summary.avgSnowfallCm && (
                    <div>
                      <dt className="text-muted-foreground">
                        Local avg snowfall
                      </dt>
                      <dd className="font-semibold text-foreground">
                        {summary.avgSnowfallCm} cm/yr
                      </dd>
                    </div>
                  )}
                </dl>

                {summary.geocode && (
                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Confirmed pin
                    </p>
                    <div className="rounded-lg overflow-hidden border border-border">
                      <iframe
                        title="Quote address map"
                        src={osmEmbedUrl(
                          summary.geocode.lat,
                          summary.geocode.lon,
                        )}
                        loading="lazy"
                        className="w-full h-[220px] block"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 max-w-md mx-auto mb-8">
              <a
                href="tel:6047611518"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary text-secondary-foreground font-heading font-bold px-5 py-3"
              >
                <Phone className="w-4 h-4" /> Call now
              </a>
              {city && (
                <Link
                  to={`/${city.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-heading font-bold px-5 py-3"
                >
                  Back to {city.name}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 text-left">
              <h2 className="font-heading font-bold text-lg mb-2">
                What happens next
              </h2>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>An account manager reviews your property details.</li>
                <li>
                  We match you to the nearest {city?.name ?? "city"} crew and
                  confirm equipment fit.
                </li>
                <li>
                  You receive a scoped seasonal quote with trigger depth,
                  response window, product list, and documentation terms.
                </li>
                <li>
                  On acceptance, we activate your dispatch record and share
                  24/7 storm-line numbers.
                </li>
              </ol>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default QuoteConfirmed;
