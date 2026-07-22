export type QuoteSummary = {
  quoteId: string | null;
  submittedAt: string;
  city: string;
  citySlug: string;
  province: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  propertyType: string;
  serviceLevel: string;
  propertySize: string;
  frequency: string;
  drivewayMeters: number;
  notes: string;
  estimate: {
    low: number;
    high: number;
    unit: string;
    visitsHint: string;
  };
  geocode: { lat: number; lon: number; formatted: string } | null;
  avgSnowfallCm: number | null;
};

const STORAGE_KEY = "plowwow.lastQuote";

export function readLastQuote(): QuoteSummary | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuoteSummary;
  } catch {
    return null;
  }
}

const humanize = (s: string) =>
  s
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export async function generateQuotePdf(q: QuoteSummary): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 56;

  // Header band
  doc.setFillColor(13, 42, 74); // brand navy
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("PlowWow Snow Removal", marginX, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Quote summary — 604-761-1518 · plowwow.com", marginX, 68);

  y = 120;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`${q.city}, ${q.province} — ${humanize(q.propertyType)}`, marginX, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const submitted = new Date(q.submittedAt).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(
    `Submitted ${submitted}${q.quoteId ? `  ·  Ref ${q.quoteId.slice(0, 8)}` : ""}`,
    marginX,
    y,
  );
  y += 24;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  const section = (title: string) => {
    doc.setTextColor(13, 42, 74);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title.toUpperCase(), marginX, y);
    y += 16;
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  };

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(value || "—", pageWidth - marginX - 180);
    doc.text(wrapped, marginX + 130, y);
    y += Math.max(16, wrapped.length * 14);
  };

  section("Contact");
  row("Name", q.name);
  row("Email", q.email);
  row("Phone", q.phone);
  y += 6;

  section("Property");
  row("Address", q.address);
  if (q.geocode?.formatted) row("Geocoded", q.geocode.formatted);
  if (q.geocode) row("Map pin", `${q.geocode.lat.toFixed(5)}, ${q.geocode.lon.toFixed(5)}`);
  row("City", `${q.city}, ${q.province}`);
  row("Property type", humanize(q.propertyType));
  y += 6;

  section("Estimator inputs");
  row("Service level", humanize(q.serviceLevel));
  row("Property size", humanize(q.propertySize));
  if (q.serviceLevel === "seasonal") row("Frequency", humanize(q.frequency));
  if (q.drivewayMeters > 0) row("Driveway length", `${q.drivewayMeters} m`);
  if (q.avgSnowfallCm) row("Local avg snowfall", `${q.avgSnowfallCm} cm/yr`);
  y += 6;

  // Price panel
  section("Live price range");
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, 60, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(13, 42, 74);
  const money = (n: number) =>
    n.toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    });
  doc.text(
    `${money(q.estimate.low)} – ${money(q.estimate.high)} ${q.estimate.unit}`,
    marginX + 14,
    y + 30,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(q.estimate.visitsHint, marginX + 14, y + 48);
  y += 74;

  if (q.notes) {
    section("Site notes");
    const wrapped = doc.splitTextToSize(q.notes, pageWidth - marginX * 2);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 14 + 8;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, footerY - 12, pageWidth - marginX, footerY - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Estimator ranges are informational. A route lead confirms the final scoped quote within one business day.",
    marginX,
    footerY,
  );
  doc.text(
    "PlowWow Snow Removal · 604-761-1518 · dispatch@plowwow.com · plowwow.com",
    marginX,
    footerY + 14,
  );

  return doc.output("blob");
}
