# Test effort estimate output template

Deep reference for the `test-effort-estimation` SKILL.md. The full Markdown document the skill emits, filled for the "Promo codes at checkout" epic from the worked example. Copy the section order; keep the "distribution, not a commitment" line and the Method section even when they feel redundant - they are what stop a reader from turning E into a delivery date.

Emit one Markdown document with these sections in order.

```markdown
## Test effort estimate - Promo codes at checkout - 2026-07-19

**Total expected effort:** 33.6 h
**Range (independent rows):** 30.1 to 37.1 h
**Range (shared-dependency worst case):** 25.6 to 41.6 h

This is a distribution, not a commitment. It is invalidated, not padded, if any
assumption below changes.

### Effort by area and layer

| # | Area | Layer | Risk | a | m | b | E | Range | Owner | Assumptions |
|---|------|-------|-----:|--:|--:|--:|--:|-------|-------|-------------|
| 1 | Checkout flow | Service | 3 | 4 | 8 | 16 | 8.7 | 6.7 - 10.7 | Automation | A1, A2, A4, A6 |
| 2 | Checkout flow | UI / E2E | 3 | 2 | 5 | 10 | 5.3 | 4.0 - 6.6 | Automation | A1, A2, A5 |
| 3 | Discount-code API | Service | 2 | 2 | 4 | 8 | 4.3 | 3.3 - 5.3 | Automation | A2, A3 |
| 4 | Discount rules | Unit | 2 | 3 | 5 | 9 | 5.3 | 4.3 - 6.3 | Developer | A1, A3 |
| 5 | Promo schema | Data checks | 3 | 2 | 6 | 14 | 6.7 | 4.7 - 8.7 | Developer + data | A2, A4, A6 |
| 6 | Checkout | Exploratory | 3 | 2 | 3 | 6 | 3.3 | 2.6 - 4.0 | Manual tester | A1, A6 |

### Assumptions ledger

| ID | Category | Statement | Rows affected |
|----|----------|-----------|---------------|
| A1 | Scope boundary | Stories 12 to 15 only; story 16 (dark mode) excluded | 1, 2, 4, 6 |
| A2 | Environment | Staging available from sprint day 2 | 1, 2, 3, 5 |
| A3 | Test data | Fixture generator covers all discount-code cases | 3, 4 |
| A4 | Dependency | Payment provider sandbox contract unchanged this sprint | 1, 5 |
| A5 | Skill | One automation engineer with browser-automation experience | 2 |
| A6 | Risk rating | Checkout and promo schema rated risk-3: real payments, irreversible migration | 1, 2, 5, 6 |

All six mandatory categories present.

### Ownership summary

| Role | Rows | Expected hours | Capacity | Flag |
|------|------|---------------:|---------:|------|
| Developer (unit + data checks) | 4, 5 | 12.0 | 16 | ok |
| Automation engineer (service + E2E) | 1, 2, 3 | 18.3 | 14 | OVER by 4.3 h |
| Manual tester (exploratory) | 6 | 3.3 | 8 | ok |

### Capacity flags

Automation engineer is over-allocated by 4.3 h. Options: move row 3 to the
developer who owns the discount-code endpoint, or descope row 2 to the single
happy path and cover the variants in row 6.

### Method

Three-point PERT per row: E = (a + 4m + b) / 6, SD = (b - a) / 6. Row ranges
are E - SD to E + SD. Epic spread aggregated as sqrt(sum of variances), with the
fully-correlated sum reported alongside because A2 is shared across four rows.
Three-point inputs from a two-round Wideband Delphi with three estimators.
Change-shape distribution consumed as an input, not derived here.
```

Keep the "distribution, not a commitment" line and the "Method" section even
when they feel redundant. They are what stop a reader from turning `E` into a
date.
