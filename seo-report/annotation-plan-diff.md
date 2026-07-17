# Annotation plan diff

- A: `locale=en-CA,variant=blog`
- B: `locale=fr,variant=blog`

| Category | Emitted (A→B) | Δ | Cap-skipped (A→B) | Δ | Filter-skipped (A→B) | Δ | Status (A→B) |
|---|---:|---:|---:|---:|---:|---:|---|
| legacy | 1→0 | -1 | 0→0 | 0 | 16→17 | +1 | partial → **filter-mismatch** |
| hydration | 0→0 | 0 | 0→0 | 0 | 0→0 | 0 | no-matching-failures |
| jsonLd | 0→0 | 0 | 0→0 | 0 | 0→0 | 0 | no-matching-failures |
| robots | 0→0 | 0 | 0→0 | 0 | 0→0 | 0 | no-matching-failures |

Total emitted: 1 → 0 (Δ -1)
Total skipped: 0 → 0 (Δ +0)
