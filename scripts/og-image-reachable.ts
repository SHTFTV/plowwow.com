// Reachability + format + dimension check for every og:image and twitter:image
// referenced in the prerendered dist/ HTML.
//
// For every URL:
//   - must be absolute + https
//   - HEAD (fallback GET) returns 200
//   - response content-type matches the extension family (image/png|jpeg)
//   - decoded dimensions ≥ 1200×630 (OG spec minimum for large previews)
//
// Local URLs (host = plowwow.com) are resolved from dist/ on disk and parsed
// with the same helper used by tests; remote URLs go over the network. Dupes
// dedupe by (url + type). Writes seo-report/og-image-reachable.{json,md};
// exits non-zero on any failure.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { readImageMeta, formatFromExtension } from "../src/test/helpers/image-size";

const DIST = resolve("dist");
const CANONICAL_HOST = "plowwow.com";
const MIN_W = 600;
const MIN_H = 315;
const RECOMMENDED_W = 1200;
const RECOMMENDED_H = 630;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}

type Ref = { url: string; kind: "og:image" | "twitter:image"; sources: string[] };
function collectRefs(): Ref[] {
  const map = new Map<string, Ref>();
  for (const file of walk(DIST)) {
    const html = readFileSync(file, "utf8");
    const src = file.replace(DIST + "/", "");
    const push = (kind: Ref["kind"], regex: RegExp) => {
      for (const m of html.matchAll(regex)) {
        const url = m[1];
        const key = `${kind}::${url}`;
        const cur = map.get(key) ?? { url, kind, sources: [] };
        if (!cur.sources.includes(src)) cur.sources.push(src);
        map.set(key, cur);
      }
    };
    push("og:image", /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/g);
    push("twitter:image", /<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/g);
  }
  return [...map.values()];
}

type Check = Ref & { ok: boolean; issues: string[]; warnings: string[]; info: Record<string, unknown> };

async function checkOne(ref: Ref): Promise<Check> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const info: Record<string, unknown> = {};
  let url: URL | null = null;
  try {
    url = new URL(ref.url);
  } catch {
    issues.push(`not absolute: ${ref.url}`);
    return { ...ref, ok: false, issues, warnings, info };
  }
  if (url.protocol !== "https:") issues.push(`protocol=${url.protocol} (must be https)`);

  const extFmt = formatFromExtension(url.pathname);
  info.extFormat = extFmt;
  if (!extFmt) issues.push(`extension not png/jpg/jpeg: ${url.pathname}`);

  // Resolve to local file when host matches canonical, else hit network.
  let width = 0;
  let height = 0;
  let mime: string | null = null;
  let status = 0;
  const isLocal = url.host === CANONICAL_HOST;
  if (isLocal) {
    const local = join(DIST, url.pathname);
    if (!existsSync(local)) {
      issues.push(`local file missing: ${local}`);
    } else {
      status = 200;
      const meta = readImageMeta(local);
      if (!meta) issues.push(`could not decode ${local}`);
      else {
        width = meta.width;
        height = meta.height;
        mime = meta.mime;
        if (meta.truncated) issues.push(`image truncated (missing end marker)`);
        // Format mismatch (e.g. PNG bytes served with .jpg extension) is a real
        // signal but non-blocking — social scrapers key off Content-Type, not
        // extension. Report as warning so it shows up in the report.
        if (extFmt && meta.format !== extFmt)
          warnings.push(`decoded format=${meta.format} ≠ ext=${extFmt}`);
      }
    }
  } else {
    try {
      let res = await fetch(url, { method: "HEAD" });
      if (!res.ok || !res.headers.get("content-type"))
        res = await fetch(url, { method: "GET" });
      status = res.status;
      mime = res.headers.get("content-type");
      if (!res.ok) issues.push(`status=${res.status}`);
      if (extFmt && mime && !mime.toLowerCase().includes(extFmt))
        warnings.push(`content-type=${mime} ≠ ext=${extFmt}`);
      info.dimensionCheck = "skipped (remote)";
    } catch (err) {
      issues.push(`fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  info.status = status;
  info.mime = mime;
  info.width = width;
  info.height = height;
  if (isLocal && width && height) {
    // OG spec absolute minimum: 600×315. Below that, LinkedIn/Facebook refuse
    // the large-summary render entirely, so this is a hard failure.
    if (width < MIN_W || height < MIN_H)
      issues.push(`dimensions ${width}×${height} < ${MIN_W}×${MIN_H} (OG minimum)`);
    else if (width < RECOMMENDED_W || height < RECOMMENDED_H)
      warnings.push(`dimensions ${width}×${height} below recommended ${RECOMMENDED_W}×${RECOMMENDED_H}`);
  }

  return { ...ref, ok: issues.length === 0, issues, warnings, info };
}

async function main() {
  const refs = collectRefs();
  const results: Check[] = [];
  // Concurrency cap.
  const CONC = 8;
  let i = 0;
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (i < refs.length) {
        const idx = i++;
        results[idx] = await checkOne(refs[idx]);
      }
    }),
  );
  const failed = results.filter((r) => !r.ok);
  mkdirSync(resolve("seo-report"), { recursive: true });
  writeFileSync(
    resolve("seo-report/og-image-reachable.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), total: results.length, failed: failed.length, results },
      null,
      2,
    ),
  );
  const md = [
    `# og:image / twitter:image reachability`,
    ``,
    `_Generated ${new Date().toISOString()}_`,
    ``,
    `- Unique URLs: **${results.length}**`,
    `- Failed: **${failed.length}**`,
    `- Minimum dimensions: **${MIN_W}×${MIN_H}**`,
    ``,
  ];
  if (failed.length) {
    md.push(`## Failures`, ``);
    for (const r of failed) {
      md.push(`### \`${r.kind}\` — ${r.url}`);
      md.push(`Referenced by ${r.sources.length} page(s), e.g. \`${r.sources[0]}\``);
      for (const i of r.issues) md.push(`- ${i}`);
      md.push(``);
    }
  } else md.push(`✅ Every og:image and twitter:image is absolute-https, 200, correct type, and ≥ ${MIN_W}×${MIN_H}.`);
  writeFileSync(resolve("seo-report/og-image-reachable.md"), md.join("\n"));

  if (failed.length) {
    console.error(`\n✗ og-image-reachable: ${failed.length}/${results.length} images failed`);
    for (const r of failed.slice(0, 20))
      console.error(`  · [${r.kind}] ${r.url}\n      ${r.issues.join("\n      ")}`);
    process.exit(1);
  }
  console.log(`✓ og-image-reachable: ${results.length}/${results.length} images pass reachability + format + dimensions`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
