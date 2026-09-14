# Test strategy review - dispatch-api (engagement 2026-0841)

Three days on site, 2026-08-31 to 2026-09-02.

## Current state

Counted with a `grep -c` over each directory:

| Directory           | Cases | Share |
|---------------------|------:|------:|
| `test/unit/`        |    26 |   63% |
| `test/integration/` |     6 |   15% |
| `test/e2e/`         |     9 |   22% |

## Diagnosis

Classic starved middle. 15% in the middle layer against a 25% target is the
single clearest defect in this suite: plenty of unit tests, a real end-to-end
suite, and almost nothing in between. Cross-module defects have nowhere to be
caught until the end-to-end job runs.

## Recommendation

Budget the bulk of Q4 to closing the middle-layer gap. Twelve new integration
tests brings the middle to roughly 25% of the suite. Hold the unit and
end-to-end layers still while this lands; re-measure in January.

Estimated effort: 9 to 11 engineer-weeks.
