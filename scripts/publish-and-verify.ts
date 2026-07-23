// Single command: wait for the freshly-triggered Lovable publish to land on
// plowwow.com, then run the live smoke test and print a pass/fail summary.
//
// This script does NOT trigger publish itself (the Lovable publish action is
// invoked from the chat UI or the preview_ui--publish tool). It:
//
//   1. Reads dist/asset-manifest.json → expected generatedAt hash.
//   2. Polls HOST/asset-manifest.json until its generatedAt matches (or timeout).
//   3. Re-fetches key URLs (/blog-index.json, /sitemap*.xml, sampled blog pages)
//      and prints a pass/fail table.
//   4. Exits non-zero on ANY failure so CI / the operator sees a red build.
//
// Usage:
//   bun run publish:verify                    # defaults to https://plowwow.com
//   HOST=https://staging.example.com bun run publish:verify
//   TIMEOUT_MS=300000 POLL_MS=8000 bun run publish:verify

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const HOST = (process.env.HOST ?? "https://plowwow.com").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 4 * 60 * 1000);
const POLL_MS = Number(process.env.POLL_MS ?? 6000);

const manifestPath = resolve("dist/asset-manifest.json");
if (!existsSync(manifestPath)) {
  console.error("✗ dist/asset-manifest.json missing — run `bun run build` first.");
  process.exit(1);
}
const local = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  generatedAt: string;
  assets: Record<string, { sha256: string }>;
};

console.log(`▶ publish:verify · host=${HOST} · expecting generatedAt=${local.generatedAt}`);
console.log(`  timeout=${Math.round(TIMEOUT_MS / 1000)}s · poll=${Math.round(POLL_MS / 1000)}s`);

const start = Date.now();
let liveManifest: typeof local | null = null;
let pollCount = 0;
let lastLiveGeneratedAt = "(none)";

while (Date.now() - start < TIMEOUT_MS) {
  pollCount += 1;
  try {
    const res = await fetch(`${HOST}/asset-manifest.json?t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const remote = (await res.json()) as typeof local;
      lastLiveGeneratedAt = remote.generatedAt;
      if (remote.generatedAt === local.generatedAt) {
        liveManifest = remote;
        break;
      }
    }
    process.stdout.write(
      `  poll #${pollCount} · live generatedAt=${lastLiveGeneratedAt} · waiting…\n`,
    );
  } catch (err) {
    process.stdout.write(`  poll #${pollCount} · fetch error: ${String(err).slice(0, 80)}\n`);
  }
  await new Promise((r) => setTimeout(r, POLL_MS));
}

if (!liveManifest) {
  console.error(
    `\n✗ Deploy did not appear within ${Math.round(TIMEOUT_MS / 1000)}s. Live generatedAt=${lastLiveGeneratedAt}, expected=${local.generatedAt}.`,
  );
  console.error(`  If the publish button was never clicked, click Publish and re-run.`);
  process.exit(1);
}
console.log(`✓ Live asset-manifest.json matches local build (generatedAt=${liveManifest.generatedAt}).`);

// ---------- Sha256 drift check on the critical assets ----------
const drift: string[] = [];
for (const [name, { sha256 }] of Object.entries(local.assets)) {
  const remote = liveManifest.assets[name];
  if (!remote) drift.push(`${name}: missing on live`);
  else if (remote.sha256 !== sha256) drift.push(`${name}: sha mismatch`);
}
if (drift.length) {
  console.error(`✗ Live asset hashes differ from local build:\n  - ${drift.join("\n  - ")}`);
  process.exit(1);
}
console.log(`✓ All ${Object.keys(local.assets).length} asset hashes match on live.`);

// ---------- Run the existing live smoke test ----------
console.log(`\n▶ Running scripts/verify-live-urls.ts against ${HOST}…\n`);
const child = spawnSync("bunx", ["tsx", "scripts/verify-live-urls.ts"], {
  stdio: "inherit",
  env: { ...process.env, HOST },
});
if (child.status !== 0) {
  console.error(`\n✗ verify-live-urls failed (exit ${child.status}).`);
  process.exit(child.status ?? 1);
}

// ---------- Focused re-fetch summary (blog-index.json + sample blog pages) ----------
console.log(`\n▶ Post-publish re-fetch summary:`);
type Row = { url: string; ok: boolean; detail: string };
const rows: Row[] = [];
const check = async (url: string, expect: (r: Response, body: string) => string | null) => {
  try {
    const r = await fetch(url, { cache: "no-store" });
    const body = await r.text();
    const failMsg = expect(r, body);
    rows.push({ url, ok: !failMsg, detail: failMsg ?? `HTTP ${r.status}` });
  } catch (err) {
    rows.push({ url, ok: false, detail: String(err) });
  }
};

await check(`${HOST}/blog-index.json`, (r, body) => {
  if (r.status !== 200) return `HTTP ${r.status}`;
  try {
    const j = JSON.parse(body);
    if (j.generatedAt !== local.generatedAt) return `stale generatedAt=${j.generatedAt}`;
    return null;
  } catch {
    return "invalid JSON";
  }
});
await check(`${HOST}/asset-manifest.json`, (r, body) => {
  if (r.status !== 200) return `HTTP ${r.status}`;
  const j = JSON.parse(body);
  return j.generatedAt === local.generatedAt ? null : `stale generatedAt=${j.generatedAt}`;
});

// Sample the top blog carousel slugs so we prove real content pages are live.
const idxLocal = JSON.parse(readFileSync(resolve("dist/blog-index.json"), "utf8")) as {
  carousel?: string[];
  posts?: Array<{ slug: string }>;
};
const sampleSlugs = (idxLocal.carousel?.slice(0, 4) ?? idxLocal.posts?.slice(0, 4).map((p) => p.slug) ?? []).filter(Boolean);
for (const slug of sampleSlugs) {
  await check(`${HOST}/${slug}/`, (r) => (r.status === 200 ? null : `HTTP ${r.status}`));
  await check(`${HOST}/blog/${slug}/`, (r) => (r.status === 200 ? null : `HTTP ${r.status}`));
}

const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - s.length));
const width = Math.max(...rows.map((r) => r.url.length), 20);
console.log(`  ${pad("URL", width)}  RESULT`);
console.log(`  ${"-".repeat(width)}  ${"-".repeat(20)}`);
for (const r of rows) {
  console.log(`  ${pad(r.url, width)}  ${r.ok ? "✓ PASS" : "✗ FAIL"}  ${r.detail}`);
}
const failed = rows.filter((r) => !r.ok);
console.log(
  `\n${failed.length ? "✗" : "✓"} Post-publish summary: ${rows.length - failed.length}/${rows.length} passing on ${HOST}`,
);
if (failed.length) process.exit(1);
