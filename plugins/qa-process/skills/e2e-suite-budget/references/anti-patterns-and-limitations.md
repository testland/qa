# e2e-suite-budget - anti-patterns and limitations

Supporting detail for the ROI-based E2E pruning workflow in SKILL.md.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Scoring on incomplete regression data | ROI collapses to 0.0 for every test with no recorded catch, so the ranking surfaces tests nobody has attributed a bug to, not genuinely low-value tests. | Backfill regression-catch counts from incident postmortems and the failing-then-fixed git pattern before trusting the ranking. Step 1a warns when >50% of tests score 0.0. |
| Auto-retiring the bottom decile without review | The formula is a heuristic; a low-ROI test can still be the only cover for a rare-but-critical path. Deleting on the number alone drops real coverage. | Treat the bottom decile as an action list, not a delete list. A human decides retire / lower-layer / fix per test (Step 5). |
| Cherry-picking inputs to justify a decision already made | Tuning value tiers or the maintenance window until a disliked test ranks last defeats the point of the score. | Fix the input definitions once per review, then read the ranking as-is. |
| Retiring when the behavior still needs coverage | Deleting a test whose logic is cheaply covered one layer down loses the assertion entirely. | Prefer lower-layer or consolidate over retire when the behavior still matters (Step 5). |

## Limitations

- Regression-catch data is the hardest input to gather; postmortems rarely name the exact test, so counts are approximate. Treat ROI as ordinal (a ranking), not an absolute score.
- The formula is a heuristic, not a proof. The multiplicative factors (flake, maintenance) are tunable; recalibrate them if the ranking stops matching team intuition.
- Test-of-last-resort cases - the sole cover for a critical journey - can score low yet must be kept. Use the keep-but-monitor class rather than forcing them through the budget.
- Moving a test to a lower layer carries a migration (rewrite) cost the ROI number does not capture; weigh it before choosing lower-layer over retire.
