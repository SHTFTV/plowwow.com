import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { applyPageMeta } from "@/lib/pageMeta";

type Row = { id: string; email: string | null; ip: string | null; reason: string | null; created_at: string };

export default function AdminQuoteDenylist() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    applyPageMeta({ title: "Quote denylist | PlowWow admin", description: "Manage blocked emails and IP addresses.", path: "/admin/quote-denylist", noindex: true });
  }, []);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate("/auth", { replace: true }); return; }
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", sess.session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!roleData);
      setChecking(false);
    })();
  }, [navigate]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_quote_denylist");
    if (error) { toast({ title: "Load failed", description: error.message, variant: "destructive" }); return; }
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !ip) { toast({ title: "Provide email or IP", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.rpc("add_quote_denylist", { _email: email, _ip: ip, _reason: reason });
    setSaving(false);
    if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
    setEmail(""); setIp(""); setReason("");
    toast({ title: "Added to denylist" });
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this entry?")) return;
    const { error } = await supabase.rpc("remove_quote_denylist", { _id: id });
    if (error) { toast({ title: "Remove failed", description: error.message, variant: "destructive" }); return; }
    load();
  };

  if (checking) return <main className="min-h-screen flex items-center justify-center">Loading…</main>;
  if (!isAdmin) return <main className="min-h-screen flex items-center justify-center">Access denied</main>;

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Quote denylist</h1>
            <p className="text-sm text-muted-foreground">Emails and IPs blocked immediately by the submit-quote edge function.</p>
          </div>
          <Button variant="outline" asChild><Link to="/admin/quote-metrics"><ArrowLeft className="h-4 w-4" /> Metrics</Link></Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Add entry</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="grid md:grid-cols-4 gap-3 items-end">
              <div><Label className="text-xs">Email (optional)</Label><Input placeholder="spam@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label className="text-xs">IP (optional)</Label><Input placeholder="203.0.113.42" value={ip} onChange={(e) => setIp(e.target.value)} /></div>
              <div><Label className="text-xs">Reason</Label><Input placeholder="spam" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
              <Button type="submit" disabled={saving}><Plus className="h-4 w-4" /> Add</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Blocked entries ({rows.length})</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Email</TableHead><TableHead>IP</TableHead><TableHead>Reason</TableHead><TableHead>Added</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No blocked entries yet.</TableCell></TableRow>}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.ip ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.reason ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
