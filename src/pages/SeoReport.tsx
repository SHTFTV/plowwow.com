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
  const [query, setQuery] = useState("");

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyMismatches && r.match !== "MISMATCH") return false;
      if (!q) return true;
      return (
        r.city.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.canonical.toLowerCase().includes(q) ||
        r.ogUrl.toLowerCase().includes(q)
      );
    });
  }, [rows, onlyMismatches, query]);

  const visibleMismatches = visibleRows.filter((r) => r.match === "MISMATCH").length;
  const visibleOk = visibleRows.length - visibleMismatches;
  const totalMismatches = rows.filter((r) => r.match === "MISMATCH").length;

  const buildFilename = (ext: string, opts?: { filtered?: boolean; styled?: boolean }) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const parts = ["city-seo-report"];
    if (opts?.filtered) {
      parts.push("filtered");
      if (onlyMismatches) parts.push("mismatches");
      const q = query.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (q) parts.push(q);
    }
    if (opts?.styled) parts.push("styled");
    parts.push(stamp);
    return `${parts.filter(Boolean).join("-")}.${ext}`;
  };

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
        ["OK", rows.length - totalMismatches],
        ["MISMATCH", totalMismatches],
        ["Generated at", new Date().toISOString()],
        ["Origin", origin],
      ];
      const sws = XLSX.utils.aoa_to_sheet(summary);
      sws["!cols"] = [{ wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, sws, "Summary");

      XLSX.writeFile(wb, buildFilename("xlsx"));
    } finally {
      setDownloading(false);
    }
  };

  const handleExportCsv = () => {
    const header = ["City", "Slug", "Path", "Canonical URL", "og:url", "Match"];
    const escape = (v: string) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      header.join(","),
      ...visibleRows.map((r) =>
        [r.city, r.slug, r.path, r.canonical, r.ogUrl, r.match].map(escape).join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `city-seo-report-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportFilteredXlsx = () => {
    const autoFitCols = (rows2: (string | number)[][]) => {
      if (rows2.length === 0) return [];
      const colCount = rows2[0].length;
      return Array.from({ length: colCount }, (_, c) => {
        const max = Math.max(
          ...rows2.map((r) => String(r[c] ?? "").length),
        );
        return { wch: Math.min(Math.max(max + 2, 8), 60) };
      });
    };
    const boldHeader = (ws: XLSX.WorkSheet, colCount: number) => {
      for (let c = 0; c < colCount; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        const cell = ws[addr];
        if (cell) cell.s = { font: { bold: true } };
      }
    };

    const wb = XLSX.utils.book_new();
    const data: (string | number)[][] = [
      ["City", "Slug", "Path", "Canonical URL", "og:url", "Match"],
      ...visibleRows.map((r) => [r.city, r.slug, r.path, r.canonical, r.ogUrl, r.match]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = autoFitCols(data);
    boldHeader(ws, data[0].length);
    XLSX.utils.book_append_sheet(wb, ws, "Filtered Rows");

    const summary: (string | number)[][] = [
      ["Metric", "Value"],
      ["Visible routes", visibleRows.length],
      ["Visible OK", visibleOk],
      ["Visible MISMATCH", visibleMismatches],
      ["Total routes", rows.length],
      ["Total MISMATCH", totalMismatches],
      ["Filter query", query || "(none)"],
      ["Only mismatches", onlyMismatches ? "yes" : "no"],
      ["Generated at", new Date().toISOString()],
      ["Origin", origin],
    ];
    const sws = XLSX.utils.aoa_to_sheet(summary);
    sws["!cols"] = autoFitCols(summary);
    boldHeader(sws, summary[0].length);
    XLSX.utils.book_append_sheet(wb, sws, "Summary");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `city-seo-report-filtered-${stamp}.xlsx`);
  };

  const handleExportExcelJs = async () => {
    const { Workbook } = await import("exceljs");
    const wb = new Workbook();
    wb.creator = "PlowWow SEO Report";
    wb.created = new Date();

    const ws = wb.addWorksheet("Filtered Rows");
    ws.columns = [
      { header: "City", key: "city" },
      { header: "Slug", key: "slug" },
      { header: "Path", key: "path" },
      { header: "Canonical URL", key: "canonical" },
      { header: "og:url", key: "ogUrl" },
      { header: "Match", key: "match" },
    ];
    visibleRows.forEach((r) => ws.addRow(r));

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: "middle" };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    ws.columns.forEach((col) => {
      let max = (col.header as string).length;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? "").length;
        if (len > max) max = len;
      });
      col.width = Math.min(Math.max(max + 2, 8), 60);
    });

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const matchCell = row.getCell(6);
      if (matchCell.value === "MISMATCH") {
        matchCell.font = { color: { argb: "FFB91C1C" }, bold: true };
      } else {
        matchCell.font = { color: { argb: "FF16A34A" } };
      }
    });

    const sws = wb.addWorksheet("Summary");
    sws.columns = [
      { header: "Metric", key: "metric" },
      { header: "Value", key: "value" },
    ];
    const summary: [string, string | number][] = [
      ["Visible routes", visibleRows.length],
      ["Visible OK", visibleOk],
      ["Visible MISMATCH", visibleMismatches],
      ["Total routes", rows.length],
      ["Total MISMATCH", totalMismatches],
      ["Filter query", query || "(none)"],
      ["Only mismatches", onlyMismatches ? "yes" : "no"],
      ["Generated at", new Date().toISOString()],
      ["Origin", origin],
    ];
    summary.forEach((r) => sws.addRow(r));
    sws.getRow(1).font = { bold: true };
    sws.columns.forEach((col) => {
      let max = (col.header as string).length;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? "").length;
        if (len > max) max = len;
      });
      col.width = Math.min(Math.max(max + 2, 8), 60);
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    const parts = ["city-seo-report-filtered"];
    if (onlyMismatches) parts.push("mismatches");
    if (query.trim()) parts.push(query.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    parts.push("styled", stamp);
    a.download = `${parts.filter(Boolean).join("-")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          variant="outline"
          onClick={handleExportCsv}
          disabled={visibleRows.length === 0}
        >
          Export filtered CSV ({visibleRows.length})
        </Button>
        <Button
          variant="outline"
          onClick={handleExportFilteredXlsx}
          disabled={visibleRows.length === 0}
        >
          Export filtered XLSX ({visibleRows.length})
        </Button>
        <Button
          variant="outline"
          onClick={handleExportExcelJs}
          disabled={visibleRows.length === 0}
        >
          Export styled XLSX ({visibleRows.length})
        </Button>
        <Button
          variant={onlyMismatches ? "default" : "outline"}
          onClick={() => setOnlyMismatches((v) => !v)}
        >
          {onlyMismatches ? "Showing mismatches only" : "Show mismatches only"}
        </Button>
        <Input
          type="search"
          placeholder="Filter by city or path…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="text-sm text-muted-foreground">
          Showing {visibleRows.length} of {rows.length} routes ·{" "}
          <span className="text-green-600 font-medium">{visibleOk} OK</span> ·{" "}
          <span className={visibleMismatches > 0 ? "text-destructive font-medium" : ""}>
            {visibleMismatches} mismatches
          </span>
          {query && (
            <>
              {" "}· total {totalMismatches} mismatches
            </>
          )}
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
