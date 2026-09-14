# Merged PRs by touched area - 2026-06-15 to 2026-09-12

Generated from `git log --name-only --merges` over 412 merged PRs.

| Area                                    | PRs  | Share |
|-----------------------------------------|------|-------|
| `src/api/**` or `src/domain/**` only    | 271  | 65.8% |
| `src/api/**` and `console/**` together  |  76  | 18.4% |
| `console/**` only                       |  41  | 10.0% |
| infra / CI / docs only                  |  24  |  5.8% |

- 84.2% of merged PRs touched the API or the domain layer.
- Median PR open-to-merge time: 6h 10m. The team merges to main 8-14 times a
  working day.
- The console ships on a weekly release train. The API ships continuously.
- The last four production incidents (INC-2201, INC-2214, INC-2230, INC-2248)
  were all rating or routing defects in the domain layer. None involved the
  console.
