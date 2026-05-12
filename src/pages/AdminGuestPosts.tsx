import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { LogOut, RefreshCw, ArrowLeft, Eye, X } from "lucide-react";

type Submission = Tables<"guest_post_submissions">;

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

export default function AdminGuestPosts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get("status");
  const statusFilter =
    statusParam && (STATUSES as readonly string[]).includes(statusParam) ? statusParam : "all";
  const search = searchParams.get("q") ?? "";
  const pageSizeParam = Number(searchParams.get("size"));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(pageSizeParam)
    ? pageSizeParam
    : DEFAULT_PAGE_SIZE;
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const debouncedSearch = useDebounced(search, 350);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updateParams = useCallback(
    (patch: Record<string, string | number | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === "" || v === undefined) next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setStatusFilter = (v: string) =>
    updateParams({ status: v === "all" ? null : v, page: null });
  const setSearch = (v: string) => updateParams({ q: v || null, page: null });
  const setPageSize = (n: number) =>
    updateParams({ size: n === DEFAULT_PAGE_SIZE ? null : n, page: null });
  const setPage = (n: number) => updateParams({ page: n <= 1 ? null : n });

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);

  const [viewing, setViewing] = useState<Submission | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("guest_post_submissions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const term = debouncedSearch.trim();
    if (term) {
      const safe = term.replace(/[%,()]/g, " ");
      const pattern = `%${safe}%`;
      q = q.or(
        `name.ilike.${pattern},email.ilike.${pattern},topic.ilike.${pattern},message.ilike.${pattern}`,
      );
    }

    const { data, error, count } = await q;
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      return;
    }
    setRows(data ?? []);
    setTotal(count ?? 0);
  }, [page, pageSize, statusFilter, debouncedSearch]);

  const loadCounts = useCallback(async () => {
    const results = await Promise.all(
      STATUSES.map((s) =>
        supabase
          .from("guest_post_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", s),
      ),
    );
    const next: Record<string, number> = {};
    STATUSES.forEach((s, i) => { next[s] = results[i].count ?? 0; });
    setCounts(next);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      if (!roleData) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      setIsAdmin(true);
      setChecking(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  useEffect(() => {
    if (isAdmin) loadCounts();
  }, [isAdmin, loadCounts]);

  const updateStatus = async (id: string, status: Status) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from("guest_post_submissions").update({ status }).eq("id", id);
    if (error) {
      setRows(prev);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated", description: `Marked as ${status}.` });
      loadCounts();
      if (statusFilter !== "all" && status !== statusFilter) {
        setRows((r) => r.filter((x) => x.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;

  const refresh = () => { load(); loadCounts(); };

  const hasActiveFilters = statusFilter !== "all" || search !== "" || page > 1;
  const clearFilters = useCallback(
    () => updateParams({ status: null, q: null, page: null }),
    [updateParams],
  );

  useEffect(() => {
    if (!isAdmin) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = searchInputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
        return;
      }
      if (e.key !== "Escape") return;
      if (viewing) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable;
      // Allow Esc in the search input to clear filters and blur it.
      if (isEditable && t?.getAttribute("data-shortcut-target") !== "search") return;
      if (!hasActiveFilters) return;
      e.preventDefault();
      clearFilters();
      (t as HTMLElement | null)?.blur?.();
      toast({ title: "Filters cleared" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, viewing, hasActiveFilters, clearFilters]);

  const grandTotal = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  );

  if (checking) {
    return <main className="min-h-screen flex items-center justify-center">Loading…</main>;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your account does not have admin permissions.
            </p>
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link to="/admin" className="inline-flex items-center gap-1 hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Quote requests
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Guest post submissions</h1>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {loading ? (
                "Loading…"
              ) : total === 0 ? (
                <>Showing 0 of {grandTotal}</>
              ) : (
                <>
                  Showing <span className="font-medium text-foreground">{startIdx + 1}–{Math.min(startIdx + pageSize, total)}</span>{" "}
                  of <span className="font-medium text-foreground">{total}</span>
                  {(statusFilter !== "all" || debouncedSearch) && <> matching</>}
                  {statusFilter !== "all" && <> · status <span className="font-medium text-foreground capitalize">{statusFilter}</span></>}
                  {debouncedSearch && <> · search “<span className="font-medium text-foreground">{debouncedSearch}</span>”</>}
                  {" "}· {grandTotal} total
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} title="Clear filters (Esc)">
                <X className="h-4 w-4" /> Clear filters
                <kbd className="ml-2 hidden md:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">Esc</kbd>
              </Button>
            )}
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {STATUSES.map((s) => (
            <Card key={s}>
              <CardContent className="pt-6">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{s}</div>
                <div className="text-2xl font-bold">{counts[s] ?? 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">
              All <span className="ml-1.5 text-xs text-muted-foreground">{grandTotal}</span>
            </TabsTrigger>
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">
                {s} <span className="ml-1.5 text-xs text-muted-foreground">{counts[s] ?? 0}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card>
          <CardContent className="pt-6">
            <Input
              ref={searchInputRef}
              placeholder="Search name, email, topic, message… (⌘/Ctrl+K to focus, Esc to clear)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-shortcut-target="search"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      No submissions match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{r.email}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={r.topic}>{r.topic}</TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate" title={r.message}>{r.message}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant[r.status] ?? "default"}>{r.status}</Badge>
                        <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                          <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setViewing(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap p-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="ml-2">
                {total === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, total)} of {total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={currentPage <= 1 || loading}>First</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1 || loading}>Previous</Button>
              <span className="text-sm">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages || loading}>Next</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages || loading}>Last</Button>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submission details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-muted-foreground">Name</div><div>{viewing.name}</div></div>
                <div><div className="text-xs text-muted-foreground">Email</div><div>{viewing.email}</div></div>
                <div><div className="text-xs text-muted-foreground">Received</div><div>{new Date(viewing.created_at).toLocaleString()}</div></div>
                <div><div className="text-xs text-muted-foreground">Status</div><Badge variant={statusVariant[viewing.status] ?? "default"}>{viewing.status}</Badge></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Topic</div>
                <div>{viewing.topic}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Message</div>
                <div className="whitespace-pre-wrap rounded-md border p-3 bg-muted/30">{viewing.message}</div>
              </div>
              <div className="flex gap-2 pt-2">
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={viewing.status === s ? "default" : "outline"}
                    onClick={() => { updateStatus(viewing.id, s); setViewing({ ...viewing, status: s }); }}
                  >
                    Mark {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
