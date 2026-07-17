import { useEffect, useRef, useState } from "react";
import { cities } from "@/data/cities";
import { legacyBlogSlugs, legacyPageSlugs } from "@/pages/LegacyPage";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type RouteResult = {
  path: string;
  status: "pending" | "ok" | "warn" | "error";
  count: number;
  types: string[];
  ids: string[];
  errors: string[];
  warnings: string[];
};

const STATIC_ROUTES = [
  "/",
  "/blog",
  "/locations",
  "/intelligence",
  "/advanced-technology",
  "/quote",
  "/guest-post",
  "/burnaby",
];

function buildRouteList(): string[] {
  const cityRoutes = cities.map((c) => `/${c.slug}`);
  const blogRoutes = legacyBlogSlugs.map((s) => `/${s}`);
  const pageRoutes = legacyPageSlugs.map((s) => `/${s}`);
  return Array.from(new Set([...STATIC_ROUTES, ...cityRoutes, ...blogRoutes, ...pageRoutes]));
}

function extractType(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const t = (node as Record<string, unknown>)["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

function validateBlock(json: unknown, warnings: string[], errors: string[], ids: string[], types: string[]) {
  if (!json || typeof json !== "object") {
    errors.push("Non-object JSON-LD");
    return;
  }
  const graph = (json as any)["@graph"];
  const nodes: unknown[] = Array.isArray(graph) ? graph : [json];
  for (const n of nodes) {
    const nType = extractType(n);
    types.push(...nType);
    const nObj = n as Record<string, unknown>;
    const id = nObj["@id"];
    if (typeof id === "string") ids.push(id);
    if (nType.includes("FAQPage")) {
      const me = nObj.mainEntity;
      if (!Array.isArray(me) || me.length === 0) errors.push("FAQPage: mainEntity missing");
    }
    if (nType.includes("LocalBusiness") || nType.includes("SnowRemovalService")) {
      if (!nObj.name) errors.push("LocalBusiness: missing name");
      if (!nObj.url) warnings.push("LocalBusiness: missing url");
      if (!nObj.telephone) warnings.push("LocalBusiness: missing telephone");
    }
    if (nType.includes("Article")) {
      if (!nObj.headline) errors.push("Article: missing headline");
      if (!nObj.author) warnings.push("Article: missing author");
    }
    if (nType.includes("BreadcrumbList")) {
      if (!Array.isArray(nObj.itemListElement) || (nObj.itemListElement as unknown[]).length < 2) {
        warnings.push("BreadcrumbList: itemListElement too short");
      }
    }
  }
}

async function validateRoute(path: string): Promise<RouteResult> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.width = "1024px";
    iframe.style.height = "800px";
    iframe.src = path;

    const result: RouteResult = {
      path,
      status: "pending",
      count: 0,
      types: [],
      ids: [],
      errors: [],
      warnings: [],
    };

    const finish = () => {
      try {
        document.body.removeChild(iframe);
      } catch {}
      if (result.errors.length) result.status = "error";
      else if (result.warnings.length) result.status = "warn";
      else result.status = "ok";
      resolve(result);
    };

    const timeout = window.setTimeout(() => {
      result.errors.push("Timeout loading route");
      finish();
    }, 8000);

    iframe.onload = () => {
      // Give effects a moment to inject JSON-LD.
      window.setTimeout(() => {
        window.clearTimeout(timeout);
        try {
          const doc = iframe.contentDocument;
          if (!doc) {
            result.errors.push("Cannot read iframe document");
            return finish();
          }
          const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
          result.count = scripts.length;
          if (scripts.length === 0) {
            result.warnings.push("No JSON-LD present");
          }
          scripts.forEach((s, i) => {
            const text = s.textContent || "";
            try {
              const parsed = JSON.parse(text);
              validateBlock(parsed, result.warnings, result.errors, result.ids, result.types);
            } catch (e) {
              result.errors.push(`Block ${i + 1}: invalid JSON`);
            }
          });
          // Uniqueness check
          const dupIds = result.ids.filter((id, i) => result.ids.indexOf(id) !== i);
          if (dupIds.length) result.errors.push(`Duplicate @id: ${dupIds.join(", ")}`);
        } catch (e) {
          result.errors.push(`Read failed: ${(e as Error).message}`);
        }
        finish();
      }, 800);
    };

    document.body.appendChild(iframe);
  });
}

