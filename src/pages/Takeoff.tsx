import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Download, Save, Trash2, FileText } from "lucide-react";

type RateCard = {
  plow_per_sqft: number;
  salt_per_bag: number;
  per_visit: number;
  currency: string;
};

type Estimate = {
  id: string;
  property_address: string;
  lot_sqft: number;
  curb_linear_ft: number;
  walkways_count: number;
  salt_bags_season: number;
  visits_per_season: number;
  plow_per_sqft: number;
  salt_per_bag: number;
  per_visit: number;
  subtotal: number;
  notes: string | null;
  created_at: string;
};

const DEFAULT_RATES: RateCard = {
  plow_per_sqft: 0.02,
  salt_per_bag: 22,
  per_visit: 145,
  currency: "CAD",
};

const money = (n: number, cur = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: cur }).format(n);

function calcSubtotal(form: {
  lot_sqft: number;
  salt_bags_season: number;
  visits_per_season: number;
  plow_per_sqft: number;
  salt_per_bag: number;
  per_visit: number;
}) {
  const plow = form.lot_sqft * form.plow_per_sqft * form.visits_per_season;
  const salt = form.salt_bags_season * form.salt_per_bag;
  const visits = form.visits_per_season * form.per_visit;
  return Math.round((plow + salt + visits) * 100) / 100;
}

