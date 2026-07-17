# PlowWow

Snow removal & de-icing website for Greater Vancouver.

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

Output goes to `dist/`. Deploy that directory to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

## SEO validators

The build runs a chain of SEO validators that write results to `seo-report/`.
Every run produces:

- `seo-report/validation-report.html` — self-contained human-readable report
  (uploaded to CI as the `validation-report-html` artifact — open directly in
  the browser without unzipping).
- `seo-report/repro-bundle.zip` — full reproducer bundle (uploaded as the
  `repro-bundle` artifact).
- `seo-report/pr-comment.md` — the PR-comment body (includes per-category
  **annotation cap skipped counts** so you can see exactly what got omitted).

### GitHub Actions annotations — `scripts/gh-annotations.ts`

Emits `::error` / `::warning` workflow commands so failing legacy redirects,
hydration checks, robots directives, and JSON-LD findings appear as clickable
annotations in the Checks UI.

**CLI options:**

| Flag                | Env fallback              | Purpose                                                 |
| ------------------- | ------------------------- | ------------------------------------------------------- |
| `--locale=<code>`   | `SEO_BASELINE_LOCALE`     | Filter legacy-redirect annotations by locale (e.g. `fr`) |
| `--variant=<name>`  | `SEO_BASELINE_VARIANT`    | Filter by page variant (e.g. `city`, `blog`)             |
| `--max=<n>`         | `SEO_ANNOTATIONS_TOP`     | Global cap per category (default: **20**)                |
| `--max-legacy=<n>`  | `SEO_ANN_MAX_LEGACY`      | Cap for legacy-redirect annotations                      |
| `--max-hydration=<n>` | `SEO_ANN_MAX_HYDRATION` | Cap for hydration annotations                            |
| `--max-robots=<n>`  | `SEO_ANN_MAX_ROBOTS`      | Cap for robots.txt annotations                           |
| `--max-jsonld=<n>`  | `SEO_ANN_MAX_JSONLD`      | Cap for JSON-LD annotations                              |
| `--config=<path>`   | `SEO_ANN_CONFIG`          | Load defaults from a JSON config file (default: `./seo-annotations.config.json`) |
| `--fail-on-skipped` | `SEO_ANN_FAIL_ON_SKIPPED=1` | Exit non-zero when skipped counts exceed `failOnSkipped` limits |

**Precedence:** CLI flag > env var > config file > built-in default.

**Config file (`seo-annotations.config.json`):**

```jsonc
{
  "caps":   { "default": 20, "legacy": 20, "hydration": 20, "robots": 20, "jsonLd": 20 },
  "filter": { "locale": "en-CA", "variant": "blog" },
  "failOnSkipped": {
    "legacy": 50, "hydration": 50, "robots": 20, "jsonLd": 20, "total": 100
  }
}
```

Per-category / total limits can also be set with `SEO_ANN_FAIL_ON_SKIPPED_{LEGACY,HYDRATION,ROBOTS,JSONLD,TOTAL}`.

**Examples:**

```bash
# Only show French-locale legacy redirect regressions
bunx tsx scripts/gh-annotations.ts --locale=fr

# Cap noisy hydration + JSON-LD output while keeping legacy at default
bunx tsx scripts/gh-annotations.ts --max-hydration=5 --max-jsonld=5

# Everything scoped to blog variant, 3 per category
bunx tsx scripts/gh-annotations.ts --variant=blog --max=3

# Fail CI if per-category caps hide too many findings
bunx tsx scripts/gh-annotations.ts --fail-on-skipped
```

Any failures skipped by the caps are counted in
`seo-report/annotation-skipped.json`, rendered in the PR comment under
**"Annotation caps"**, and shown in the HTML report's **"Skipped by caps"**
section.

#### Generated artifacts + advanced flags

Run `bunx tsx scripts/gh-annotations.ts --help` for the full list; the flags
below need a bit more explanation.

