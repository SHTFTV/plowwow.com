import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type RecentQuote = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  city_slug: string | null;
  province: string | null;
  property_type: string | null;
  service_level: string | null;
  property_size: string | null;
  frequency: string | null;
  driveway_meters: number | null;
  estimate_low: number | null;
  estimate_high: number | null;
  estimate_unit: string | null;
  geocode_lat: number | null;
  geocode_lon: number | null;
  geocode_formatted: string | null;
  distance_km: number | null;
  source: string | null;
  notes: string | null;
};

const money = (n: number | null) =>
  n == null
    ? "—"
    : n.toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      });

const AdminQuoteRecent = () => {
  const [rows, setRows] = useState<RecentQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quote_requests")
      .select(
        "id, created_at, name, email, phone, address, city, city_slug, province, property_type, service_level, property_size, frequency, driveway_meters, estimate_low, estimate_high, estimate_unit, geocode_lat, geocode_lon, geocode_formatted, distance_km, source, notes",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({
        title: "Failed to load quotes",
        description: error.message,
        variant: "destructive",
      });
      setRows([]);
    } else {
      setRows((data ?? []) as RecentQuote[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Recent quotes | PlowWow Admin";
    void load();
  }, []);

  const cities = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.city && set.add(r.city));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(
    () =>
      cityFilter === "all"
        ? rows
        : rows.filter((r) => r.city === cityFilter),
    [rows, cityFilter],
  );

  const byCity = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      const key = r.city ?? "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main className="py-10">
        <div className="container max-w-7xl">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <Link
                to="/admin"
                className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-primary"
              >
                <ArrowLeft className="w-4 h-4" /> Back to admin
              </Link>
              <h1 className="text-3xl md:text-4xl font-black text-foreground mt-2">
                Recent quotes
              </h1>
              <p className="text-muted-foreground">
                Latest 200 quote submissions with estimator inputs and
                geocoding results.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-heading font-bold px-4 py-2 text-sm disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs uppercase text-muted-foreground">Total</p>
              <p className="text-2xl font-black">{rows.length}</p>
            </div>
            {byCity.slice(0, 3).map(([c, n]) => (
              <div
                key={c}
                className="bg-card border border-border rounded-xl p-4"
              >
                <p className="text-xs uppercase text-muted-foreground">{c}</p>
                <p className="text-2xl font-black">{n}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <label className="text-sm font-semibold">City:</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">All ({rows.length})</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c} ({rows.filter((r) => r.city === c).length})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 whitespace-nowrap">Submitted</th>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Property</th>
                    <th className="px-3 py-2 whitespace-nowrap">Estimate</th>
                    <th className="px-3 py-2">Pin</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                        No quotes match this filter yet.
                      </td>
                    </tr>
                  )}
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("en-CA", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold">{r.city ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.source ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold">{r.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.phone}
                        </div>
                      </td>
                      <td className="px-3 py-2 max-w-[220px]">
                        <div className="truncate" title={r.address ?? ""}>
                          {r.address ?? "—"}
                        </div>
                        {r.geocode_formatted && (
                          <div
                            className="text-xs text-muted-foreground truncate"
                            title={r.geocode_formatted}
                          >
                            → {r.geocode_formatted}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="capitalize">
                          {(r.property_type ?? "").replace(/-/g, " ")} ·{" "}
                          {(r.property_size ?? "").replace(/-/g, " ")}
                        </div>
                        <div className="text-muted-foreground capitalize">
                          {(r.service_level ?? "").replace(/-/g, " ")}
                          {r.frequency ? ` · ${r.frequency.replace(/-/g, " ")}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-semibold">
                          {money(r.estimate_low)} – {money(r.estimate_high)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.estimate_unit ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {r.geocode_lat != null && r.geocode_lon != null ? (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${r.geocode_lat}&mlon=${r.geocode_lon}#map=17/${r.geocode_lat}/${r.geocode_lon}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {r.geocode_lat.toFixed(4)},{" "}
                            {r.geocode_lon.toFixed(4)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {r.distance_km != null && (
                          <div className="text-muted-foreground">
                            {r.distance_km.toFixed(1)} km
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminQuoteRecent;
