# What we have already tried

| Date       | Change                                                          | Result                                        |
|------------|-----------------------------------------------------------------|-----------------------------------------------|
| 2026-09-01 | Steady state 20 min -> 90 min                                    | job stopped completing, dies around 40 min    |
| 2026-09-03 | Disabled the listener elements in the plan that nobody was using | still dies, now around 55 min instead of 40   |
| 2026-09-05 | JVM allocation 2g -> 3g, taken from the mobile team's share      | still dies around 55 min, no improvement worth reporting |
| 2026-09-08 | Asked finance for a bigger agent                                 | refused, spend frozen until Q1                |

Notes:

- The 3 September change was done by @tkowalski from the plan file directly. He
  has said he left the one element that is "actually doing something".
- The 5 September change is the one @rsantos wants reverted.
- Throughput has been the same on every run since 1 September, before and after
  each of these changes.
