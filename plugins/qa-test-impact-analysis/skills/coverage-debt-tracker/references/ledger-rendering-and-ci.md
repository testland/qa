# Ledger rendering and CI shape

Supporting detail for `coverage-debt-tracker` Steps 5 and 6: the full ledger
render template (worked example) and the scheduled CI workflow. The detection
core (Steps 2 - 4) stays inline in SKILL.md.

## Ledger render template

```markdown
## Coverage debt ledger - `<branch>`, last 30 main runs (~30 days)

**Total flagged:** 12 files
**Backlog priority:** orphan → falling (>10pp) → falling (5-10pp) → stale

### 🔴 Orphans (3) - currently 0% coverage; lost all covering tests

| File                                        | Lost tests                                                  | Path              |
|---------------------------------------------|-------------------------------------------------------------|-------------------|
| `src/api/promo.ts`                          | `promo.spec.ts.applies_lowercase`, `promo.spec.ts.expires`  | Test file deleted in `def456` (30 days ago); never replaced. |
| `src/utils/parseDate.ts`                    | `parseDate.spec.ts.iso_format`                              | Test file moved; new path doesn't import the util. |

### 🟠 Falling >10pp (4)

| File                                        | Peak%                  | Now% | Drop  |
|---------------------------------------------|-----------------------:|-----:|------:|
| `src/checkout/cart.ts`                       | 95.2 (`abc123`, day -25) | 65.4 | -29.8 |
| `src/checkout/discount.ts`                   | 88.0 (`def456`, day -19) | 71.0 | -17.0 |
| `src/api/orders.ts`                          | 79.5 (`ghi789`, day -8)  | 65.0 | -14.5 |

### 🟡 Falling 5-10pp (3)

(table)

### 🔵 Stale, high churn (2)

| File                                        | Coverage% | Commits last 90d |
|---------------------------------------------|----------:|-----------------:|
| `src/api/payments.ts`                        |      72.0 |               18 |
| `src/checkout/promo-stack.ts`                |      68.0 |               12 |
```

For each orphan: write 1 test that re-covers the file (run with the file's
name in the search; if the test runner doesn't show it as covered, the file
may be unreachable / dead code). For each falling file: pair with
`test-coverage-targeter` to identify the specific uncovered branches. For each
stale file: review with the file owner - is the new code actually being
tested? The suite often covers happy paths but not the edge cases recent
commits added.

## CI workflow

The debt tracker runs on a schedule, not per-PR (it's informational, not
gating):

```yaml
# .github/workflows/coverage-debt.yml
name: coverage-debt
on:
  schedule:
    - cron: '0 12 * * MON'   # Monday noon UTC; weekly review
  workflow_dispatch:

jobs:
  ledger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }   # for git churn

      - name: Restore coverage history
        uses: actions/download-artifact@v4
        with:
          name: coverage-history
          path: coverage-history/

      - name: Build ledger
        run: python scripts/coverage_debt.py coverage-history/ > LEDGER.md

      - name: Open / update GitHub issue
        uses: peter-evans/create-issue-from-file@v5
        with:
          title: 'Coverage debt ledger - week of ${{ github.event.repository.updated_at }}'
          content-filepath: LEDGER.md
          labels: tech-debt, coverage
```

The issue gets refreshed weekly. Items the team fixed drop off; new items
appear. The same issue title (with date) makes the history of debt visible
across weeks.
