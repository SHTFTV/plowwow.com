import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { cities } from "@/data/cities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = {
  city: string;
  slug: string;
  path: string;
  canonical: string;
  ogUrl: string;
  match: "OK" | "MISMATCH";
};

const buildRows = (origin: string): Row[] => {
  const rows: Row[] = [];
  for (const c of cities) {
    for (const path of [`/${c.slug}`, `/${c.slug}/`]) {
      const normalized = `${origin}/${c.slug}`;
      const canonical = normalized;
      const ogUrl = normalized;
      rows.push({
        city: c.name,
        slug: c.slug,
        path,
        canonical,
        ogUrl,
        match: canonical === ogUrl ? "OK" : "MISMATCH",
      });
    }
  }
  return rows;
};

const SeoReport = () => {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://plowwow.com";
  const rows = useMemo(() => buildRows(origin), [origin]);
  const [downloading, setDownloading] = useState(false);
  const [onlyMismatches, setOnlyMismatches] = useState(false);

  const mismatches = rows.filter((r) => r.match === "MISMATCH").length;
  const okCount = rows.length - mismatches;
  const visibleRows = onlyMismatches
    ? rows.filter((r) => r.match === "MISMATCH")
    : rows;

  const handleDownload = () => {
    setDownloading(true);
    try {
      const wb = XLSX.utils.book_new();
      const data = [
        ["City", "Slug", "Path", "Canonical URL", "og:url", "Match"],
        ...rows.map((r) => [r.city, r.slug, r.path, r.canonical, r.ogUrl, r.match]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 18 },
        { wch: 22 },
        { wch: 48 },
        { wch: 48 },
        { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "City SEO Report");

      const summary = [
        ["Metric", "Value"],
        ["Total routes", rows.length],
        ["OK", rows.length - mismatches],
        ["MISMATCH", mismatches],
        ["Generated at", new Date().toISOString()],
        ["Origin", origin],
      ];
      const sws = XLSX.utils.aoa_to_sheet(summary);
      sws["!cols"] = [{ wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, sws, "Summary");

      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `city-seo-report-${stamp}.xlsx`);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    document.title = "City SEO Report — Canonical vs og:url";
    const meta = document.querySelector('meta[name="robots"]') ?? (() => {
      const m = document.createElement("meta");
      m.setAttribute("name", "robots");
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute("content", "noindex");
  }, []);

  return (
    <main className="container mx-auto px-4 py-12 max-w-6xl">

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">City SEO Report</h1>
        <p className="text-muted-foreground mt-2">
          Compares canonical and og:url tags across every city route (with and
          without trailing slash). Download the latest snapshot anytime.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Button onClick={handleDownload} disabled={downloading}>
          {downloading ? "Generating…" : "Download XLSX"}
        </Button>
        <Button
          variant={onlyMismatches ? "default" : "outline"}
          onClick={() => setOnlyMismatches((v) => !v)}
        >
          {onlyMismatches ? "Showing mismatches only" : "Show mismatches only"}
        </Button>
        <div className="text-sm text-muted-foreground">
          Showing {visibleRows.length} of {rows.length} routes ·{" "}
          <span className="text-green-600 font-medium">{okCount} OK</span> ·{" "}
          <span className={mismatches > 0 ? "text-destructive font-medium" : ""}>
            {mismatches} mismatches
          </span>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>City</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Canonical</TableHead>
              <TableHead>og:url</TableHead>
              <TableHead>Match</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.city}</TableCell>
                <TableCell className="font-mono text-xs">{r.path}</TableCell>
                <TableCell className="font-mono text-xs break-all">
                  {r.canonical}
                </TableCell>
                <TableCell className="font-mono text-xs break-all">
                  {r.ogUrl}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      r.match === "OK"
                        ? "text-green-600 font-medium"
                        : "text-destructive font-medium"
                    }
                  >
                    {r.match}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
};

export default SeoReport;
