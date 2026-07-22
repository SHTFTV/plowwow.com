// Lightweight snow-removal pricing estimator. Produces a live range shown
// on the city quote form. These are educated estimates, not binding quotes —
// the copy on the form makes that clear.

export type PropertyType =
  | "strata"
  | "commercial"
  | "residential"
  | "industrial"
  | "medical";

export type ServiceLevel = "seasonal" | "per-visit" | "de-icing-only";
export type PropertySize = "small" | "medium" | "large" | "xlarge";
export type Frequency = "as-needed" | "every-2cm" | "every-storm" | "24-7";

export type EstimatorInput = {
  propertyType: PropertyType;
  serviceLevel: ServiceLevel;
  propertySize: PropertySize;
  drivewayMeters: number; // 0 if N/A
  frequency: Frequency;
  avgSnowfallCm?: number; // from city deep-dive if available
};

// Base seasonal price (CAD) by property type.
const BASE_SEASONAL: Record<PropertyType, number> = {
  residential: 900,
  strata: 4200,
  commercial: 3800,
  industrial: 6500,
  medical: 7200,
};

// Multiplier by lot size.
const SIZE_MULT: Record<PropertySize, number> = {
  small: 1.0,
  medium: 1.35,
  large: 1.85,
  xlarge: 2.6,
};

// Frequency multiplier (higher trigger = more visits).
const FREQ_MULT: Record<Frequency, number> = {
  "as-needed": 0.85,
  "every-2cm": 1.0,
  "every-storm": 1.2,
  "24-7": 1.55,
};

// Per-visit rates (CAD) by property type.
const PER_VISIT: Record<PropertyType, number> = {
  residential: 85,
  strata: 340,
  commercial: 295,
  industrial: 520,
  medical: 620,
};

// De-icing-only pass rate (CAD).
const DEICE: Record<PropertyType, number> = {
  residential: 55,
  strata: 210,
  commercial: 180,
  industrial: 320,
  medical: 380,
};

export type Estimate = {
  low: number;
  high: number;
  unit: "season" | "visit" | "pass";
  visitsHint: string;
  breakdown: string[];
};

export function estimatePrice(input: EstimatorInput): Estimate {
  const {
    propertyType,
    serviceLevel,
    propertySize,
    drivewayMeters,
    frequency,
    avgSnowfallCm = 40,
  } = input;

  const breakdown: string[] = [];

  if (serviceLevel === "de-icing-only") {
    const base = DEICE[propertyType];
    const sized = base * SIZE_MULT[propertySize];
    breakdown.push(`Base de-icing pass: $${base}`);
    breakdown.push(`Size multiplier: ×${SIZE_MULT[propertySize]}`);
    return {
      low: Math.round(sized * 0.9),
      high: Math.round(sized * 1.2),
      unit: "pass",
      visitsHint: "priced per de-icing pass",
      breakdown,
    };
  }

  if (serviceLevel === "per-visit") {
    let base = PER_VISIT[propertyType] * SIZE_MULT[propertySize];
    if (drivewayMeters > 0) {
      const drivewayAdd = drivewayMeters * 1.2;
      base += drivewayAdd;
      breakdown.push(`Driveway length: +$${Math.round(drivewayAdd)}`);
    }
    breakdown.push(`Base per-visit: $${PER_VISIT[propertyType]}`);
    breakdown.push(`Size multiplier: ×${SIZE_MULT[propertySize]}`);
    return {
      low: Math.round(base * 0.9),
      high: Math.round(base * 1.25),
      unit: "visit",
      visitsHint: `≈ ${Math.max(3, Math.round(avgSnowfallCm / 5))} visits per typical season`,
      breakdown,
    };
  }

  // Seasonal contract
  let base =
    BASE_SEASONAL[propertyType] *
    SIZE_MULT[propertySize] *
    FREQ_MULT[frequency];
  breakdown.push(`Seasonal base: $${BASE_SEASONAL[propertyType]}`);
  breakdown.push(`Size multiplier: ×${SIZE_MULT[propertySize]}`);
  breakdown.push(`Frequency multiplier: ×${FREQ_MULT[frequency]}`);

  if (drivewayMeters > 0) {
    const drivewayAdd = drivewayMeters * 18;
    base += drivewayAdd;
    breakdown.push(`Driveway length allowance: +$${Math.round(drivewayAdd)}`);
  }

  // Local-snowfall adjustment: scale ±15% around 40cm baseline.
  const snowAdj = Math.max(0.85, Math.min(1.25, avgSnowfallCm / 40));
  base *= snowAdj;
  breakdown.push(`Local snowfall adjustment: ×${snowAdj.toFixed(2)}`);

  return {
    low: Math.round(base * 0.9 / 25) * 25,
    high: Math.round(base * 1.2 / 25) * 25,
    unit: "season",
    visitsHint: "billed as a full-season contract (Nov–Mar)",
    breakdown,
  };
}

export function formatEstimate(e: Estimate): string {
  const unit =
    e.unit === "season" ? "per season" : e.unit === "visit" ? "per visit" : "per pass";
  return `$${e.low.toLocaleString()} – $${e.high.toLocaleString()} ${unit}`;
}
