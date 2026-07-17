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
