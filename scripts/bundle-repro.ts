// Package a single "repro bundle" zip for one CI run.
//
// Contents:
//   - seo-report/hydration-sample.json     (seed, weights, sampled URLs)
//   - seo-report/*.json / *.md             (every validator output)
//   - seo-thresholds.json                  (active thresholds config)
//   - repro-metadata.json                  (git sha, run id, env, node/bun)
//
// Output: seo-report/repro-bundle.zip
//
// Uploads happen in the workflow; this script only assembles the file.

import { existsSync, readdirSync, writeFileSync, statSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";

const REPORT_DIR = resolve("seo-report");
const OUT = resolve(REPORT_DIR, "repro-bundle.zip");
const STAGE = resolve(REPORT_DIR, ".repro-stage");

mkdirSync(REPORT_DIR, { recursive: true });
if (existsSync(STAGE)) rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });

// Repro metadata — anything CI-reproducible we can grab cheaply.
function safeExec(cmd: string): string {
  try {
    const r = spawnSync(cmd, { shell: true, encoding: "utf8" });
    return (r.stdout ?? "").trim();
  } catch { return ""; }
}
const metadata = {
  generatedAt: new Date().toISOString(),
  git: {
    sha: process.env.GITHUB_SHA ?? safeExec("git rev-parse HEAD"),
    ref: process.env.GITHUB_REF ?? safeExec("git rev-parse --abbrev-ref HEAD"),
  },
  ci: {
    runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    workflow: process.env.GITHUB_WORKFLOW ?? null,
    repo: process.env.GITHUB_REPOSITORY ?? null,
    runUrl:
      process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null,
  },
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  seed: {
    HYDRATION_SEED: process.env.HYDRATION_SEED ?? null,
    SEO_BASELINE_MODE: process.env.SEO_BASELINE_MODE ?? null,
    SEO_HTTP_CACHE: process.env.SEO_HTTP_CACHE ?? null,
    SEO_BASELINE_LOCALE: process.env.SEO_BASELINE_LOCALE ?? null,
    SEO_BASELINE_VARIANT: process.env.SEO_BASELINE_VARIANT ?? null,
  },
};
writeFileSync(resolve(STAGE, "repro-metadata.json"), JSON.stringify(metadata, null, 2));

// Copy thresholds config (non-fatal if missing).
const thresholds = resolve("seo-thresholds.json");
if (existsSync(thresholds)) {
  
  copyFileSync(thresholds, resolve(STAGE, "seo-thresholds.json"));
}

// Copy every seo-report/*.{json,md} into stage/seo-report/ (skip the stage dir
// itself, the previous bundle, and http-cache/ which can be huge).
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = resolve(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (p === STAGE || entry === "http-cache" || entry === "baseline") continue;
      walk(p, out);
    } else {
      if (p === OUT) continue;
      if (/\.(json|md|txt)$/i.test(entry)) out.push(p);
    }
  }
  return out;
}
const reportStage = resolve(STAGE, "seo-report");
mkdirSync(reportStage, { recursive: true });
for (const f of walk(REPORT_DIR)) {
  const rel = relative(REPORT_DIR, f);
  const dst = resolve(reportStage, rel);
  mkdirSync(resolve(dst, ".."), { recursive: true });
  
  copyFileSync(f, dst);
}

// Emit zip — `zip` is preinstalled on ubuntu-latest runners.
if (existsSync(OUT)) rmSync(OUT);
const zip = spawnSync("zip", ["-qr", OUT, "."], { cwd: STAGE, stdio: "inherit" });
if (zip.status !== 0) {
  console.error("✗ repro-bundle: `zip` failed (status " + zip.status + "). Ensure zip is installed.");
  process.exit(1);
}

// Cleanup stage dir so subsequent artifact uploads don't double-count files.
rmSync(STAGE, { recursive: true, force: true });

const sizeKb = Math.round(statSync(OUT).size / 1024);
console.log(`✓ repro-bundle: ${OUT} (${sizeKb} KB) — run ${metadata.ci.runId ?? "local"}`);
