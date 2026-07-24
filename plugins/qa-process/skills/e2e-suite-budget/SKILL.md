---
name: e2e-suite-budget
description: "Build-an-X workflow that caps the E2E suite size by computing flakiness ROI per test - for each E2E test, computes (regressions caught × value) ÷ (runtime × flake rate × maintenance cost), ranks all tests by ROI, identifies the bottom decile (low ROI = high cost / low signal), and recommends specific tests to retire / move to lower layer / fix flake. Use quarterly to keep E2E count from growing past the team's maintenance capacity."
---

# e2e-suite-budget

## Overview

E2E tests are expensive: per
[`test-pyramid`][tp] (Cohn), they're "brittle, expensive to write,
and time consuming to run." Without active management, the E2E
suite grows: a new feature adds 5 tests per sprint; flake rate
creeps up; CI time balloons; team disables flaky tests; coverage
illusory.

[tp]: https://martinfowler.com/bliki/TestPyramid.html

This skill computes per-test ROI and recommends which tests to
retire / move to a lower layer / fix.

## When to use

- E2E suite has grown past 50-100 tests.
- CI time is dominated by E2E.
- Flake rate >5%; team is fatigued.
- Quarterly: scheduled budget review.

## Step 1 - Inputs

Per-E2E-test, the agent / skill needs:

- **Runtime:** average per-test duration (from CI).
- **Flake rate:** % of CI runs where the test failed then passed
  on retry (from CI history per `junit-xml-analysis` in the
  qa-test-reporting plugin, Step 3).
- **Regression-catch count:** how many real bugs this test caught
  in the last N months (from incident postmortems referencing the
  test, or git-blame on the failing-then-fixed pattern).
- **Maintenance cost:** PR count modifying the test in last N
  months (proxy for fragility).
- **Value tier:** 1-5; assigned by team (5 = critical journey).

## Step 2 - ROI formula

```
ROI = (regressions_caught × value_tier) / (runtime_min × (1 + flake_rate) × (1 + maintenance_count_norm))
```

Where:

- `regressions_caught` ≥ 0 (defaults to 0; can be fractional for
  "caught a near-miss").
- `value_tier` ∈ [1, 5].
- `runtime_min` is the test's average runtime in minutes.
- `flake_rate` ∈ [0, 1] (e.g., 0.05 = 5% flake).
- `maintenance_count_norm` is PRs touching the test in the window
  divided by the median for the suite (so a typical-maintenance
  test has factor ~1).

Higher ROI = more value per cost.

## Step 3 - Per-test scoring

```python
# scripts/e2e-budget.py
import json, sys
from collections import defaultdict

# Load per-test stats from CI history
stats = json.load(open(sys.argv[1]))  # {test_id: {runtime, flake_rate, ...}}
regressions = json.load(open(sys.argv[2]))  # {test_id: count}
value_tiers = json.load(open(sys.argv[3]))  # {test_id: tier}
maintenance = json.load(open(sys.argv[4]))  # {test_id: pr_count}
median_pr_count = sorted(maintenance.values())[len(maintenance) // 2] or 1

scores = {}
for tid, s in stats.items():
    rc = regressions.get(tid, 0)
    vt = value_tiers.get(tid, 3)
    rt = s['runtime_min']
    fr = s['flake_rate']
    mn = maintenance.get(tid, 0) / median_pr_count
    score = (rc * vt) / (rt * (1 + fr) * (1 + mn))
    scores[tid] = score

# Sort ascending - lowest ROI first
ranked = sorted(scores.items(), key=lambda x: x[1])
print(json.dumps(ranked))
```

## Step 4 - Output: bottom decile

