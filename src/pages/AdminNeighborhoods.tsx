import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  loadDrafts,
  renderDraftPreview,
  saveDrafts,
  validateDraft,
  type NeighborhoodDraft,
} from "@/lib/neighborhoodDrafts";
import { toast } from "@/hooks/use-toast";

const SAMPLE: NeighborhoodDraft[] = [
  {
    slug: "example-neighbourhood-city",
    neighbourhood: "Example Neighbourhood",
    parent_city: "Example City",
    description:
      "Two-paragraph, 80+ character description of the neighbourhood, its housing mix, and why it needs specialty snow-and-ice service.",
    property_types: ["Low-rise strata", "Townhome complexes", "Retail strip"],
    terrain_note: "Local elevation/microclimate detail — e.g. north-facing slopes refreeze after dusk.",
    nearby: ["Landmark Park", "Main Street corridor", "Central School"],
    faqs: [
      { q: "How fast can you respond?", a: "Dispatch triggers on 2 cm accumulation or forecast freezing rain." },
      { q: "Do you use pet-safe de-icer?", a: "Yes — magnesium chloride brine and CMA on lobby approaches." },
      { q: "What does a seasonal contract cost?", a: "Priced per frontage/parkade area; contact for a quote." },
    ],
  },
];

const AdminNeighborhoods = () => {
  const [drafts, setDrafts] = useState<NeighborhoodDraft[]>(() => {
    const saved = loadDrafts();
    return saved.length ? saved : SAMPLE;
  });
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(loadDrafts().length ? loadDrafts() : SAMPLE, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    document.title = "Neighborhood Editor | PlowWow Admin";
  }, []);

  const handleParse = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      setDrafts(list);
      setParseError(null);
      setSelected(0);
      toast({ title: "Parsed", description: `${list.length} entries loaded.` });
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  const handleSave = () => {
    saveDrafts(drafts);
    toast({ title: "Draft saved locally", description: `${drafts.length} entries.` });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      setDrafts(list);
      setSelected(0);
      setParseError(null);
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(drafts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plowwow-neighborhoods.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const current = drafts[selected];
  const issues = useMemo(() => (current ? validateDraft(current) : []), [current]);
  const preview = useMemo(() => (current ? renderDraftPreview(current) : ""), [current]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container max-w-6xl py-12">
        <h1 className="text-3xl md:text-4xl font-black mb-2">Neighborhood Editor</h1>
        <p className="text-muted-foreground mb-6">
          Paste or upload the per-neighborhood JSON, then preview each generated CityPage entry before publishing.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center px-4 py-2 rounded-md border cursor-pointer hover:bg-muted text-sm">
                Upload JSON
                <input type="file" accept="application/json,.json" className="hidden" onChange={handleUpload} />
              </label>
              <Button variant="outline" onClick={handleParse}>
                Parse
              </Button>
              <Button variant="outline" onClick={handleSave}>
                Save draft
              </Button>
              <Button onClick={handleExport}>Export JSON</Button>
            </div>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={22}
              className="font-mono text-xs"
            />
            {parseError && <p className="text-xs text-destructive">JSON error: {parseError}</p>}
          </div>

          <div className="space-y-3">
            {drafts.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {drafts.map((d, i) => (
                  <button
                    key={d.slug || i}
                    onClick={() => setSelected(i)}
                    className={`px-2.5 py-1 text-xs rounded border ${
                      i === selected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                    }`}
                  >
                    {d.neighbourhood || `#${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            {current && (
              <>
                <div className="border rounded-lg p-3 bg-card">
                  <p className="text-xs uppercase tracking-wider font-bold mb-2">
                    Validation
                  </p>
                  {issues.length === 0 ? (
                    <p className="text-sm text-emerald-600">✓ All required fields present.</p>
                  ) : (
                    <ul className="text-sm text-destructive list-disc pl-5 space-y-1">
                      {issues.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border rounded-lg p-4 bg-background max-h-[520px] overflow-auto">
                  <p className="text-xs uppercase tracking-wider font-bold mb-3">Preview (rendered markdown)</p>
                  <pre className="whitespace-pre-wrap text-sm font-sans">{preview}</pre>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminNeighborhoods;
