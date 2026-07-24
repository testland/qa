---
name: test-pyramid-balancer
description: "Build-an-X workflow that analyzes a repo's test mix (unit / integration / E2E counts + runtimes) and recommends rebalancing toward the test pyramid ratios per the change-set shape - pure-logic-heavy repo wants ~80/15/5; UI-heavy repo wants ~60/25/15. Detects 'ice-cream cone' (E2E-heavy) and 'hourglass' (integration-thin) anti-patterns. Use when the user asks about test distribution, test strategy, test balance, too many E2E tests, slow CI caused by tests, testing best practices, or rebalancing their test suite; also suitable for quarterly calibration of the test mix to codebase reality."
---

# test-pyramid-balancer

## Step 1 - Inventory current test mix

Per-language adapters classify by path heuristic:

```python
# scripts/test-mix-inventory.py
import re
from pathlib import Path

EXTENSIONS = {'.js', '.ts', '.py', '.kt', '.java', '.rb', '.go'}

def classify(path_str, content):
    if any(s in path_str for s in ['/playwright/', '/cypress/', '/selenium/', '/e2e/']):
        return 'e2e'
    if any(s in content for s in ['playwright', 'cypress', 'selenium-webdriver']):
        return 'e2e'
    if any(s in path_str for s in ['/integration/', '/it/']):
        return 'integration'
    if 'testcontainers' in content or 'WebApplicationFactory' in content:
        return 'integration'
    return 'unit'   # default

mix = {'unit': 0, 'integration': 0, 'e2e': 0}
for path in Path('.').rglob('*'):
    if path.suffix not in EXTENSIONS:
        continue
    if not re.search(r'(test|spec)\.|test_|_test\.', path.name):
        continue
    content = path.read_text(errors='ignore')
    layer = classify(str(path), content)
    mix[layer] += content.count('test(') + content.count('it(') + content.count('def test_')

print(mix)
```

**Validation checkpoint (Step 1):** Before proceeding, sample 5 - 10 tests from each classified bucket and confirm the layer assignment looks correct. If a "unit" test hits a real database, reclassify it as integration. Adjust the `classify()` heuristics for any systematic misclassification before continuing.

## Step 2 - Inventory current runtime

```bash
# Per-layer runtime (one-off measurement)
time npm test                    # unit + integration via Jest
time npx playwright test         # E2E

# OR via JUnit XML aggregation per junit-xml-analysis
```

## Step 3 - Compare to ideal ratios

Per [test-pyramid][tp]: the right ratio depends on the codebase. Defaults:

| Predominant change shape | Recommended (unit / int / e2e) | Notes                                    |
|--------------------------|--------------------------------|------------------------------------------|
| Pure-logic-heavy          | 80 / 15 / 5                    | Algorithms, data transforms, calculations. |
| Service-layer-heavy        | 70 / 25 / 5                    | APIs, microservices, repos.              |
| UI-heavy                   | 60 / 25 / 15                   | SPAs, mobile apps; UI is the product.   |
| Data-heavy                 | 60 / 30 / 10                   | + dedicated data quality suite.          |

The change-shape input comes from `code-change-shape-classifier`, which walks a window of `git log` and classifies each commit by path and content signal. This step consumes that distribution: it does not recompute it.

[tp]: https://martinfowler.com/bliki/TestPyramid.html

## Step 4 - Detect anti-patterns

**Validation checkpoint (Step 4):** Present the diagnosed anti-pattern to the user and ask them to confirm the diagnosis before generating migration recommendations. Large-scale test moves are multi-sprint work; confirm the direction is correct first.

### Ice-cream cone (E2E-heavy)

```
Current: 30 unit / 10 integration / 60 E2E  →  Verdict: ICE-CREAM CONE (60% E2E vs target 5%)
```

Symptoms: E2E count > unit count; total runtime dominated by E2E; per-PR feedback time >15 min.

Fix: identify E2E tests that test pure logic; rewrite at the unit layer. Keep a hero-flow floor of 5 - 15 E2E tests for critical journeys. Tune target ratios per change shape (Step 3) rather than applying a single universal ratio.

