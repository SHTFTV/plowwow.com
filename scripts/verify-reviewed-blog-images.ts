// These authored images were visually reviewed with exactly one Wow mascot.
// Builds must preserve their bytes: compositing onto a finished hero adds a
// second mascot. Update a hash only after reviewing an intentional replacement.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const reviewed = JSON.parse(readFileSync("scripts/reviewed-blog-images.json", "utf8")) as Record<string, string>;
for (const [slug, expected] of Object.entries(reviewed)) {
  const actual = createHash("sha256").update(readFileSync(`public/blog-images/${slug}.jpg`)).digest("hex");
  if (actual !== expected) throw new Error(`Reviewed hero changed: ${slug}. Inspect it for duplicate mascots before accepting it.`);
}
console.log(`✓ ${Object.keys(reviewed).length} reviewed single-mascot heroes preserved`);
