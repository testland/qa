# test-suite-health-audit - worked examples and anti-patterns

Illustrative runs and failure modes for `test-suite-health-audit`. The five
steps, the severity bands, and the verdict rules live in `SKILL.md`.

## Worked examples

### Example 1 - inverted pyramid, no run history

A suite of 50 unit, 100 integration, and 200 E2E files. No CI history available.
Team documented a 70/20/10 target.

- Step 1: 350 files, 331 tiered cleanly (95%). Above the 80% floor, so the audit
  proceeds.
- Step 2: actual 14/29/57. E2E file count (200) exceeds unit file count (50), so
  the axis is **Critical** by the inversion rule, whatever the deltas say.
- Step 3: `not assessed`, no run history.
- Step 4: `not assessed`, no defect-fix history in the window.
- Step 5: a Critical exists, so the verdict is **Needs refactor**. Top finding:
  the suite is an ice-cream cone, and the remediation shape is moving coverage
  down a layer, not deleting it.
- "Not assessed" lists both missing inputs so nobody reads the silence on flake
  as a clean bill of health.

### Example 2 - healthy

A suite of 350 unit, 80 integration, and 30 E2E files against a documented
70/20/10 target, with 200 runs of history.

- Step 2: actual 76/17/7. Worst delta is 6 points (unit), inside the 10-point
  band. Axis **Healthy**.
- Step 3: 0.5% unit, 1.1% integration, 1.8% E2E, all under the 2% floor. Axis
  **Healthy**, reported as "no flake observed in a 200-run window" rather than as
  a rate.
- Step 4: integration scores highest; unit at 62% of the integration figure and
  E2E at 31%. Nothing below the 10% flag. Axis **Healthy**.
- Step 5: no Critical, no Important. Verdict **Healthy**.

### Example 3 - un-assessable

A flat directory of 60 test files with no tier convention, no runner markers, and
imports that mix a database client and a component renderer in the same files.

- Step 1: 38 of 60 files tiered cleanly (63%), below the 80% floor.
- Verdict: **Cannot assess (tier classification confidence 63%)**.
- Unlocking input, stated explicitly: split the directory by tier, or add a
  runner-level tier marker to each file, then re-run. Do not report a ratio in
  the meantime; a 63%-confidence ratio will be quoted as fact within a week.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Reporting a ratio without its classification confidence | The reader treats an estimate as a count, and argues about a 3-point delta that is inside the error bar | Print confidence next to the ratio, always |
| Prescribing a new target ratio in the same report | Two capabilities then own the same decision and drift apart | Report distance from the given target; hand the target decision on |
| Presenting `not assessed` as Healthy | A blank flake column reads as a clean one | Emit the literal string `not assessed` plus the missing input |
| Softening `Cannot assess` into a hedged verdict | The hedge gets dropped when the number is quoted downstream | Abstain, and name the one input that would unlock the audit |
| Treating the flake bands or the 10% ROI cut as standards | They are conventions; presenting them as published thresholds forecloses a legitimate argument | Print the band and the reasoning together, as above |
| Deleting tests on a small ROI gap | The defect proxy under-counts, so a small gap is noise | Flag only an order-of-magnitude gap |
| Auditing a single framework or a single file with whole-suite ratios | Ratios say nothing about one framework's internal architecture | Route to the review whose input is that scope |
| Re-deriving the change-shape distribution inside this audit | The suite and the change stream are different measurements with different inputs | Consume a change-shape classification; do not recompute it |
