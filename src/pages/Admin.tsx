import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { LogOut, RefreshCw, Download, BarChart3 } from "lucide-react";
import { applyPageMeta } from "@/lib/pageMeta";

type QuoteRequest = Tables<"quote_requests">;

const STATUSES = ["new", "contacted", "quoted", "scheduled", "completed", "archived"] as const;
type Status = (typeof STATUSES)[number];

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  contacted: "secondary",
  quoted: "secondary",
  scheduled: "secondary",
  completed: "outline",
  archived: "outline",
};

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function Admin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [total, setTotal] = useState(0);
  const [allServiceTypes, setAllServiceTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    applyPageMeta({
      title: "Admin Dashboard | PlowWow",
      description: "PlowWow internal admin dashboard for managing quote requests, contractors, and snow ops operations.",
      path: "/admin",
      noindex: true,
      ogImage: "https://plowwow.com/og-default.jpg",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "PlowWow Admin",
        description: "Internal admin dashboard (restricted).",
        url: "https://plowwow.com/admin",
        isPartOf: { "@type": "WebSite", name: "PlowWow", url: "https://plowwow.com" },
      },
    });
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

  const load = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("quote_requests")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (serviceFilter !== "all") q = q.eq("service_type", serviceFilter);
    if (dateFrom) q = q.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    const term = debouncedSearch.trim();
    if (term) {
      const safe = term.replace(/[%,()]/g, " ");
      const pattern = `%${safe}%`;
      q = q.or(
        `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},address.ilike.${pattern},postal_code.ilike.${pattern}`,
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
  }, [page, pageSize, statusFilter, serviceFilter, debouncedSearch, dateFrom, dateTo]);

  const [exportJob, setExportJob] = useState<{
    id: string | null;
    status: "idle" | "starting" | "running" | "completed" | "failed";
    rowCount: number;
    signedUrl: string | null;
    filename: string | null;
    error: string | null;
  }>({ id: null, status: "idle", rowCount: 0, signedUrl: null, filename: null, error: null });

  const buildFilters = useCallback(() => ({
    status: statusFilter !== "all" ? statusFilter : undefined,
    service_type: serviceFilter !== "all" ? serviceFilter : undefined,
    date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    date_to: (() => {
      if (!dateTo) return undefined;
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    })(),
    search: debouncedSearch.trim() || undefined,
  }), [statusFilter, serviceFilter, dateFrom, dateTo, debouncedSearch]);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    setExportJob({ id: null, status: "starting", rowCount: 0, signedUrl: null, filename: null, error: null });
    try {
      const filters = buildFilters();
      const { data, error } = await supabase.functions.invoke("export-quotes", { body: filters });
      if (error) throw error;
      const payload = data as { signed_url?: string; row_count?: number; error?: string; job_id?: string; filename?: string };
      if (!payload?.signed_url) throw new Error(payload?.error ?? "No download URL returned");
      setExportJob({
        id: payload.job_id ?? null,
        status: "completed",
        rowCount: payload.row_count ?? 0,
        signedUrl: payload.signed_url,
        filename: payload.filename ?? null,
        error: null,
      });
      toast({ title: "Export ready", description: `${payload.row_count ?? 0} rows — click download below.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again.";
      setExportJob((s) => ({ ...s, status: "failed", error: msg }));
      toast({ title: "Export failed", description: msg, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [buildFilters]);

  // Poll running job (in case of long-running exports). Currently the function
  // completes inline, but polling lets us reflect progress if it becomes async.
  useEffect(() => {
    if (!exportJob.id || (exportJob.status !== "starting" && exportJob.status !== "running")) return;
    let cancelled = false;
    const tick = async () => {
      const { data } = await supabase
        .from("quote_export_jobs")
        .select("status, row_count, signed_url, error")
        .eq("id", exportJob.id!)
        .maybeSingle();
      if (cancelled || !data) return;
      if (data.status === "completed") {
        setExportJob((s) => ({ ...s, status: "completed", rowCount: data.row_count ?? 0, signedUrl: data.signed_url ?? s.signedUrl, error: null }));
      } else if (data.status === "failed") {
        setExportJob((s) => ({ ...s, status: "failed", error: data.error ?? "Failed" }));
      } else {
        setExportJob((s) => ({ ...s, status: "running", rowCount: data.row_count ?? s.rowCount }));
      }
    };
    const iv = setInterval(tick, 1500);
    return () => { cancelled = true; clearInterval(iv); };
  }, [exportJob.id, exportJob.status]);

  const loadServiceTypes = useCallback(async () => {
    const { data, error } = await supabase.from("quote_requests").select("service_type");
    if (error) return;
    const types = Array.from(new Set((data ?? []).map((r) => r.service_type))).sort();
    setAllServiceTypes(types);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      load();
      loadServiceTypes();
    }
  }, [isAdmin, load, loadServiceTypes]);

  const updateStatus = async (id: string, status: Status) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
    if (error) {
      setRows(prev);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated", description: `Marked as ${status}.` });
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

  useEffect(() => { setPage(1); }, [statusFilter, serviceFilter, debouncedSearch, pageSize, dateFrom, dateTo]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;

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
              Your account does not have admin permissions. Ask an existing admin to grant you access.
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
            <h1 className="text-2xl md:text-3xl font-bold">Quote requests</h1>
            <p className="text-sm text-muted-foreground">{total} total</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link to="/admin/quote-metrics"><BarChart3 className="h-4 w-4" /> Metrics</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/quote-audit-log">Audit log</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/guest-posts">Guest posts</Link>
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={exporting || loading}>
              <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>

        {exportJob.status !== "idle" && (
          <Card>
            <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm">
                <div className="font-medium">
                  Export {exportJob.status === "completed" ? "ready" : exportJob.status === "failed" ? "failed" : "in progress"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {exportJob.status === "starting" && "Queued — running export…"}
                  {exportJob.status === "running" && `Processing… ${exportJob.rowCount} rows so far`}
                  {exportJob.status === "completed" && `${exportJob.rowCount} rows • filters embedded in file & filename`}
                  {exportJob.status === "failed" && (exportJob.error ?? "Unknown error")}
                </div>
              </div>
              <div className="flex gap-2">
                {exportJob.status === "completed" && exportJob.signedUrl && (
                  <Button asChild size="sm">
                    <a href={exportJob.signedUrl} download={exportJob.filename ?? undefined} rel="noopener">
                      <Download className="h-4 w-4" /> Download{exportJob.filename ? ` (${exportJob.filename})` : ""}
                    </a>
                  </Button>
                )}
                {(exportJob.status === "completed" || exportJob.status === "failed") && (
                  <Button variant="ghost" size="sm" onClick={() => setExportJob({ id: null, status: "idle", rowCount: 0, signedUrl: null, filename: null, error: null })}>Dismiss</Button>
                )}
                {(exportJob.status === "starting" || exportJob.status === "running") && (
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6 grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Search name, email, address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:col-span-2"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                {allServiceTypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-center md:col-span-2">
              <Label htmlFor="date-from" className="text-xs whitespace-nowrap">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
              <Label htmlFor="date-to" className="text-xs whitespace-nowrap">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Prefers</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      No quote requests match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">
                      <div>{r.email}</div>
                      <div className="text-muted-foreground">{r.phone}</div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      <div>{r.address}</div>
                      <div className="text-muted-foreground">{r.postal_code}</div>
                    </TableCell>
                    <TableCell className="text-xs">{r.service_type}</TableCell>
                    <TableCell className="text-xs capitalize">{r.contact_method}</TableCell>
                    <TableCell className="text-xs max-w-[240px] truncate" title={r.notes ?? ""}>
                      {r.notes || <span className="text-muted-foreground">—</span>}
                    </TableCell>
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
              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={currentPage <= 1}>First</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>
              <span className="text-sm">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages}>Last</Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
