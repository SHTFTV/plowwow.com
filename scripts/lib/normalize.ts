// Deterministic serialization for LocalBusiness / FAQPage payloads.
// Sorts object keys recursively and trims surrounding whitespace on all
// strings so snapshots diff by *content* rather than by key insertion order
// or an accidental trailing space. Numbers, booleans, and nulls pass through.
//
// Also exposes canonicalStringify: JSON.stringify with sorted keys and a
// stable 2-space indent so the on-disk snapshot files (before.json /
// after.json) are byte-stable across runs.
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export function normalizeJson<T = JsonValue>(input: T): T {
  return _normalize(input as JsonValue) as unknown as T;
}

function _normalize(v: JsonValue): JsonValue {
  if (v === null) return null;
  if (Array.isArray(v)) return v.map(_normalize);
  if (typeof v === "object") {
    const out: Record<string, JsonValue> = {};
    for (const k of Object.keys(v).sort()) {
      out[k] = _normalize((v as Record<string, JsonValue>)[k]);
    }
    return out;
  }
  if (typeof v === "string") {
    // Trim leading/trailing whitespace and collapse internal runs of
    // whitespace (spaces, tabs, newlines) to a single space so incidental
    // reflows don't churn the snapshot.
    return v.trim().replace(/\s+/g, " ");
  }
  return v;
}

export function canonicalStringify(v: unknown): string {
  return JSON.stringify(normalizeJson(v as JsonValue), null, 2);
}
