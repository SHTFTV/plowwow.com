import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Phone, ArrowRight } from "lucide-react";

import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCityBySlug } from "@/data/cities";

const QuoteConfirmed = () => {
  const [params] = useSearchParams();
  const slug = (params.get("city") ?? "").replace(/\/+$/, "");
  const city = useMemo(() => {
    if (slug === "burnaby")
      return { slug: "burnaby", name: "Burnaby", province: "BC" };
    const c = getCityBySlug(slug);
    return c ? { slug: c.slug, name: c.name, province: c.province } : null;
  }, [slug]);

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
      "Your PlowWow snow removal quote request was received. We'll reply within one business day.",
    );
  }, [city]);

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-20">
          <div className="container max-w-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-4 text-foreground">
              We got your request{city ? `, ${city.name}` : ""}.
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              A PlowWow account manager will reply within one business day with
              a scoped seasonal quote for your{" "}
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
