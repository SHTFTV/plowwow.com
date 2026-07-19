import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { applyPageMeta } from "@/lib/pageMeta";

type AuditRow = {
  id: string;
  created_at: string;
  action: "denylist_add" | "denylist_remove" | "denylist_match";
  actor_id: string | null;
  email: string | null;
  ip: string | null;
  reason: string | null;
  request_code: string | null;
  meta: Record<string, unknown> | null;
};

const RANGES: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  "180d": 180 * 24 * 60 * 60 * 1000,
  "365d": 365 * 24 * 60 * 60 * 1000,
};

const ACTIONS = ["all", "denylist_add", "denylist_remove", "denylist_match"] as const;
const TARGETS = ["all", "email", "ip", "both"] as const;

const actionVariant: Record<AuditRow["action"], "default" | "secondary" | "destructive"> = {
  denylist_add: "default",
  denylist_remove: "secondary",
  denylist_match: "destructive",
};

const csvEsc = (v: unknown) => {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
};

export default function AdminQuoteAuditLog() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<keyof typeof RANGES>("7d");
  const [action, setAction] = useState<(typeof ACTIONS)[number]>("all");
  const [target, setTarget] = useState<(typeof TARGETS)[number]>("all");
  const [requestCode, setRequestCode] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    applyPageMeta({
      title: "Quote audit log | PlowWow admin",
      description: "Denylist add/remove events and denylist matches for quote submissions.",
      path: "/admin/quote-audit-log",
      noindex: true,
    });
  }, []);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate("/auth", { replace: true }); return; }
      const { data: roleData } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", sess.session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!roleData);
      setChecking(false);
    })();
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - RANGES[range]).toISOString();
    const { data, error } = await supabase.rpc("list_quote_audit_log", {
      _since: since,
      _limit: 2000,
      _actions: action === "all" ? null : [action],
    });
    setLoading(false);
    if (error) { toast({ title: "Load failed", description: error.message, variant: "destructive" }); return; }
    setRows((data ?? []) as unknown as AuditRow[]);
  }, [range, action]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const rc = requestCode.trim().toLowerCase();
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (target === "email" && !r.email) return false;
      if (target === "ip" && !r.ip) return false;
      if (target === "both" && (!r.email || !r.ip)) return false;
      if (rc && !(r.request_code ?? "").toLowerCase().includes(rc)) return false;
      if (s) {
        const hay = `${r.email ?? ""} ${r.ip ?? ""} ${r.reason ?? ""} ${r.request_code ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, target, requestCode, search]);

  const summary = useMemo(() => {
    const acc = { denylist_add: 0, denylist_remove: 0, denylist_match: 0 };
    for (const r of filtered) acc[r.action]++;
    return acc;
  }, [filtered]);

  const exportCsv = useCallback(() => {
    if (filtered.length === 0) {
      toast({ title: "Nothing to export", description: "No rows match the current filters." });
      return;
    }
    const cols = ["created_at","action","email","ip","reason","request_code","actor_id"];
    const meta = [
      `# PlowWow denylist audit export`,
      `# generated_at=${new Date().toISOString()}`,
      `# filters=${JSON.stringify({ range, action, target, requestCode, search })}`,
      `# row_count=${filtered.length}`,
    ];
    const lines = [...meta, cols.join(",")];
    for (const r of filtered) {
      lines.push(cols.map((c) => csvEsc((r as unknown as Record<string, unknown>)[c])).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `denylist-audit_${stamp}_${range}_${action}_${target}_${filtered.length}rows.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [filtered, range, action, target, requestCode, search]);

  if (checking) return <main className="min-h-screen flex items-center justify-center">Loading…</main>;
  if (!isAdmin) return <main className="min-h-screen flex items-center justify-center">Access denied</main>;

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Denylist audit log</h1>
            <p className="text-sm text-muted-foreground">Every add/remove action and every real-time denylist match from the submit-quote function.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild><Link to="/admin/quote-denylist"><ArrowLeft className="h-4 w-4" /> Denylist</Link></Button>
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> Export CSV ({filtered.length})
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 grid gap-3 md:grid-cols-6">
            <div>
              <label className="text-xs text-muted-foreground">Range</label>
              <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGES)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(RANGES).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Action</label>
              <Select value={action} onValueChange={(v) => setAction(v as (typeof ACTIONS)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Match target</label>
              <Select value={target} onValueChange={(v) => setTarget(v as (typeof TARGETS)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="email">Email only</SelectItem>
                  <SelectItem value="ip">IP only</SelectItem>
                  <SelectItem value="both">Both email &amp; IP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Request code</label>
              <Input value={requestCode} onChange={(e) => setRequestCode(e.target.value)} placeholder="e.g. ip_limit" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Search email / IP / reason</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="gmail.com, 192.168, spam…" />
            </div>
            <div className="md:col-span-6 text-xs text-muted-foreground flex gap-4">
              <span>Adds: <b>{summary.denylist_add}</b></span>
              <span>Removes: <b>{summary.denylist_remove}</b></span>
              <span>Matches: <b>{summary.denylist_match}</b></span>
              <span className="ml-auto">Showing {filtered.length} of {rows.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Events</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No events match.</TableCell></TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={actionVariant[r.action]}>{r.action}</Badge></TableCell>
                    <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.ip ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.reason ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.request_code ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.actor_id ? r.actor_id.slice(0, 8) : "system"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
