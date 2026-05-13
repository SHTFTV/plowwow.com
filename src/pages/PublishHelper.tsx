import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Rocket, Save, Trash2 } from "lucide-react";

const STORAGE_KEY = "plowwow:liveUrl";

const PublishHelper = () => {
  const [liveUrl, setLiveUrl] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    setLiveUrl(saved);
    setDraft(saved);
  }, []);

  const normalize = (v: string) => {
    const t = v.trim();
    if (!t) return "";
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  };

  const save = () => {
    const url = normalize(draft);
    if (!url) {
      toast.error("Enter a URL first");
      return;
    }
    try {
      new URL(url);
    } catch {
      toast.error("That doesn't look like a valid URL");
      return;
    }
    localStorage.setItem(STORAGE_KEY, url);
    setLiveUrl(url);
    setDraft(url);
    toast.success("Live URL saved");
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLiveUrl("");
    setDraft("");
    toast("Cleared");
  };

  const copy = async () => {
    if (!liveUrl) return;
    await navigator.clipboard.writeText(liveUrl);
    toast.success("Copied to clipboard");
  };

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="container max-w-2xl">
        <div className="mb-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to site
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-black">Publish helper</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Quick reminder of how to publish, plus a place to stash your live URL.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">How to publish</CardTitle>
            <CardDescription>Publishing happens inside the Lovable editor — not from this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <Badge variant="secondary" className="mb-2">Desktop</Badge>
              <p className="text-muted-foreground">
                Click the <strong className="text-foreground">Publish</strong> button in the
                top-right of the Lovable editor → <strong className="text-foreground">Update</strong>.
              </p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Mobile</Badge>
              <p className="text-muted-foreground">
                Switch to Preview, tap the <strong className="text-foreground">…</strong> button
                in the bottom-right → <strong className="text-foreground">Publish</strong>.
              </p>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground">
                Frontend changes go live after you click Update. Backend changes (functions,
                database) deploy automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your live public URL</CardTitle>
            <CardDescription>
              Paste it here once published — we'll keep it on this device for quick copy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="url"
                placeholder="https://your-site.lovable.app"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                aria-label="Live public URL"
              />
              <Button onClick={save} className="sm:w-auto">
                <Save className="w-4 h-4 mr-2" /> Save
              </Button>
            </div>

            {liveUrl && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Saved URL
                </p>
                <p className="font-mono text-sm break-all mb-3">{liveUrl}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={copy}>
                    <Copy className="w-4 h-4 mr-2" /> Copy
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" /> Open
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clear}>
                    <Trash2 className="w-4 h-4 mr-2" /> Clear
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PublishHelper;