export default function AdminJsonLdValidator() {
  const [routes] = useState(() => buildRouteList());
  const [results, setResults] = useState<RouteResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);

  useEffect(() => {
    document.title = "JSON-LD Validator | PlowWow Admin";
  }, []);

  const run = async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);
    cancelRef.current = false;
    const out: RouteResult[] = [];
    for (let i = 0; i < routes.length; i++) {
      if (cancelRef.current) break;
      const r = await validateRoute(routes[i]);
      out.push(r);
      setResults([...out]);
      setProgress(i + 1);
    }
    setRunning(false);
  };

  const summary = {
    ok: results.filter((r) => r.status === "ok").length,
    warn: results.filter((r) => r.status === "warn").length,
    error: results.filter((r) => r.status === "error").length,
  };

  const exportCsv = () => {
    const rows = [
      ["path", "status", "blocks", "types", "warnings", "errors"].join(","),
      ...results.map((r) =>
        [
          r.path,
          r.status,
          r.count,
          `"${Array.from(new Set(r.types)).join(";")}"`,
          `"${r.warnings.join(";").replace(/"/g, "'")}"`,
          `"${r.errors.join(";").replace(/"/g, "'")}"`,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `jsonld-validation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">JSON-LD Validator</h1>
        <p className="text-muted-foreground mb-6">
          Scans all {routes.length} routes, extracts <code>application/ld+json</code> blocks, and checks parsing,
          required fields (LocalBusiness / SnowRemovalService / FAQPage / Article / BreadcrumbList), and
          <code> @id</code> uniqueness per route.
        </p>

        <div className="flex flex-wrap gap-3 items-center mb-6">
          <Button onClick={run} disabled={running}>
            {running ? `Scanning ${progress}/${routes.length}…` : "Run validation"}
          </Button>
          {running && (
            <Button variant="outline" onClick={() => (cancelRef.current = true)}>
              Cancel
            </Button>
          )}
          {results.length > 0 && (
            <Button variant="outline" onClick={exportCsv}>
              Export CSV
            </Button>
          )}
          {results.length > 0 && (
            <div className="text-sm ml-auto">
              <span className="text-green-600 font-semibold">{summary.ok} OK</span>
              {" · "}
              <span className="text-amber-600 font-semibold">{summary.warn} warn</span>
              {" · "}
              <span className="text-red-600 font-semibold">{summary.error} error</span>
            </div>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Route</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Blocks</th>
                <th className="text-left p-3">Types</th>
                <th className="text-left p-3">Issues</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.path} className="border-t">
                  <td className="p-3 font-mono text-xs">
                    <a href={r.path} target="_blank" rel="noreferrer" className="hover:underline">
                      {r.path}
                    </a>
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        r.status === "ok"
                          ? "text-green-600"
                          : r.status === "warn"
                            ? "text-amber-600"
                            : "text-red-600"
                      }
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">{r.count}</td>
                  <td className="p-3 text-xs">{Array.from(new Set(r.types)).join(", ") || "—"}</td>
                  <td className="p-3 text-xs">
                    {r.errors.map((e, i) => (
                      <div key={`e${i}`} className="text-red-600">
                        ⛔ {e}
                      </div>
                    ))}
                    {r.warnings.map((w, i) => (
                      <div key={`w${i}`} className="text-amber-600">
                        ⚠ {w}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
              {results.length === 0 && !running && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Click "Run validation" to scan all routes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}
