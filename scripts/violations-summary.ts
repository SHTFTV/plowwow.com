// Emit a Markdown table describing seo-report/seo-diff-violations.json.
// Appended by CI to $GITHUB_STEP_SUMMARY so unapproved LocalBusiness /
// FAQPage changes are visible in the job summary with direct links to the
// exact snapshot files that changed.
//
// - No violations file? Prints a friendly "no data" line and exits 0.
// - No violations recorded? Prints a green "no unapproved changes" line.
// - Otherwise: prints a table (path · changed fields · snapshot links).
//
// Links resolve inside the uploaded `seo-structured-data-diff` artifact
// tree — reviewers download the artifact and open the referenced files.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), "seo-report", "seo-diff-violations.json");

if (!existsSync(path)) {
  console.log("## SEO structured-data diff\n\n_No `seo-diff-violations.json` produced (seo-report.ts likely did not run)._\n");
  process.exit(0);
}

type V = { path: string; fields: string[] };
type Doc = { allowlist?: string; allowedCount?: number; structuredChangeCount?: number; violationCount?: number; violations?: V[] };

let doc: Doc;
try {
  doc = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  console.log(`## SEO structured-data diff\n\n_Failed to parse violations file: ${(e as Error).message}_\n`);
  process.exit(0);
}

const violations = doc.violations ?? [];
const total = doc.structuredChangeCount ?? 0;
const allowed = doc.allowedCount ?? 0;

if (violations.length === 0) {
  console.log(
    `## SEO structured-data diff\n\n✅ **No unapproved LocalBusiness / FAQPage changes.**\n\n- Total structured-data changes vs. baseline: **${total}**\n- Allowlist entries: **${allowed}**\n`,
  );
  process.exit(0);
}

const sanitize = (p: string) => p.replace(/^\/+/, "").replace(/[\/]+/g, "__") || "root";

const lines: string[] = [];
lines.push(`## ❌ SEO structured-data diff — ${violations.length} unapproved change${violations.length === 1 ? "" : "s"}`);
lines.push("");
lines.push(
  `Total structured-data changes vs. baseline: **${total}** · Allowlist entries: **${allowed}** · Allowlist file: \`${doc.allowlist ?? "(unset)"}\``,
);
lines.push("");
lines.push("Add these paths to `seo-baseline-allow.json` (or regenerate the baseline with `bun run seo:baseline`) if the change is intentional.");
lines.push("");
lines.push("| Route | Changed fields | Snapshot files (in `seo-structured-data-diff` artifact) |");
lines.push("|---|---|---|");
for (const v of violations) {
  const dir = `seo-report/structured-data-snapshots/${sanitize(v.path)}`;
  const links = [
    `\`${dir}/before.json\``,
    `\`${dir}/after.json\``,
    `\`${dir}/changes.json\``,
    `\`${dir}/diff.png\``,
  ].join(" · ");
  lines.push(`| \`${v.path}\` | ${v.fields.map((f) => `\`${f}\``).join(", ")} | ${links} |`);
}
lines.push("");
lines.push("Download the **seo-structured-data-diff** artifact from this job to open the before/after JSON and PNG diffs.");
console.log(lines.join("\n"));
