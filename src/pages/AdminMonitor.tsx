import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { applyPageMeta } from "@/lib/pageMeta";

type Event = {
  id: string;
  kind: "asset_check" | "deploy_check" | "alert" | "redeploy_triggered";
  ok: boolean;
  path: string | null;
  http_status: number | null;
  details: Record<string, unknown>;
  created_at: string;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default function AdminMonitor() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    applyPageMeta({
      title: "Live Monitor · PlowWow Admin",
      description: "Blog index sync health, live-asset alerts, and deploy-check results.",
      path: "/admin/monitor",
      noindex: true,
    });
  }, []);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate("/auth", { replace: true }); return; }
      const { data: role } = await supabase.from("user_roles")
        .select("role").eq("user_id", sess.session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!role);
      setChecking(false);
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("monitor_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setEvents((data ?? []) as Event[]);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  const runCheckNow = async () => {
    setLoading(true);
    await supabase.functions.invoke("monitor-blog-index", { body: { source: "admin-manual" } });
    await load();
  };

  if (checking) return <div className="container py-16">Checking access…</div>;
  if (!isAdmin) return (
    <div className="container py-16">
      <p>Admin access required. <Link to="/" className="underline">Home</Link></p>
    </div>
  );

  const lastIndexOk = events.find((e) => e.kind === "asset_check" && e.path === "/blog-index.json" && e.ok);
  const recentAlerts = events.filter((e) => e.kind === "alert").slice(0, 20);
  const recentAssetFails = events.filter((e) => e.kind === "asset_check" && !e.ok).slice(0, 20);
  const lastDeployCheck = events.find((e) => e.kind === "deploy_check");
  const recentRedeploys = events.filter((e) => e.kind === "redeploy_triggered").slice(0, 10);

  const deployRows = (lastDeployCheck?.details?.rows as
    Array<{ url: string; status: number; ok: boolean; attempts?: number; note?: string }> | undefined) ?? [];

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Blog-index sync, live asset alerts, auto-redeploys, and post-publish checks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={runCheckNow} disabled={loading}>Run check now</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Last successful blog-index sync</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {lastIndexOk ? fmt(lastIndexOk.created_at) : "— no successful check on record"}
            </p>
            {lastIndexOk && <p className="text-xs text-muted-foreground mt-1">HTTP {lastIndexOk.http_status}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Last deploy-check</CardTitle></CardHeader>
          <CardContent>
            {lastDeployCheck ? (
              <>
                <p className="text-lg font-semibold">
                  <Badge variant={lastDeployCheck.ok ? "default" : "destructive"}>
                    {lastDeployCheck.ok ? "PASS" : "FAIL"}
                  </Badge>{" "}
                  <span className="ml-2">
                    {String((lastDeployCheck.details as { passed?: number }).passed ?? 0)}/
                    {String((lastDeployCheck.details as { total?: number }).total ?? 0)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{fmt(lastDeployCheck.created_at)} · {lastDeployCheck.path ?? "—"}</p>
              </>
            ) : <p className="text-sm text-muted-foreground">No deploy-check ingested yet. Run <code>bun run deploy:check</code> with MONITOR_INGEST_URL set.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Recent auto-redeploys</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{recentRedeploys.length}</p>
            {recentRedeploys[0] && (
              <p className="text-xs text-muted-foreground mt-1">Last: {fmt(recentRedeploys[0].created_at)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent 404 / timeout alerts</CardTitle></CardHeader>
        <CardContent>
          {recentAlerts.length === 0 && recentAssetFails.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts recorded. 🎉</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>When</TableHead><TableHead>Kind</TableHead>
                <TableHead>Path</TableHead><TableHead>HTTP</TableHead>
                <TableHead>Details</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {[...recentAssetFails, ...recentAlerts]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 30)
                  .map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmt(e.created_at)}</TableCell>
                      <TableCell><Badge variant="outline">{e.kind}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{e.path ?? "—"}</TableCell>
                      <TableCell>{e.http_status ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md truncate" title={JSON.stringify(e.details)}>
                        {JSON.stringify(e.details)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Last deploy-check row detail</CardTitle></CardHeader>
        <CardContent>
          {deployRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No row-level data.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>URL</TableHead><TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead><TableHead>Note</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {deployRows.map((r) => (
                  <TableRow key={r.url}>
                    <TableCell className="font-mono text-xs">{r.url}</TableCell>
                    <TableCell><Badge variant={r.ok ? "default" : "destructive"}>{r.status}</Badge></TableCell>
                    <TableCell>{r.attempts ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.note ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
