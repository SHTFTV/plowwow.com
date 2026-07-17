import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loadSeoSettings, saveSeoSettings, type SeoSettings } from "@/lib/seoSettings";
import { toast } from "@/hooks/use-toast";

const PLACEHOLDER_SAMEAS = `https://www.facebook.com/plowwow
https://www.instagram.com/plowwow
https://www.linkedin.com/company/plowwow
https://www.yelp.com/biz/plowwow
https://homestars.com/companies/plowwow`;

const AdminSeoSettings = () => {
  const [settings, setSettings] = useState<SeoSettings>(loadSeoSettings());
  const [sameAsText, setSameAsText] = useState<string>(settings.sameAs.join("\n"));

  useEffect(() => {
    document.title = "SEO Settings | PlowWow Admin";
  }, []);

  const parsedSameAs = useMemo(
    () =>
      sameAsText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    [sameAsText],
  );

  const invalidUrls = parsedSameAs.filter((u) => !/^https?:\/\//i.test(u));

  const handleSave = () => {
    if (invalidUrls.length) {
      toast({
        title: "Fix invalid URLs first",
        description: `${invalidUrls.length} entries must start with https://`,
        variant: "destructive",
      });
      return;
    }
    const next: SeoSettings = { ...settings, sameAs: parsedSameAs };
    saveSeoSettings(next);
    setSettings(next);
    toast({ title: "Saved", description: "Applied across every city + neighborhood page." });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ ...settings, sameAs: parsedSameAs }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plowwow-seo-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container max-w-3xl py-16">
        <h1 className="text-3xl md:text-4xl font-black mb-2">SEO Settings</h1>
        <p className="text-muted-foreground mb-8">
          Enter your business identity values once — they'll be injected into every LocalBusiness /
          SnowRemovalService JSON-LD block across the site.
        </p>

        <section className="space-y-6 border rounded-2xl p-6 bg-card">
          <div>
            <Label htmlFor="rating">AggregateRating — ratingValue</Label>
            <Input
              id="rating"
              value={settings.ratingValue}
              onChange={(e) => setSettings({ ...settings, ratingValue: e.target.value })}
              placeholder="4.8"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Actual Google Business Profile rating (e.g. 4.8).</p>
          </div>

          <div>
            <Label htmlFor="count">AggregateRating — reviewCount</Label>
            <Input
              id="count"
              value={settings.reviewCount}
              onChange={(e) => setSettings({ ...settings, reviewCount: e.target.value })}
              placeholder="132"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Total review count from GBP.</p>
          </div>

          <div>
            <Label htmlFor="sameas">sameAs — one profile URL per line</Label>
            <Textarea
              id="sameas"
              value={sameAsText}
              onChange={(e) => setSameAsText(e.target.value)}
              placeholder={PLACEHOLDER_SAMEAS}
              rows={7}
              className="mt-2 font-mono text-sm"
            />
            {invalidUrls.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {invalidUrls.length} invalid URL{invalidUrls.length === 1 ? "" : "s"} — each must start with https://
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Facebook, Instagram, LinkedIn, Yelp, HomeStars, Google Business URL, etc.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSave}>Save & apply</Button>
            <Button variant="outline" onClick={handleExport}>
              Export JSON
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AdminSeoSettings;
