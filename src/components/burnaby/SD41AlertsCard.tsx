import { useEffect, useState, useMemo } from "react";
import { School, ExternalLink, AlertTriangle, RefreshCw, Newspaper, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type AlertItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  isClosure: boolean;
};

type Payload = {
  source: string;
  newsUrl: string;
  fetchedAt: string;
  items: AlertItem[];
};

const formatDate = (d: string) => {
  const t = new Date(d);
  if (isNaN(t.getTime())) return d;
  return t.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
};

const SD41AlertsCard = () => {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "closures">("closures");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke<Payload>("sd41-alerts");
      if (error) throw error;
      if (!data) throw new Error("No data");
      setData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const closureCount = data?.items.filter((i) => i.isClosure).length ?? 0;
  const filteredItems =
    data?.items.filter((i) => (filter === "closures" ? i.isClosure : true)) ?? [];
  const visibleItems = filteredItems.slice(0, 3);

  return (
    <div className="group relative rounded-2xl p-6 border border-white/40 bg-white/60 backdrop-blur-xl shadow-lg">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-white/10 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <School className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50">
              <button
                onClick={() => setFilter("closures")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  filter === "closures"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={filter === "closures"}
              >
                <AlertTriangle className="w-3 h-3" />
                Closures
              </button>
              <button
                onClick={() => setFilter("all")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  filter === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={filter === "all"}
              >
                <Newspaper className="w-3 h-3" />
                All News
              </button>
            </div>
            <button
              onClick={load}
              disabled={loading}
              aria-label="Refresh SD41 alerts"
              className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <h3 className="font-heading font-bold text-lg text-foreground mb-1">
          SD41 School Closures
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Burnaby School District 41 · Live news feed
        </p>

        {closureCount > 0 && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {closureCount} closure-related alert{closureCount > 1 ? "s" : ""}
          </div>
        )}

        {loading && !data && (
          <div className="space-y-2 mb-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {error && !data && (
          <p className="text-sm text-destructive mb-3">Couldn't load alerts: {error}</p>
        )}

        {data && visibleItems.length > 0 && (
          <ul className="space-y-2.5 mb-4">
            {visibleItems.map((item) => (
              <li key={item.link} className="text-sm">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/item block"
                >
                  <div className="flex items-start gap-2">
                    {item.isClosure && (
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-semibold leading-snug line-clamp-2 group-hover/item:underline ${
                          item.isClosure ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(item.pubDate)}
                      </p>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}

        {data && visibleItems.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground mb-3">
            {filter === "closures"
              ? "No closure-related alerts right now."
              : "No recent alerts."}
          </p>
        )}

        <a
          href={data?.newsUrl ?? "https://burnabyschools.ca/"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          All SD41 alerts <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default SD41AlertsCard;
