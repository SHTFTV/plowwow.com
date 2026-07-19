import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, ShieldOff, Bell } from "lucide-react";
import { applyPageMeta } from "@/lib/pageMeta";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";

type Metric = { bucket: string; kind: string; count: number };
type EventRow = {
  id: string;
  created_at: string;
  kind: string;
  email: string | null;
  ip: string | null;
  user_agent: string | null;
  meta: Record<string, unknown>;
};
type Offender = {
  email: string | null;
  ip: string | null;
  blocked_count: number;
  last_seen: string;
};

const ALL_KINDS = [
  "ok","honeypot","too_fast","email_limit","ip_limit","burst_limit","invalid","insert_error","error",
] as const;

const BLOCKED_KINDS = ["honeypot","too_fast","email_limit","ip_limit","burst_limit","invalid"];

const KIND_COLORS: Record<string, string> = {
  ok: "hsl(142 71% 45%)",
  honeypot: "hsl(0 84% 60%)",
  too_fast: "hsl(25 95% 53%)",
  email_limit: "hsl(280 65% 60%)",
  ip_limit: "hsl(340 82% 52%)",
  burst_limit: "hsl(200 90% 55%)",
  invalid: "hsl(48 96% 53%)",
  insert_error: "hsl(0 0% 40%)",
  error: "hsl(0 0% 20%)",
};

const KIND_LABEL: Record<string, string> = {
  ok: "Success",
  honeypot: "Honeypot",
  too_fast: "Too fast",
  email_limit: "Email limit",
  ip_limit: "IP limit",
  burst_limit: "Burst",
  invalid: "Invalid",
  insert_error: "DB error",
  error: "Error",
};

const RANGES = [
  { value: "24h", label: "Last 24 hours", hours: 24 },
  { value: "7d", label: "Last 7 days", hours: 24 * 7 },
  { value: "30d", label: "Last 30 days", hours: 24 * 30 },
];

type Outcome = "all" | "success" | "blocked";