| Flag | Purpose |
| ---- | ------- |
| `--artifacts-dir=<path>` (env `SEO_ANN_ARTIFACTS_DIR`) | Override the output directory for the artifacts listed below. Defaults to `seo-report/`. |
| `--print-regression-thresholds` | Print severity bands (minor/major/critical, as `deltaPercent`) to stdout as a `::notice` line. |
| `--print-regression-thresholds-format=csv,json` | Also write `regression-thresholds.csv` and/or `regression-thresholds.json` into `--artifacts-dir`. CSV columns: `category,minor,major,critical,source`. |
| `--fail-on-regression-thresholds-config=<path>` (env `SEO_ANN_REGRESSION_THRESHOLDS_CONFIG`) | Load per-category minor/major/critical bands from JSON. See schema below. |
| `--schema-error-report[=<path>]` | Write `schema-drift-errors.json` (default location: `--artifacts-dir/schema-drift-errors.json`). |
| `--schema-error-report-format=csv` | Also write `schema-drift-errors.csv` alongside the JSON. |
| `--schema-error-report-max-errors=<N>` (env `SEO_ANN_SCHEMA_ERROR_MAX`) | Cap rows written to both JSON and CSV. JSON adds `{ totalCount, truncated, maxErrors }`; a `::warning` is emitted if truncated. |
| `--plan-category-include=<cats>` / `--plan-category-exclude=<cats>` | Restrict/filter PR tables + CSV outputs to specific categories (`legacy,hydration,jsonLd,robots`). Overlapping include/exclude values exit `2` with a clear error. |

**Artifact filenames** (all in `--artifacts-dir`, defaulting to `seo-report/`):

- `regression-thresholds.csv` — spreadsheet of resolved severity bands per category.
- `regression-thresholds.json` — same data plus source (`config`/`default`/`builtin`) and the config file path when loaded.
- `schema-drift-errors.json` — structured sample-config drift with `path`, `keyword`, `expected`, `actual`, `snippet`.
- `schema-drift-errors.csv` — same fields as CSV rows.

The PR comment auto-links `regression-thresholds.csv` / `.json` whenever
`--print-regression-thresholds-format` writes them.

**`--fail-on-regression-thresholds-config` JSON schema:**

```jsonc
{
  // Optional; used when a category has no override. Falls back to
  // built-in { minor: 1, major: 25, critical: 50 } when omitted.
  "default":   { "minor": 1, "major": 25, "critical": 50 },
  "legacy":    { "minor": 2 },        // inherits major/critical from default
  "hydration": { "critical": 40 },
  "jsonLd":    { "minor": 5, "major": 15, "critical": 30 },
  "robots":    { "minor": 1, "major": 10, "critical": 25 }
}
```

Rules: keys must be `default`, `legacy`, `hydration`, `jsonLd`, or `robots`;
each value is an object of `{ minor, major, critical }` non-negative finite
numbers (percent). Missing bands inherit from `default`, then built-ins.
Invalid shapes exit `2` with an actionable message.

**Additional examples:**

```bash
# Print + persist the severity bands used by --fail-on-regression-severity
bunx tsx scripts/gh-annotations.ts \
  --print-regression-thresholds \
  --print-regression-thresholds-format=csv,json

# Use a custom bands config and route artifacts to a per-run dir
bunx tsx scripts/gh-annotations.ts \
  --artifacts-dir=out/ci-run-42 \
  --fail-on-regression-thresholds-config=./ci/thresholds.json \
  --print-regression-thresholds-format=json \
  --fail-on-regression-severity=major \
  --compare-locale=fr

# Cap noisy schema-drift dumps to the top 25 rows in both JSON + CSV
bunx tsx scripts/gh-annotations.ts \
  --schema-error-report \
  --schema-error-report-format=csv \
  --schema-error-report-max-errors=25
```



### Repro bundle — `scripts/bundle-repro.ts`

Packages `seo-report/` + `hydration-sample.json` + config metadata into a
single zip so a CI run can be replayed locally.

| Flag                 | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `--bundle=<path.zip>` | Extract an existing bundle and re-run hydration + baseline diff from its recorded metadata |

**Examples:**

```bash
# Build a fresh bundle after a CI run
bun run seo:repro-bundle

# Replay a downloaded CI bundle locally
bun run seo:repro-replay
# or explicitly:
bunx tsx scripts/bundle-repro.ts --bundle=~/Downloads/repro-bundle.zip
```

### Unit tests

```bash
bun run test          # runs the full vitest suite, including
                      # scripts/gh-annotations.test.ts (filter + cap logic)
```