### Hourglass (integration-thin)

```
Current: 200 unit / 8 integration / 30 E2E  →  Verdict: HOURGLASS (3% integration vs target 20%)
```

Symptoms: many unit + many E2E; very few integration; multi-module bugs slip through (units pass; E2E catches but late).

Fix: add integration tests covering the cross-module seams that unit tests can't reach and E2E tests catch too late. Note that path-based classification can mislead - read file content for hint signals (`testcontainers`, `WebApplicationFactory`) to catch unit tests that secretly hit a real DB.

### Inverted pyramid

```
Current: 50 unit / 100 integration / 80 E2E  →  Verdict: INVERTED PYRAMID (heaviest at the top; UI tests dominate)
```

Symptoms: same as ice-cream cone but with integration-heavy variant; CI is slow; flake is high.

Fix: aggressive layer-down - move tests to lower layers where they catch the same bugs faster. Evaluate using layer ratio + runtime + flake rate together, not runtime alone.

## Step 5 - Recommend specific changes

Output a stack-ranked list of layer-changes:

```markdown
## Test pyramid analysis - `<repo>`

**Date:** YYYY-MM-DD   **Last 90 days commits classified:** 142

### Current

| Layer       | Tests | % of total | Avg runtime | Cost factor |
|-------------|------:|-----------:|------------:|------------:|
| Unit         |   840 |       59%  |       12 ms |       1×    |
| Integration   |    98 |        7%  |      1.4 s  |       3×    |
| E2E          |   485 |       34%  |      8.2 s  |      10×    |

**Verdict:** ICE-CREAM CONE - E2E % (34) far exceeds target (5).

### Recommended (per change shape: 70% service-layer, 30% pure-logic)

| Layer        | Target % | Target tests | Δ        |
|--------------|---------:|-------------:|----------|
| Unit          |      75% |        ~1100 | +260     |
| Integration   |      20% |        ~290  | +192     |
| E2E           |       5% |          ~75 | -410 (!) |

### Top recommendations

1. **Identify E2E tests testing pure logic** (`grep -l "expect.*\bcalculate\|format\|parse" e2e/`).
   Likely candidates: 80-120 tests. Move to unit layer.
2. **Identify E2E tests testing service-layer integration**. Move to
   integration layer with testcontainers.
3. **Review the remaining 75 E2E tests** for hero-flow coverage. If they
   cover 5-10 distinct critical journeys, the suite is healthy.

### Estimated impact

- CI time: ~38 min → ~12 min (per the cost-factor math).
- Flake rate: typical reduction 50-70% (E2E dominates flake).
- Per-PR feedback: <5 min for unit + integration (vs current 15 min).
```

## Step 6 - Confirm improvement

After migrations are complete, re-run `scripts/test-mix-inventory.py` and compare the new ratios against the targets from Step 3. If any layer is still outside its target band, return to Step 4 to diagnose residual anti-patterns before closing the work.

## Step 7 - Cadence

| Cadence    | Trigger                                       |
|------------|-----------------------------------------------|
| Quarterly   | Scheduled review.                             |
| After major refactor | Re-inventory; ratios may have shifted. |
| New team owner | Inherit the test-mix; understand it.       |
| Sprint with E2E-heavy ship | Spot-check; don't tilt the pyramid. |

## Limitations

- **Heuristic classification.** Some tests legitimately span layers
  (an integration test exercising a UI fragment). Manual triage
  needed for ambiguous cases.
- **Doesn't measure test value.** Two unit tests of equal runtime
  can have very different bug-catching power. Pair with mutation
  testing for value signal.

## References

- [tp][tp] - Mike Cohn's pyramid: unit / service / UI; "many more
  low-level UnitTests than high level BroadStackTests"; UI tests
  "brittle, expensive to write, and time consuming to run."
- `test-coverage-targeter` - risk-weighted "what to add at unit layer" once the team decides
  to layer-down.
- `e2e-suite-budget` - sibling
  skill for capping E2E suite size.
