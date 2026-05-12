import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { LogOut, RefreshCw } from "lucide-react";

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
      load();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quote_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      return;
    }
    setRows(data ?? []);
  };

  const updateStatus = async (id: string, status: Status) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
    if (error) {
      setRows(prev);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated", description: `Marked as ${status}.` });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const serviceTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.service_type))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (serviceFilter !== "all" && r.service_type !== serviceFilter) return false;
      if (!q) return true;
      return [r.name, r.email, r.phone, r.address, r.postal_code]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, statusFilter, serviceFilter, debouncedSearch]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => { setPage(1); }, [statusFilter, serviceFilter, debouncedSearch, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIdx, startIdx + pageSize);

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
            <p className="text-sm text-muted-foreground">{filtered.length} of {rows.length} shown</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/guest-posts">Guest posts</Link>
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>

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
                {serviceTypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
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
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      No quote requests match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {paginated.map((r) => (
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
                {filtered.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)} of {filtered.length}
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
