import { useEffect, useState, useMemo } from "react";
import { School, ExternalLink, AlertTriangle, RefreshCw, Newspaper, Search, X, Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type SavedSearch = {
  id: string;
  name: string;
  query: string;
  filter: "all" | "closures";
  createdAt: string;
};

const SAVED_KEY = "sd41-saved-searches";

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
  const [query, setQuery] = useState("");
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedListOpen, setSavedListOpen] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSavedSearches(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persistSaved = (list: SavedSearch[]) => {
    setSavedSearches(list);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };

  const handleSaveSearch = () => {
    const name = newName.trim() || (query.trim() ? query.trim() : `${filter} alerts`);
    const entry: SavedSearch = {
      id: crypto.randomUUID(),
      name,
      query: query.trim(),
      filter,
      createdAt: new Date().toISOString(),
    };
    persistSaved([entry, ...savedSearches].slice(0, 10));
    setNewName("");
    setSaveOpen(false);
    toast.success(`Saved "${name}"`);
  };

  const handleApplySaved = (s: SavedSearch) => {
    setQuery(s.query);
    setFilter(s.filter);
    setSavedListOpen(false);
  };

  const handleDeleteSaved = (id: string) => {
    persistSaved(savedSearches.filter((s) => s.id !== id));
  };

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const countMatches = (text: string, q: string) => {
    if (!q.trim()) return 0;
    const matches = text.match(new RegExp(escapeRegex(q.trim()), "gi"));
    return matches ? matches.length : 0;
  };

  const getMatches = (text: string, q: string): string[] => {
    if (!q.trim()) return [];
    const matches = text.match(new RegExp(escapeRegex(q.trim()), "gi"));
    return matches ? [...new Set(matches)] : [];
  };

  const HighlightedText = ({ text, query: q }: { text: string; query: string }) => {
    if (!q.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${escapeRegex(q.trim())})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.trim().toLowerCase() ? (
            <mark
              key={i}
              className="bg-primary/20 text-primary font-semibold rounded px-0.5"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

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

  const filteredItems = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.items.filter((i) => {
      const passesFilter = filter === "closures" ? i.isClosure : true;
      const passesSearch =
        !q ||
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q);
      return passesFilter && passesSearch;
    });
  }, [data, filter, query]);

  const visibleItems = filteredItems.slice(0, 3);
  const totalResults = filteredItems.length;

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
        <p className="text-xs text-muted-foreground mb-3">
          Burnaby School District 41 · Live news feed
        </p>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by school or keyword…"
            className="w-full rounded-lg border border-border/60 bg-background/70 pl-8 pr-7 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-shadow"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

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

        {query.trim() && totalResults > 0 && (
          <p className="text-[11px] text-muted-foreground mb-2">
            {totalResults} result{totalResults > 1 ? "s" : ""} for "{query.trim()}"
          </p>
        )}

        {data && visibleItems.length > 0 && (
          <ul className="space-y-2.5 mb-4">
            {visibleItems.map((item) => {
              const matchCount =
                countMatches(item.title, query) + countMatches(item.description, query);
              const matchedWords = [
                ...getMatches(item.title, query),
                ...getMatches(item.description, query),
              ];
              const uniqueMatches = [...new Set(matchedWords)];
              return (
                <li key={item.link} className="text-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                              <HighlightedText text={item.title} query={query} />
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              <HighlightedText text={item.description} query={query} />
                            </p>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5 flex items-center gap-1.5">
                              {formatDate(item.pubDate)}
                              {query.trim() && matchCount > 0 && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5">
                                  {matchCount} match{matchCount > 1 ? "es" : ""}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[320px] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Title
                      </p>
                      <p className="text-xs font-semibold text-foreground mb-2 leading-snug">
                        <HighlightedText text={item.title} query={query} />
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Description
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug">
                        <HighlightedText text={item.description} query={query} />
                      </p>
                      {query.trim() && matchCount > 0 && (
                        <p className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                          Matched: <span className="text-primary font-medium">{uniqueMatches.join(", ")}</span>
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        )}

        {data && visibleItems.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground mb-3">
            {query.trim()
              ? `No alerts match "${query.trim()}".`
              : filter === "closures"
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
