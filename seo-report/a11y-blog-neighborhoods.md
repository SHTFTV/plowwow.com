# /blog/neighborhoods — Accessibility Scan

_Generated 2026-07-21T23:37:54.963874Z_

- Scenarios: **5**
- Critical/serious axe violations: **5**
- ARIA/keyboard check failures: **0**

## default

`http://localhost:8080/blog/neighborhoods/`

### Axe violations

- **serious** `color-contrast` (46 nodes) — Elements must meet minimum color contrast ratio thresholds

### ARIA / keyboard checks

- ✓ Pagination has aria-label
- ✓ Pagination has aria-current=page
- ✓ Previous button labelled
- ✓ Next button labelled
- ✓ All pagination buttons ≥ 44×44 px
- ✓ City filter group labelled
- ✓ City filter exposes aria-pressed
- ✓ Topic filter exposes aria-pressed
- ✓ Results heading has aria-live=polite

## city=vancouver

`http://localhost:8080/blog/neighborhoods/?city=vancouver`

### Axe violations

- **serious** `color-contrast` (45 nodes) — Elements must meet minimum color contrast ratio thresholds

### ARIA / keyboard checks

- ✓ Pagination has aria-label
- ✓ Pagination has aria-current=page
- ✓ Previous button labelled
- ✓ Next button labelled
- ✓ All pagination buttons ≥ 44×44 px
- ✓ City filter group labelled
- ✓ City filter exposes aria-pressed
- ✓ Topic filter exposes aria-pressed
- ✓ Results heading has aria-live=polite

## city=vancouver&tag=Strata

`http://localhost:8080/blog/neighborhoods/?city=vancouver&tag=Strata`

### Axe violations

- **serious** `color-contrast` (47 nodes) — Elements must meet minimum color contrast ratio thresholds

### ARIA / keyboard checks

- ✓ Pagination has aria-label
- ✓ Pagination has aria-current=page
- ✓ Previous button labelled
- ✓ Next button labelled
- ✓ All pagination buttons ≥ 44×44 px
- ✓ City filter group labelled
- ✓ City filter exposes aria-pressed
- ✓ Topic filter exposes aria-pressed
- ✓ Results heading has aria-live=polite

## city=citywide

`http://localhost:8080/blog/neighborhoods/?city=citywide`

### Axe violations

- **serious** `color-contrast` (31 nodes) — Elements must meet minimum color contrast ratio thresholds

### ARIA / keyboard checks

- ✓ Pagination has aria-label
- ✓ Pagination has aria-current=page
- ✓ Previous button labelled
- ✓ Next button labelled
- ✓ All pagination buttons ≥ 44×44 px
- ✓ City filter group labelled
- ✓ City filter exposes aria-pressed
- ✓ Topic filter exposes aria-pressed
- ✓ Results heading has aria-live=polite

## page-2 via keyboard

`http://localhost:8080/blog/neighborhoods/?page=2`

### Axe violations

- **serious** `color-contrast` (48 nodes) — Elements must meet minimum color contrast ratio thresholds

### ARIA / keyboard checks

- ✓ Pagination has aria-label
- ✓ Pagination has aria-current=page
- ✓ Previous button labelled
- ✓ Next button labelled
- ✓ All pagination buttons ≥ 44×44 px
- ✓ City filter group labelled
- ✓ City filter exposes aria-pressed
- ✓ Topic filter exposes aria-pressed
- ✓ Results heading has aria-live=polite
