<!-- validator-summary -->
## SEO validator summary

- Validation report: 0 issue(s) across **293** routes
- Legacy redirects: 17/17 failing
- Hydration: 0/0 failing (seed `?` / `?`)
- JSON-LD preflight: 0 finding(s) across 182 pages / 1416 blocks
- robots.txt directives: 0 failure(s)

**Total failures: 17**

### Threshold gates
- ❌ `legacyRedirects` — 17 failure(s), threshold 0 (critical)
- ✅ `hydration` — 0 failure(s), threshold 2 (warn)
- ✅ `jsonLd` — 0 failure(s), threshold 0 (critical)
- ✅ `robots` — 0 failure(s), threshold 0 (critical)
- ✅ `validation` — 0 failure(s), threshold 5 (warn)

### Baseline regression
- _No baseline present. Run `bun run seo:baseline-accept -- --yes` after a clean run._

### Top failing legacy redirects
  - `/snow-removal-in-burquitlam` → expected `/snow-removal-in-burquitlam/` — first hop status=200 (expected 301)
  - `/abbotsford-snow-removal` → expected `/abbotsford-snow-removal/` — first hop status=200 (expected 301)
  - `/blog` → expected `/blog/` — first hop status=200 (expected 301)
  - `/locations` → expected `/locations/` — first hop status=200 (expected 301)
  - `/quote` → expected `/quote/` — first hop status=200 (expected 301)

### Top failing JSON-LD blocks
  - _none_

### Top failing robots.txt directives
  - _none_

### Top failing hydration OG/Twitter issues
  - _none_