export default function AdminQuoteMetrics() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filter state (URL-backed)
  const range = params.get("range") ?? "7d";
  const outcome = (params.get("outcome") ?? "all") as Outcome;
  const kindFilter = params.get("kind") ?? "all";
  const emailDomain = params.get("domain") ?? "";
  const ipPrefix = params.get("ip") ?? "";

  const setParam = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (!v || v === "all" || v === "") next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const [domainInput, setDomainInput] = useState(emailDomain);
  const [ipInput, setIpInput] = useState(ipPrefix);
  useEffect(() => setDomainInput(emailDomain), [emailDomain]);
  useEffect(() => setIpInput(ipPrefix), [ipPrefix]);

  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [offenders, setOffenders] = useState<Offender[]>([]);

  useEffect(() => {
    applyPageMeta({
      title: "Quote metrics | PlowWow admin",
      description: "PlowWow internal metrics dashboard for quote submission abuse and rate-limit trends.",
      path: "/admin/quote-metrics",
      noindex: true,
      ogImage: "https://plowwow.com/og-default.jpg",
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
      setIsAdmin(!!roleData);
      setChecking(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  const resolvedKinds = useMemo<string[] | null>(() => {
    if (kindFilter !== "all") return [kindFilter];
    if (outcome === "success") return ["ok"];
    if (outcome === "blocked") return BLOCKED_KINDS;
    return null;
  }, [outcome, kindFilter]);

  const load = useCallback(async () => {
    const hours = RANGES.find((r) => r.value === range)?.hours ?? 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    setLoading(true);
    try {
      const rpcArgs = {
        _since: since,
        _kinds: resolvedKinds,
        _email_domain: emailDomain || null,
        _ip_prefix: ipPrefix || null,
      };
      const [m, e, o] = await Promise.all([
        supabase.rpc("get_quote_request_event_metrics_v2", rpcArgs),
        supabase.rpc("list_quote_request_events_v2", { ...rpcArgs, _limit: 500 }),
        supabase.rpc("get_quote_request_offenders", { _since: since, _limit: 20 }),
      ]);
      if (m.error) throw m.error;
      if (e.error) throw e.error;
      if (o.error) throw o.error;
      setMetrics((m.data ?? []) as Metric[]);
      setEvents((e.data ?? []) as EventRow[]);
      setOffenders((o.data ?? []) as Offender[]);
    } catch (err) {
      toast({
        title: "Failed to load metrics",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [range, resolvedKinds, emailDomain, ipPrefix]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const denylistOffender = async (email: string | null, ip: string | null) => {
    const reason = window.prompt(`Denylist ${email ?? ""} ${ip ?? ""}?\nOptional reason:`, "spam");
    if (reason === null) return;
    const { error } = await supabase.rpc("add_quote_denylist", {
      _email: email ?? "",
      _ip: ip ?? "",
      _reason: reason,
    });
    if (error) toast({ title: "Denylist failed", description: error.message, variant: "destructive" });
    else toast({ title: "Denylisted", description: `${email ?? ""} ${ip ?? ""} added.` });
  };

  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const m of metrics) acc[m.kind] = (acc[m.kind] ?? 0) + Number(m.count);
    return acc;
  }, [metrics]);

  const chartData = useMemo(() => {
    type Row = { bucket: string; label: string; [k: string]: number | string };
    const byBucket = new Map<string, Row>();
    for (const m of metrics) {
      const key = m.bucket;
      const row = byBucket.get(key) ?? { bucket: key, label: "" };
      row[m.kind] = Number(m.count);
      byBucket.set(key, row);
    }
    const rows = [...byBucket.values()];
    rows.forEach((r) => {
      r.label = new Date(r.bucket).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit" });
    });
    rows.sort((a, b) => a.bucket.localeCompare(b.bucket));
    return rows;
  }, [metrics]);

  const kinds = useMemo(() => {
    const set = new Set<string>();
    metrics.forEach((m) => set.add(m.kind));
    return [...set];
  }, [metrics]);

  if (checking) return <main className="min-h-screen flex items-center justify-center">Loading…</main>;
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Access denied</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Your account does not have admin permissions.</p></CardContent>
        </Card>
      </main>
    );
  }

  const blockedTotal = BLOCKED_KINDS.reduce((s, k) => s + (totals[k] ?? 0), 0);

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Quote metrics</h1>
            <p className="text-sm text-muted-foreground">Rate-limit and spam signal trends for quote submissions.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/quote-denylist"><ShieldOff className="h-4 w-4" /> Denylist</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/quote-alerts"><Bell className="h-4 w-4" /> Alerts</Link></Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 grid gap-3 md:grid-cols-5">
            <div>
              <Label className="text-xs">Range</Label>
              <Select value={range} onValueChange={(v) => setParam({ range: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setParam({ outcome: v, kind: "all" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success only</SelectItem>
                  <SelectItem value="blocked">Blocked only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Event code</Label>
              <Select value={kindFilter} onValueChange={(v) => setParam({ kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any code</SelectItem>
                  {ALL_KINDS.map((k) => <SelectItem key={k} value={k}>{KIND_LABEL[k] ?? k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Email domain</Label>
              <form onSubmit={(e) => { e.preventDefault(); setParam({ domain: domainInput.trim().replace(/^@/, "") }); }}>
                <Input placeholder="e.g. gmail.com" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} />
              </form>
            </div>
            <div>
              <Label className="text-xs">IP prefix</Label>
              <form onSubmit={(e) => { e.preventDefault(); setParam({ ip: ipInput.trim() }); }}>
                <Input placeholder="e.g. 203.0.113" value={ipInput} onChange={(e) => setIpInput(e.target.value)} />
              </form>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Successful" value={totals.ok ?? 0} tone="ok" />
          <StatCard label="Blocked total" value={blockedTotal} tone="honeypot" />
          <StatCard label="Rate-limited" value={(totals.email_limit ?? 0) + (totals.ip_limit ?? 0) + (totals.burst_limit ?? 0)} tone="ip_limit" />
          <StatCard label="Honeypot / too fast" value={(totals.honeypot ?? 0) + (totals.too_fast ?? 0)} tone="too_fast" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Events over time</CardTitle></CardHeader>
          <CardContent className="h-[320px]">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No events in this range yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {kinds.map((k) => (
                    <Bar key={k} dataKey={k} stackId="a" fill={KIND_COLORS[k] ?? "hsl(0 0% 50%)"} name={KIND_LABEL[k] ?? k} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Top offenders</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Blocked</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offenders.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No blocked attempts in this range.</TableCell></TableRow>
                  )}
                  {offenders.map((o, i) => (
                    <TableRow key={`${o.email}-${o.ip}-${i}`}>
                      <TableCell className="text-xs">{o.email ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{o.ip ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{o.blocked_count}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="destructive" className="h-7 text-xs"
                          onClick={() => denylistOffender(o.email, o.ip)}>
                          Denylist
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent events</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No events yet.</TableCell></TableRow>
                  )}
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(ev.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={ev.kind === "ok" ? "outline" : "destructive"} className="text-[10px]">{KIND_LABEL[ev.kind] ?? ev.kind}</Badge></TableCell>
                      <TableCell className="text-xs">{ev.email ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{ev.ip ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: keyof typeof KIND_COLORS }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold mt-1" style={{ color: KIND_COLORS[tone] }}>{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
