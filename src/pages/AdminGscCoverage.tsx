import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { applyPageMeta } from "@/lib/pageMeta";
import { RefreshCw } from "lucide-react";

type Snapshot = {
  id: string;
  captured_at: string;
  sitemaps_submitted: number;
  urls_submitted: number;
  urls_indexed: number;
  urls_discovered_not_indexed: number;
  urls_crawled_not_indexed: number;
  urls_excluded: number;
  errors: { url: string; reason: string }[];
};

export default function AdminGscCoverage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [latestLive, setLatestLive] = useState<any>(null);

  useEffect(() => {
    applyPageMeta({
      title: "GSC Coverage | PlowWow Admin",
      description: "Google Search Console indexing coverage (admin only).",
      path: "/admin/gsc-coverage",
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
      if (role) loadSnapshots();
    })();
  }, [navigate]);

  async function loadSnapshots() {
    const { data } = await supabase.from("gsc_coverage_snapshots")
      .select("*").order("captured_at", { ascending: false }).limit(30);
    setSnapshots((data ?? []) as unknown as Snapshot[]);
  }

  async function refresh() {
    setRefreshing(true);
    const { data, error } = await supabase.functions.invoke("gsc-coverage");
    setRefreshing(false);
    if (error) {
      toast({ title: "GSC fetch failed", description: error.message, variant: "destructive" });
      return;
    }
    setLatestLive(data);
    toast({ title: "Snapshot captured" });
    loadSnapshots();
  }

  if (checking) return <div className="p-8">Checking access…</div>;
  if (!isAdmin) return <div className="p-8">Admin access required.</div>;

  const latest = snapshots[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">GSC Coverage</h1>
            <p className="text-muted-foreground">Google Search Console indexing snapshots for plowwow.com.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/admin/link-audit">← Link Audit</Link></Button>
            <Button onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Fetch now
            </Button>
          </div>
        </div>

        {latest && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Sample size" value={latest.urls_submitted} />
            <Stat label="Indexed" value={latest.urls_indexed} good />
            <Stat label="Discovered — not indexed" value={latest.urls_discovered_not_indexed} bad={latest.urls_discovered_not_indexed > 0} />
            <Stat label="Crawled — not indexed" value={latest.urls_crawled_not_indexed} bad={latest.urls_crawled_not_indexed > 0} />
          </div>
        )}

        {latest && normalizeErrors(latest.errors).length > 0 && (
          <Card>
            <CardHeader><CardTitle>Latest errors</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {normalizeErrors(latest.errors).map((e, i) => (
                  <li key={i}><Badge variant="destructive" className="mr-2">{e.reason}</Badge>{e.url}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Coverage trend</CardTitle></CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No snapshots yet. Click "Fetch now" — this calls Google Search Console via the connector.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Captured</TableHead><TableHead>Sample</TableHead><TableHead>Indexed</TableHead><TableHead>Discovered</TableHead><TableHead>Crawled</TableHead><TableHead>Excluded</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {snapshots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{new Date(s.captured_at).toLocaleString()}</TableCell>
                      <TableCell>{s.urls_submitted}</TableCell>
                      <TableCell><Badge variant="default">{s.urls_indexed}</Badge></TableCell>
                      <TableCell>{s.urls_discovered_not_indexed}</TableCell>
                      <TableCell>{s.urls_crawled_not_indexed}</TableCell>
                      <TableCell>{s.urls_excluded}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {latestLive && (
          <Card>
            <CardHeader><CardTitle>Latest live inspection sample</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto bg-muted p-3 rounded max-h-96">{JSON.stringify(latestLive.inspections, null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, bad, good }: { label: string; value: number; bad?: boolean; good?: boolean }) {
  const color = bad ? "hsl(var(--destructive))" : good ? "hsl(var(--primary))" : undefined;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-black" style={{ color }}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
