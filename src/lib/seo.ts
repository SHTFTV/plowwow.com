/**
 * Truncate a string to <= `max` characters at a clean word boundary.
 * - If the input fits, it is returned unchanged.
 * - Otherwise it is cut at the last sensible break (space, em-dash, or hyphen)
 *   inside the budget and an ellipsis ("…") is appended.
 * - Trailing punctuation/whitespace before the ellipsis is stripped so the
 *   result never reads like a mid-sentence cut (e.g. "foo,…").
 */
export function truncateForMeta(text: string, max = 155): string {
  if (text.length <= max) return text;
  const room = max - 1; // reserve one char for "…"
  const slice = text.slice(0, room);
  const lastBreak = Math.max(
    slice.lastIndexOf(" "),
    slice.lastIndexOf("—"),
    slice.lastIndexOf("-"),
  );
  const cut = lastBreak > 80 ? slice.slice(0, lastBreak) : slice;
  return `${cut.replace(/[\s,;:.\-—]+$/, "")}…`;
}
