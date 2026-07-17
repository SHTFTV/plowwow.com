import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { applyPageMeta } from "@/lib/pageMeta";
import { RefreshCw, AlertTriangle, ExternalLink, Download } from "lucide-react";

function csvEscape(v: string | number) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

type Report = {
  generatedAt: string;
  totals: { posts: number; cities: number; orphanPosts: number; citiesWithoutPosts: number };
  orphanPosts: { slug: string; title: string }[];
  citiesWithoutPosts: { slug: string; name: string; path: string }[];
  cityPostCounts: { slug: string; name: string; count: number }[];
};

type Run = {
  id: string;
  ran_at: string;
  posts_total: number;
  orphan_posts_count: number;
  cities_without_posts_count: number;
  email_status: string | null;
};

export default function AdminLinkAudit() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    applyPageMeta({
      title: "Internal Link Audit | PlowWow Admin",
      description: "Internal-linking audit dashboard (admin only).",
      path: "/admin/link-audit",
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
      if (!role) return;
      loadEverything();
    })();
  }, [navigate]);

  async function loadEverything() {
    try {
      const r = await fetch("/link-audit.json", { cache: "no-store" });
      if (r.ok) setReport(await r.json());
    } catch { /* noop */ }
    const { data } = await supabase.from("link_audit_runs")
      .select("id, ran_at, posts_total, orphan_posts_count, cities_without_posts_count, email_status")
      .order("ran_at", { ascending: false }).limit(30);
    setRuns((data ?? []) as Run[]);
  }

  async function runNow() {
    setRunning(true);
    const { error } = await supabase.functions.invoke("nightly-link-audit");
    setRunning(false);
    if (error) {
      toast({ title: "Audit failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Audit complete", description: "Latest run stored." });
    loadEverything();
  }

  function exportCsv() {
    if (!report) {
      toast({ title: "No report yet", description: "Run the audit first.", variant: "destructive" });
      return;
    }
    const stamp = new Date(report.generatedAt || Date.now()).toISOString().replace(/[:.]/g, "-");
    const rows: (string | number)[][] = [];
    rows.push(["type", "slug", "name_or_title", "path", "post_count"]);
    for (const p of report.orphanPosts) rows.push(["orphan_post", p.slug, p.title, `/${p.slug}`, ""]);
    for (const c of report.citiesWithoutPosts) rows.push(["empty_city", c.slug, c.name, c.path, 0]);
    for (const c of report.cityPostCounts) rows.push(["city_post_count", c.slug, c.name, `/${c.slug}`, c.count]);
    downloadCsv(`link-audit-${stamp}.csv`, rows);
    toast({ title: "CSV exported", description: `${rows.length - 1} rows.` });
  }

  if (checking) return <div className="p-8">Checking access…</div>;
  if (!isAdmin) return <div className="p-8">Admin access required. <Link to="/auth" className="underline">Sign in</Link></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Internal Link Audit</h1>
            <p className="text-muted-foreground">Orphan neighborhood posts and city hubs missing cross-links.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild><Link to="/admin/gsc-coverage">GSC Coverage →</Link></Button>
            <Button variant="outline" onClick={exportCsv} disabled={!report}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={runNow} disabled={running}>
              <RefreshCw className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} />
              Run now
            </Button>
          </div>
        </div>

        {report && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Blog posts" value={report.totals.posts} />
            <Stat label="City hubs" value={report.totals.cities} />
            <Stat label="Orphan posts" value={report.totals.orphanPosts} bad={report.totals.orphanPosts > 0} />
            <Stat label="Empty cities" value={report.totals.citiesWithoutPosts} bad={report.totals.citiesWithoutPosts > 0} />
          </div>
        )}

        {report && report.orphanPosts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Orphan posts ({report.orphanPosts.length})</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Post slugs that don't match any city hub — they won't appear in city → neighborhood cross-links.</p>
              <ul className="space-y-1 text-sm">
                {report.orphanPosts.map((p) => (
                  <li key={p.slug} className="flex items-center gap-2">
                    <Badge variant="outline">{p.slug}</Badge>
                    <a href={`/${p.slug}`} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                      {p.title} <ExternalLink className="inline w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {report && report.citiesWithoutPosts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Cities without any neighborhood posts</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {report.citiesWithoutPosts.map((c) => (
                  <li key={c.slug}><a href={c.path} className="text-primary hover:underline" target="_blank" rel="noreferrer">{c.name}</a> — write at least one neighborhood post targeting this city.</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {report && (
          <Card>
            <CardHeader><CardTitle>Neighborhood posts per city</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>City</TableHead><TableHead className="text-right">Posts</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {report.cityPostCounts.map((c) => (
                    <TableRow key={c.slug}>
                      <TableCell><a className="text-primary hover:underline" href={`/${c.slug}`} target="_blank" rel="noreferrer">{c.name}</a></TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.count === 0 ? "destructive" : "secondary"}>{c.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Recent audit runs</CardTitle></CardHeader>
          <CardContent>
            {runs.length === 0 ? <p className="text-sm text-muted-foreground">No runs yet. Click "Run now" to store a first snapshot.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Ran at</TableHead><TableHead>Posts</TableHead><TableHead>Orphans</TableHead><TableHead>Empty cities</TableHead><TableHead>Email</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.ran_at).toLocaleString()}</TableCell>
                      <TableCell>{r.posts_total}</TableCell>
                      <TableCell>{r.orphan_posts_count}</TableCell>
                      <TableCell>{r.cities_without_posts_count}</TableCell>
                      <TableCell><Badge variant={r.email_status === "sent" ? "default" : "outline"}>{r.email_status ?? "-"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-black" style={{ color: bad ? "hsl(var(--destructive))" : undefined }}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
