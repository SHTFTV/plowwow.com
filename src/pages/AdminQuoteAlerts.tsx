import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Plus, Play } from "lucide-react";
import { applyPageMeta } from "@/lib/pageMeta";

const KIND_OPTIONS = ["honeypot","too_fast","email_limit","ip_limit","burst_limit","invalid","error","insert_error"];
const SLACK_WEBHOOK_RE = /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+$/;

function validateSlackWebhook(url: string): string | null {
  if (!url) return "Slack webhook URL is required when Slack is enabled.";
  let parsed: URL;
  try { parsed = new URL(url); } catch { return "Not a valid URL."; }
  if (parsed.protocol !== "https:") return "Slack webhook must use https://.";
  if (parsed.hostname !== "hooks.slack.com") return "Host must be hooks.slack.com.";
  if (!SLACK_WEBHOOK_RE.test(url)) return "Expected https://hooks.slack.com/services/T…/B…/… format.";
  return null;
}

type Cfg = {
  id: string;
  name: string;
  kinds: string[];
  threshold: number;
  window_minutes: number;
  notify_email: string;
  enabled: boolean;
  last_triggered_at: string | null;
  last_count: number | null;
  notify_email_enabled: boolean;
  notify_slack_enabled: boolean;
  slack_webhook_url: string | null;
  last_email_sent_at: string | null;
  last_slack_sent_at: string | null;
  last_email_error: string | null;
  last_slack_error: string | null;
};

export default function AdminQuoteAlerts() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Cfg[]>([]);
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState(10);
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [kinds, setKinds] = useState<string[]>(["honeypot","too_fast","email_limit","ip_limit","burst_limit"]);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackUrl, setSlackUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    applyPageMeta({ title: "Quote alerts | PlowWow admin", description: "Configure alerts for quote submission abuse spikes.", path: "/admin/quote-alerts", noindex: true });
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
    const { data, error } = await supabase.from("quote_alert_configs").select("*").order("created_at", { ascending: false });
    if (error) { toast({ title: "Load failed", description: error.message, variant: "destructive" }); return; }
    setRows((data ?? []) as unknown as Cfg[]);
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const slackUrlError = slackEnabled ? validateSlackWebhook(slackUrl) : null;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailEnabled && !slackEnabled) {
      toast({ title: "Pick at least one channel", variant: "destructive" }); return;
    }
    if (slackEnabled) {
      const err = validateSlackWebhook(slackUrl);
      if (err) { toast({ title: "Invalid Slack webhook", description: err, variant: "destructive" }); return; }
    }
    setSaving(true);
    const { error } = await supabase.from("quote_alert_configs").insert({
      name, kinds, threshold, window_minutes: windowMinutes,
      notify_email: notifyEmail || "unused@plowwow.com",
      notify_email_enabled: emailEnabled,
      notify_slack_enabled: slackEnabled,
      slack_webhook_url: slackEnabled ? slackUrl : null,
      enabled: true,
    });
    setSaving(false);
    if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
    setName(""); setNotifyEmail(""); setSlackUrl(""); setSlackEnabled(false);
    toast({ title: "Alert created" });
    load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("quote_alert_configs").update({ enabled }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    load();
  };

  const toggleChannel = async (id: string, field: "notify_email_enabled" | "notify_slack_enabled", value: boolean) => {
    const patch = field === "notify_email_enabled"
      ? { notify_email_enabled: value }
      : { notify_slack_enabled: value };
    const { error } = await supabase.from("quote_alert_configs").update(patch).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete alert?")) return;
    await supabase.from("quote_alert_configs").delete().eq("id", id);
    load();
  };

  const runNow = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("quote-alerts-check", { body: {} });
    setTesting(false);
    if (error) { toast({ title: "Check failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Checked", description: `${(data as { checked?: number })?.checked ?? 0} configs evaluated.` });
    load();
  };

  const toggleKind = (k: string) => setKinds((cur) => cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]);

  if (checking) return <main className="min-h-screen flex items-center justify-center">Loading…</main>;
  if (!isAdmin) return <main className="min-h-screen flex items-center justify-center">Access denied</main>;

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Spam alerts</h1>
            <p className="text-sm text-muted-foreground">Get an email when blocked-submission spikes cross your threshold.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={runNow} disabled={testing}><Play className="h-4 w-4" /> Run check now</Button>
            <Button variant="outline" asChild><Link to="/admin/quote-metrics"><ArrowLeft className="h-4 w-4" /> Metrics</Link></Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">New alert</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="space-y-4">
              <div className="grid md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Spike guard" /></div>
                <div><Label className="text-xs">Threshold</Label><Input required type="number" min={1} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /></div>
                <div><Label className="text-xs">Window (minutes)</Label><Input required type="number" min={1} value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))} /></div>
                <div className="flex items-end gap-4">
                  <div className="flex items-center gap-2"><Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} /><span className="text-xs">Email</span></div>
                  <div className="flex items-center gap-2"><Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} /><span className="text-xs">Slack</span></div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label className="text-xs">Notify email {emailEnabled ? "" : "(disabled)"}</Label><Input type="email" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} placeholder="alerts@plowwow.com" disabled={!emailEnabled} required={emailEnabled} /></div>
                <div>
                  <Label className="text-xs">Slack webhook URL {slackEnabled ? "" : "(disabled)"}</Label>
                  <Input
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
                    disabled={!slackEnabled}
                    required={slackEnabled}
                    aria-invalid={!!slackUrlError}
                    className={slackUrlError ? "border-destructive" : ""}
                  />
                  {slackUrlError && <p className="text-xs text-destructive mt-1">{slackUrlError}</p>}
                  {slackEnabled && !slackUrlError && slackUrl && <p className="text-xs text-muted-foreground mt-1">Looks valid.</p>}
                </div>
              </div>
              <div>
                <Label className="text-xs">Event kinds</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {KIND_OPTIONS.map((k) => (
                    <button key={k} type="button" onClick={() => toggleKind(k)}
                      className={`text-xs px-2 py-1 rounded border ${kinds.includes(k) ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={saving}><Plus className="h-4 w-4" /> Create alert</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Alerts ({rows.length})</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Threshold</TableHead><TableHead>Window</TableHead><TableHead>Kinds</TableHead><TableHead>Channels</TableHead><TableHead>Last triggered</TableHead><TableHead>Enabled</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No alerts configured.</TableCell></TableRow>}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{r.threshold}</TableCell>
                    <TableCell className="text-xs">{r.window_minutes}m</TableCell>
                    <TableCell className="text-xs">{r.kinds.join(", ")}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-2">
                          <Switch checked={r.notify_email_enabled} onCheckedChange={(v) => toggleChannel(r.id, "notify_email_enabled", v)} />
                          <span title={r.notify_email}>Email</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch checked={r.notify_slack_enabled} onCheckedChange={(v) => toggleChannel(r.id, "notify_slack_enabled", v)} disabled={!r.slack_webhook_url} />
                          <span title={r.slack_webhook_url ?? "no webhook set"}>Slack</span>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.last_triggered_at ? `${new Date(r.last_triggered_at).toLocaleString()} (${r.last_count})` : "—"}</TableCell>
                    <TableCell><Switch checked={r.enabled} onCheckedChange={(v) => toggle(r.id, v)} /></TableCell>
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
