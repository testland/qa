# Merged PRs by touched area - 2026-06-15 to 2026-09-12

Generated from `git log --name-only --merges` over 412 merged PRs.

| Area                                    | PRs  |
|-----------------------------------------|------|
| `src/api/**` or `src/domain/**` only    | 271  |
| `src/api/**` and `console/**` together  |   76 |
| `console/**` only                       |   41 |
| infra / CI / docs only                  |   24 |

- Median PR open-to-merge time: 6h 10m. The team merges to main 8-14 times a
  working day.
- The console ships on a weekly release train. The API ships continuously.
- Production incidents since June:
  - INC-2201  rating band boundary, `src/domain/rating`
  - INC-2214  route selection, `src/domain/routing`
  - INC-2230  quote rounding, `src/domain/rating`
  - INC-2248  zone multiplier lookup, `src/domain/rating`