```markdown
## E2E suite budget - `<repo>` - Q2 2026

**Total E2E tests:** 142
**Total runtime:** 38 min (per CI run)
**Median flake rate:** 4.2%
**Bottom-decile (14 tests) recommended for action:**

| Test                                              | ROI | Runtime | Flake | Regressions caught | Value tier | Recommendation |
|---------------------------------------------------|----:|--------:|------:|-------------------:|-----------:|----------------|
| `archive-flow.spec.ts > old-orders`                | 0.0 |   2.1m  |  18%  |        0           |     2      | Retire - high flake, no signal in 6mo. |
| `legacy-checkout.spec.ts > deprecated-promo`       | 0.1 |   3.2m  |   8%  |        0           |     1      | Retire - feature deprecated. |
| `cart.spec.ts > add 1000 items`                    | 0.2 |   4.5m  |   2%  |        0           |     2      | Move to perf suite - not E2E concern. |
| `e2e-utils.spec.ts > date-formatting`              | 0.5 |   0.8m  |   1%  |        0           |     2      | Move to unit layer. |
| ... (10 more)                                       |     |         |       |                    |            |                |

### Estimated impact of acting on all 14

- Suite size: 142 → 128 (-14)
- Runtime: 38 min → 28 min (-10 min per CI run, ~26% reduction)
- Flake-related reruns: estimated -50%
- Maintenance load: -20% (these 14 had the highest PR-touch count)
```

## Step 5 - Categorize recommendations

| Class                | Action                                                 |
|----------------------|--------------------------------------------------------|
| `retire`              | Delete; covered by other tests OR feature deprecated. |
| `lower-layer`         | Rewrite at unit / integration; cheaper.                |
| `fix-flake`           | Tests catches bugs but flakes; investigate per `flaky-test-quarantine` (in the qa-flake-triage plugin). |
| `consolidate`         | Merge with sibling test that overlaps.                 |
| `keep-but-monitor`     | Low ROI but catches important regressions; tag for next-quarter review. |

The team picks the appropriate class per test; the skill recommends.

## Step 6 - Cap discipline

Set an **absolute budget**:

```yaml
# e2e-budget.yml
budget:
  max_tests: 100
  max_runtime_min: 30
  max_flake_rate: 0.03   # 3%
```

When the suite exceeds budget, the next sprint's "add new E2E
test" requires retiring / moving an existing one. Force the
trade-off.

## Step 7 - Cadence

| Cadence    | Trigger                                                 |
|------------|---------------------------------------------------------|
| Quarterly   | Scheduled review.                                       |
| Per-major-feature | New tests added; verify suite stays under budget.  |
| After flake spike | Reactive review; flake source likely a low-ROI test. |

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| ROI formula without "regressions caught" data                         | All tests look equal; no basis for prioritization.                       | Track real-bug catches over time (Step 1). |
| Treating value_tier as binary (critical / not)                        | Misses tier-2 / tier-3 nuance.                                           | 1-5 scale (Step 1). |
| Auto-retiring bottom-decile without review                            | False positives - important tests retired.                               | Recommendation only; team confirms (Step 5). |
| Adding E2E tests without budget enforcement                           | Suite grows; no constraint forcing trade-offs.                           | Per-quarter cap (Step 6). |
| Recommending "retire" without alternative                             | Tests that catch important bugs may have low ROI due to runtime; deletion regrets. | Per-test categorization (Step 5). |
| Cherry-picking tests to retire (favorites stay)                       | Bias.                                                                     | Apply ranking uniformly; document overrides. |

## Limitations

- **Regressions-caught data is hard to gather.** Without
  postmortem cross-references, defaults to 0 for all tests;
  ranking gets degraded.
- **ROI formula is heuristic.** Tune weights per team's priorities.
- **Doesn't account for "test of last resort"** - some tests have
  low historical catch rate but exist because regression there
  would be catastrophic (auth, payment).
- **Migration cost.** Moving an E2E test to a unit test isn't
  free; budget the engineering time.

## References

- [tp][tp] - Cohn's pyramid: UI tests "brittle, expensive to
  write, and time consuming to run."
- `test-pyramid-balancer` - 
  sibling: identifies the layer-balance issue this skill
  addresses tactically.
- `flaky-test-quarantine` - sibling: handles the flake side of low-ROI tests.
- `junit-xml-analysis` - upstream: provides per-test runtime + flake stats.
- `test-coverage-targeter` - complementary: identifies what to add at the unit layer when
  E2E tests get retired.
