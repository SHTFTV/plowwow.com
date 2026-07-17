// Package a single "repro bundle" zip for one CI run, or replay a stored one.
//
// Default mode (assemble): produce seo-report/repro-bundle.zip containing
//   - seo-report/hydration-sample.json     (seed, weights, sampled URLs)
//   - seo-report/*.json / *.md             (every validator output)
//   - seo-report/validation-report.html    (HTML review, generated inline)
//   - seo-thresholds.json                  (active thresholds config)
//   - repro-metadata.json                  (git sha, run id, env, node/bun)
//
// Replay mode (--bundle=<path-to-zip>):
//   - Extract the zip into seo-report/.repro-replay-<basename>/
//   - Re-run hydration-check via the stored hydration-sample.json (replay)
//   - Re-run baseline diff, honoring recorded HYDRATION_SEED /
//     SEO_BASELINE_LOCALE / SEO_BASELINE_VARIANT env from repro-metadata.json
//   - Writes seo-report/repro-replay.md summarizing before/after
//
// Uploads happen in the workflow; this script assembles or replays.

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { resolve, relative, basename } from "node:path";
import { spawnSync } from "node:child_process";

const REPORT_DIR = resolve("seo-report");
const OUT = resolve(REPORT_DIR, "repro-bundle.zip");

function argVal(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") || undefined : undefined;
}

// ---------------------------------------------------------------- Replay mode
const bundlePath = argVal("bundle");
if (bundlePath) {
  const abs = resolve(bundlePath);
  if (!existsSync(abs)) {
    console.error(`✗ repro-bundle replay: file not found: ${abs}`);
    process.exit(1);
  }
  mkdirSync(REPORT_DIR, { recursive: true });
  const extractDir = resolve(REPORT_DIR, `.repro-replay-${basename(abs).replace(/\.zip$/i, "")}`);
  if (existsSync(extractDir)) rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });

  const unzip = spawnSync("unzip", ["-oq", abs, "-d", extractDir], { stdio: "inherit" });
  if (unzip.status !== 0) {
    console.error(`✗ repro-bundle replay: unzip failed (status ${unzip.status})`);
    process.exit(1);
  }

  // Locate the payload files inside the extracted tree.
  const samplePath = ["seo-report/hydration-sample.json", "hydration-sample.json"]
    .map((p) => resolve(extractDir, p)).find((p) => existsSync(p));
  const metaPath = ["repro-metadata.json", "seo-report/repro-metadata.json"]
    .map((p) => resolve(extractDir, p)).find((p) => existsSync(p));

  const meta = metaPath ? JSON.parse(readFileSync(metaPath, "utf8")) as {
    seed?: { HYDRATION_SEED?: string | null; SEO_BASELINE_LOCALE?: string | null; SEO_BASELINE_VARIANT?: string | null };
    git?: { sha?: string; ref?: string }; ci?: { runUrl?: string | null };
  } : null;

  const replayEnv = { ...process.env };
  if (meta?.seed?.HYDRATION_SEED) replayEnv.HYDRATION_SEED = meta.seed.HYDRATION_SEED;
  if (meta?.seed?.SEO_BASELINE_LOCALE) replayEnv.SEO_BASELINE_LOCALE = meta.seed.SEO_BASELINE_LOCALE;
  if (meta?.seed?.SEO_BASELINE_VARIANT) replayEnv.SEO_BASELINE_VARIANT = meta.seed.SEO_BASELINE_VARIANT;

  const summary: string[] = [
    `# Repro Bundle Replay`,
    ``,
    `Source: \`${bundlePath}\``,
    meta?.git?.sha ? `Origin commit: \`${meta.git.sha.slice(0, 7)}\`${meta.git.ref ? ` (${meta.git.ref})` : ""}` : "",
    meta?.ci?.runUrl ? `Origin CI run: ${meta.ci.runUrl}` : "",
    ``,
  ];

  // 1. Hydration replay (only if a sample was recorded and dist/ exists).
  if (samplePath && existsSync(resolve("dist"))) {
    console.log(`▶ replay: hydration-check via ${relative(process.cwd(), samplePath)}`);
    const r = spawnSync("bunx", ["tsx", "scripts/hydration-check.ts", `--replay=${samplePath}`], {
      stdio: "inherit", env: replayEnv,
    });
    summary.push(`## Hydration replay`, r.status === 0 ? `- ✓ hydration-check passed` : `- ✗ hydration-check exited ${r.status}`, ``);
  } else {
    summary.push(`## Hydration replay`, samplePath ? `- ⚠ skipped: no local \`dist/\` to serve` : `- ⚠ skipped: bundle has no hydration-sample.json`, ``);
  }

  // 2. Baseline diff using recorded locale/variant filter.
  console.log(`▶ replay: baseline diff`);
  const diffArgs = ["tsx", "scripts/lib/baseline.ts", "diff"];
  if (replayEnv.SEO_BASELINE_LOCALE) diffArgs.push(`--locale=${replayEnv.SEO_BASELINE_LOCALE}`);
  if (replayEnv.SEO_BASELINE_VARIANT) diffArgs.push(`--variant=${replayEnv.SEO_BASELINE_VARIANT}`);
  const bd = spawnSync("bunx", diffArgs, { stdio: "inherit", env: replayEnv });
  summary.push(`## Baseline diff`, bd.status === 0 ? `- ✓ diff completed` : `- ✗ diff exited ${bd.status}`, ``);

  writeFileSync(resolve(REPORT_DIR, "repro-replay.md"), summary.filter(Boolean).join("\n"));
  console.log(`✓ replay complete → seo-report/repro-replay.md (extract kept at ${relative(process.cwd(), extractDir)})`);
  process.exit(0);
}

// ---------------------------------------------------------------- Assemble mode
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

// Also drop metadata into the top of the seo-report tree so the HTML report
// generator can pick it up on replay after extraction.
writeFileSync(resolve(REPORT_DIR, "repro-metadata.json"), JSON.stringify(metadata, null, 2));

// Generate the HTML validation report inline so it always matches the JSON
// artifacts being zipped. Non-fatal if the generator fails.
const htmlGen = spawnSync("bunx", ["tsx", "scripts/generate-html-report.ts"], { stdio: "inherit" });
if (htmlGen.status !== 0) {
  console.warn(`⚠ repro-bundle: HTML report generation failed (status ${htmlGen.status}); continuing.`);
}

// Copy thresholds config (non-fatal if missing).
const thresholds = resolve("seo-thresholds.json");
if (existsSync(thresholds)) {
  copyFileSync(thresholds, resolve(STAGE, "seo-thresholds.json"));
}

// Copy every seo-report/*.{json,md,html} into stage/seo-report/ (skip the stage
// dir itself, the previous bundle, and http-cache/ which can be huge).
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = resolve(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (p === STAGE || entry === "http-cache" || entry === "baseline") continue;
      walk(p, out);
    } else {
      if (p === OUT) continue;
      if (/\.(json|md|txt|html)$/i.test(entry)) out.push(p);
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