const Takeoff = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<RateCard>(DEFAULT_RATES);
  const [estimates, setEstimates] = useState<Estimate[]>([]);

  const [form, setForm] = useState({
    property_address: "",
    lot_sqft: 5000,
    curb_linear_ft: 200,
    walkways_count: 2,
    salt_bags_season: 30,
    visits_per_season: 12,
    notes: "",
  });

  // SEO
  useEffect(() => {
    const TITLE = "Snow Contract Takeoff & Estimate Tool | PlowWow";
    const DESC = "Build snow-contract takeoffs and export branded PDF estimates using your own editable rate card.";
    const URL_ABS = "https://plowwow.com/takeoff";
    const OG_IMAGE = "https://plowwow.com/og-default.jpg";
    document.title = TITLE;
    const set = (sel: string, attr: string, val: string) => {
      let el = document.querySelector(sel);
      if (!el) {
        if (sel.startsWith('meta[name="')) {
          el = document.createElement("meta");
          (el as HTMLMetaElement).name = sel.slice(11, -2);
          document.head.appendChild(el);
        } else if (sel.startsWith('meta[property="')) {
          el = document.createElement("meta");
          el.setAttribute("property", sel.slice(15, -2));
          document.head.appendChild(el);
        } else if (sel === 'link[rel="canonical"]') {
          el = document.createElement("link");
          (el as HTMLLinkElement).rel = "canonical";
          document.head.appendChild(el);
        }
      }
      if (el) el.setAttribute(attr, val);
    };
    set('meta[name="description"]', "content", DESC);
    set('link[rel="canonical"]', "href", URL_ABS);
    set('meta[property="og:url"]', "content", URL_ABS);
    set('meta[property="og:title"]', "content", TITLE);
    set('meta[property="og:description"]', "content", DESC);
    set('meta[property="og:type"]', "content", "website");
    set('meta[property="og:image"]', "content", OG_IMAGE);
    set('meta[name="twitter:card"]', "content", "summary_large_image");
    set('meta[name="twitter:title"]', "content", TITLE);
    set('meta[name="twitter:description"]', "content", DESC);
    set('meta[name="twitter:image"]', "content", OG_IMAGE);

    const wpId = "takeoff-webpage-jsonld";
    document.getElementById(wpId)?.remove();
    const wp = document.createElement("script");
    wp.type = "application/ld+json";
    wp.id = wpId;
    wp.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESC,
      url: URL_ABS,
    });
    document.head.appendChild(wp);
    return () => { document.getElementById(wpId)?.remove(); };
  }, []);

  // Auth
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load rate card + estimates when signed in
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: rc } = await supabase
        .from("rate_cards")
        .select("plow_per_sqft, salt_per_bag, per_visit, currency")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (rc) {
        setRates({
          plow_per_sqft: Number(rc.plow_per_sqft),
          salt_per_bag: Number(rc.salt_per_bag),
          per_visit: Number(rc.per_visit),
          currency: rc.currency,
        });
      }
      const { data: est } = await supabase
        .from("estimates")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (est) setEstimates(est as unknown as Estimate[]);
    })();
  }, [session]);

  const subtotal = useMemo(
    () =>
      calcSubtotal({
        lot_sqft: Number(form.lot_sqft) || 0,
        salt_bags_season: Number(form.salt_bags_season) || 0,
        visits_per_season: Number(form.visits_per_season) || 0,
        plow_per_sqft: Number(rates.plow_per_sqft) || 0,
        salt_per_bag: Number(rates.salt_per_bag) || 0,
        per_visit: Number(rates.per_visit) || 0,
      }),
    [form, rates],
  );

  async function saveRates() {
    if (!session) return;
    const { error } = await supabase.from("rate_cards").upsert(
      {
        user_id: session.user.id,
        plow_per_sqft: rates.plow_per_sqft,
        salt_per_bag: rates.salt_per_bag,
        per_visit: rates.per_visit,
        currency: rates.currency,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rate card saved" });
    }
  }

  async function saveEstimate() {
    if (!session) return;
    if (!form.property_address.trim()) {
      toast({ title: "Property address required", variant: "destructive" });
      return;
    }
    const row = {
      user_id: session.user.id,
      property_address: form.property_address.trim(),
      lot_sqft: Number(form.lot_sqft) || 0,
      curb_linear_ft: Number(form.curb_linear_ft) || 0,
      walkways_count: Number(form.walkways_count) || 0,
      salt_bags_season: Number(form.salt_bags_season) || 0,
      visits_per_season: Number(form.visits_per_season) || 0,
      plow_per_sqft: rates.plow_per_sqft,
      salt_per_bag: rates.salt_per_bag,
      per_visit: rates.per_visit,
      subtotal,
      notes: form.notes.trim() || null,
    };
    const { data, error } = await supabase
      .from("estimates")
      .insert(row)
      .select("*")
      .single();
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setEstimates((prev) => [data as unknown as Estimate, ...prev]);
    toast({ title: "Estimate saved" });
  }

  async function deleteEstimate(id: string) {
    const { error } = await supabase.from("estimates").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setEstimates((prev) => prev.filter((e) => e.id !== id));
  }

  function exportPdf(e: Estimate) {
    const cur = rates.currency;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const left = 56;
    let y = 64;

    doc.setFillColor(13, 42, 74);
    doc.rect(0, 0, 612, 96, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("PlowWow", left, 44);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Snow Removal & De-Ice Management", left, 62);
    doc.text("604-761-1518  ·  plowwow.com", left, 78);
    y = 128;

    doc.setTextColor(20, 20, 20);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Seasonal Snow Estimate", left, y);
    y += 22;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Estimate #${e.id.slice(0, 8).toUpperCase()}`, left, y);
    doc.text(new Date(e.created_at).toLocaleDateString("en-CA"), 500, y, { align: "right" });
    y += 24;

    doc.setFont("helvetica", "bold");
    doc.text("Property", left, y);
    doc.setFont("helvetica", "normal");
    doc.text(e.property_address, left + 80, y);
    y += 26;

    // Table
    doc.setFillColor(240, 244, 250);
    doc.rect(left, y, 500, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Line item", left + 8, y + 15);
    doc.text("Qty", left + 260, y + 15);
    doc.text("Rate", left + 340, y + 15);
    doc.text("Total", 556, y + 15, { align: "right" });
    y += 30;

    const plowTotal = e.lot_sqft * e.plow_per_sqft * e.visits_per_season;
    const saltTotal = e.salt_bags_season * e.salt_per_bag;
    const visitTotal = e.visits_per_season * e.per_visit;

    const rows: [string, string, string, number][] = [
      [
        `Plowing — ${e.lot_sqft.toLocaleString()} sq ft × ${e.visits_per_season} visits`,
        `${e.lot_sqft.toLocaleString()} sq ft`,
        `${money(e.plow_per_sqft, cur)}/sqft`,
        plowTotal,
      ],
      [
        `Salt / de-ice — season supply`,
        `${e.salt_bags_season} bags`,
        `${money(e.salt_per_bag, cur)}/bag`,
        saltTotal,
      ],
      [
        `Per-visit dispatch fee`,
        `${e.visits_per_season} visits`,
        `${money(e.per_visit, cur)}/visit`,
        visitTotal,
      ],
    ];

    doc.setFont("helvetica", "normal");
    for (const [label, qty, rate, total] of rows) {
      doc.text(label, left + 8, y);
      doc.text(qty, left + 260, y);
      doc.text(rate, left + 340, y);
      doc.text(money(total, cur), 556, y, { align: "right" });
      y += 20;
    }

    y += 8;
    doc.setDrawColor(200);
    doc.line(left, y, left + 500, y);
    y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Season Total", left + 340, y);
    doc.text(money(e.subtotal, cur), 556, y, { align: "right" });

    y += 32;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(
      `Site details: ${e.curb_linear_ft} linear ft curb, ${e.walkways_count} walkway(s).`,
      left,
      y,
    );
    y += 14;
    if (e.notes) {
      doc.text(`Notes: ${e.notes}`, left, y, { maxWidth: 500 });
      y += 28;
    }
    doc.text(
      "Estimate valid 30 days. Seasonal contract; per-storm additional charges may apply for events over 15 cm.",
      left,
      y,
      { maxWidth: 500 },
    );

    doc.save(
      `plowwow-estimate-${e.property_address.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`,
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <Navbar />
        <div className="container py-24 text-center text-muted-foreground">Loading…</div>
        <Footer />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <Navbar />
        <main className="container py-20 max-w-2xl">
          <h1 className="text-4xl font-black mb-4">Snow Contract Takeoff Tool</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to build takeoffs with your own rate card, save estimates, and export
            branded PDFs. Your data is scoped to your account and never shared.
          </p>
          <Button size="lg" onClick={() => navigate("/auth?next=/takeoff")}>
            Sign in / Create account
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main className="container py-12 max-w-6xl">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-2">Takeoff & Estimate</h1>
            <p className="text-muted-foreground">
              Signed in as <strong>{session.user.email}</strong> ·{" "}
              <button
                className="underline"
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
              >
                sign out
              </button>
            </p>
          </div>
          <Link to="/" className="text-sm text-muted-foreground underline">
            ← Back to site
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Rate card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Rate Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plow ($/sq ft/visit)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={rates.plow_per_sqft}
                    onChange={(e) =>
                      setRates((r) => ({ ...r, plow_per_sqft: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Salt ($/bag)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rates.salt_per_bag}
                    onChange={(e) =>
                      setRates((r) => ({ ...r, salt_per_bag: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Per-visit dispatch ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rates.per_visit}
                    onChange={(e) =>
                      setRates((r) => ({ ...r, per_visit: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={rates.currency}
                    maxLength={3}
                    onChange={(e) =>
                      setRates((r) => ({ ...r, currency: e.target.value.toUpperCase() }))
                    }
                  />
                </div>
              </div>
              <Button onClick={saveRates} variant="secondary">
                <Save className="w-4 h-4 mr-2" /> Save rate card
              </Button>
            </CardContent>
          </Card>

          {/* Takeoff form */}
          <Card>
            <CardHeader>
              <CardTitle>New Takeoff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Property address</Label>
                <Input
                  value={form.property_address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, property_address: e.target.value }))
                  }
                  placeholder="1234 Willingdon Ave, Burnaby BC"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lot sq ft</Label>
                  <Input
                    type="number"
                    value={form.lot_sqft}
                    onChange={(e) => setForm((f) => ({ ...f, lot_sqft: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Curb linear ft</Label>
                  <Input
                    type="number"
                    value={form.curb_linear_ft}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, curb_linear_ft: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Walkways (count)</Label>
                  <Input
                    type="number"
                    value={form.walkways_count}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, walkways_count: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Salt bags / season</Label>
                  <Input
                    type="number"
                    value={form.salt_bags_season}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, salt_bags_season: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label>Visits / season</Label>
                  <Input
                    type="number"
                    value={form.visits_per_season}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, visits_per_season: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Trigger depth, salt-only zones, access notes…"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <div className="text-sm text-muted-foreground">Season total</div>
                  <div className="text-2xl font-black text-primary">
                    {money(subtotal, rates.currency)}
                  </div>
                </div>
                <Button onClick={saveEstimate}>
                  <Save className="w-4 h-4 mr-2" /> Save estimate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saved estimates */}
        <div className="mt-10">
          <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6" /> Saved Estimates
          </h2>
          {estimates.length === 0 ? (
            <p className="text-muted-foreground">No estimates yet — save one above.</p>
          ) : (
            <div className="grid gap-3">
              {estimates.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between border border-border rounded-xl p-4 bg-card"
                >
                  <div>
                    <div className="font-semibold">{e.property_address}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("en-CA")} ·{" "}
                      {e.lot_sqft.toLocaleString()} sq ft · {e.visits_per_season} visits ·{" "}
                      <strong>{money(Number(e.subtotal), rates.currency)}</strong>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => exportPdf(e)}>
                      <Download className="w-4 h-4 mr-1" /> PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteEstimate(e.id)}
                      aria-label="Delete estimate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Takeoff;
