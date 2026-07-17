// Draft neighborhood entries used by the /admin/neighborhoods editor.
// Persisted to localStorage until exported to JSON and committed to the codebase.

export type NeighborhoodDraft = {
  slug: string;
  neighbourhood: string;
  parent_city: string;
  description: string;
  property_types: string[];
  terrain_note: string;
  nearby: string[];
  faqs: { q: string; a: string }[];
};

const KEY = "plowwow.neighborhoodDrafts.v1";

export function loadDrafts(): NeighborhoodDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as NeighborhoodDraft[]) : [];
  } catch {
    return [];
  }
}

export function saveDrafts(list: NeighborhoodDraft[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function validateDraft(d: Partial<NeighborhoodDraft>): string[] {
  const issues: string[] = [];
  if (!d.slug) issues.push("missing slug");
  if (!d.neighbourhood) issues.push("missing neighbourhood");
  if (!d.parent_city) issues.push("missing parent_city");
  if (!d.description || d.description.length < 80)
    issues.push("description should be at least 80 characters");
  if (!Array.isArray(d.property_types) || d.property_types.length === 0)
    issues.push("property_types must have at least one entry");
  if (!d.terrain_note) issues.push("missing terrain_note");
  if (!Array.isArray(d.nearby) || d.nearby.length < 2)
    issues.push("nearby should list at least two landmarks");
  if (!Array.isArray(d.faqs) || d.faqs.length < 3)
    issues.push("include at least 3 FAQ entries");
  return issues;
}

export function renderDraftPreview(d: NeighborhoodDraft): string {
  const faqs = (d.faqs || [])
    .map((f) => `### ${f.q}\n\n${f.a}`)
    .join("\n\n");
  const nearby = (d.nearby || []).map((n) => `- ${n}`).join("\n");
  const props = (d.property_types || []).join(", ");
  return `# ${d.neighbourhood} Snow Removal — ${d.parent_city}

${d.description}

## Property Types We Serve in ${d.neighbourhood}

${props}

## Terrain & Microclimate

${d.terrain_note}

## Landmarks & Corridors Nearby

${nearby}

## Frequently Asked Questions

${faqs}
`;
}
