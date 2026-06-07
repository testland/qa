---
name: test-pyramid-balancer
description: "Build-an-X workflow that analyzes a repo's test mix (unit / integration / E2E counts + runtimes) and recommends rebalancing toward Cohn's pyramid ratios per the change-set shape - pure-logic-heavy repo wants ~80/15/5; UI-heavy repo wants ~60/25/15. Detects \"ice-cream cone\" (E2E-heavy) and \"hourglass\" (integration-thin) anti-patterns. Use quarterly to keep the test mix calibrated to the codebase reality."
rating: 22
d6: 3
---

# test-pyramid-balancer

## Overview

Per [test-pyramid][tp]:

[tp]: https://martinfowler.com/bliki/TestPyramid.html

> "you should have many more low-level **UnitTests** than high
> level **BroadStackTests** running through a GUI."

The pyramid model has three layers (unit / service / UI); the
ratio between them depends on the codebase. A repo with mostly
pure-logic changes wants more unit tests; a repo with mostly UI
changes legitimately needs more E2E.

The anti-patterns ("ice-cream cone" - heavy E2E + thin unit, or
"hourglass" - heavy unit + heavy E2E + thin integration) accumulate
silently. This skill makes them visible.

## When to use

- Quarterly: scheduled test-mix review.
- After a sprint that added many E2E tests: are we tilting toward
  the ice-cream cone?
- New team owner: understand the inherited test-mix.
- Refactor planning: where's the highest-leverage test-debt?

## Step 1 - Inventory current test mix

Per-language adapters classify by path heuristic:

```python
# scripts/test-mix-inventory.py
import os, re, glob

def classify(path, content):
    if any(s in path for s in ['/playwright/', '/cypress/', '/selenium/', '/e2e/']):
        return 'e2e'
    if any(s in content for s in ['playwright', 'cypress', 'selenium-webdriver']):
        return 'e2e'
    if any(s in path for s in ['/integration/', '/it/']):
        return 'integration'
    if 'testcontainers' in content or 'WebApplicationFactory' in content:
        return 'integration'
    return 'unit'   # default

mix = {'unit': 0, 'integration': 0, 'e2e': 0}
for path in glob.glob('**/*.{js,ts,py,kt,java,rb,go}', recursive=True):
    if not re.search(r'(test|spec)\.|test_|_test\.', path):
        continue
    with open(path) as f:
        content = f.read()
    layer = classify(path, content)
    mix[layer] += content.count('test(') + content.count('it(') + content.count('def test_')

print(mix)
```

## Step 2 - Inventory current runtime

```bash
# Per-layer runtime (one-off measurement)
time npm test                    # unit + integration via Jest
time npx playwright test         # E2E

# OR via JUnit XML aggregation per [`junit-xml-analysis`](../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md)
```

## Step 3 - Compare to ideal ratios

Per [test-pyramid][tp]: the right ratio depends on the codebase.
Defaults:

| Predominant change shape | Recommended (unit / int / e2e) | Notes                                    |
|--------------------------|--------------------------------|------------------------------------------|
| Pure-logic-heavy          | 80 / 15 / 5                    | Algorithms, data transforms, calculations. |
| Service-layer-heavy        | 70 / 25 / 5                    | APIs, microservices, repos.              |
| UI-heavy                   | 60 / 25 / 15                   | SPAs, mobile apps; UI is the product.   |
| Data-heavy                 | 60 / 30 / 10                   | + dedicated data quality suite.          |

To detect change shape: walk last 90 days of `git log`; classify
each PR's primary impact via path heuristic (per
[`test-architect`](../../../qa-roles/agents/test-architect.md) Mode 1
Step 2).

## Step 4 - Detect anti-patterns

### Ice-cream cone (E2E-heavy)

```
Current: 30 unit / 10 integration / 60 E2E
Recommended: 70 / 25 / 5
Verdict: ICE-CREAM CONE (60% E2E vs target 5%)
```

Symptoms:
- E2E count > unit count.
- Total runtime dominated by E2E.
- Per-PR feedback time >15 min.

Fix: identify E2E tests that test pure logic; rewrite at the unit
layer.

### Hourglass (integration-thin)

```
Current: 200 unit / 8 integration / 30 E2E
Recommended: 75 / 20 / 5
Verdict: HOURGLASS (3% integration vs target 20%)
```

Symptoms:
- Many unit + many E2E; very few integration.
- Multi-module bugs slip through (units pass; E2E catches but
  late).

Fix: add integration tests covering the cross-module seams that
unit tests can't reach and E2E tests catch too late.

### Inverted pyramid

```
Current: 50 unit / 100 integration / 80 E2E
Recommended: 75 / 20 / 5
Verdict: INVERTED PYRAMID (heaviest at the top; UI tests dominate)
```

Symptoms:
- Same as ice-cream cone but with integration-heavy variant.
- CI is slow; flake is high.

Fix: aggressive layer-down - move tests to lower layers
where they catch the same bugs faster.

## Step 5 - Recommend specific changes

Output a stack-ranked list of layer-changes:

```markdown
## Test pyramid analysis — `<repo>`

**Date:** YYYY-MM-DD   **Last 90 days commits classified:** 142

### Current

| Layer       | Tests | % of total | Avg runtime | Cost factor |
|-------------|------:|-----------:|------------:|------------:|
| Unit         |   840 |       59%  |       12 ms |       1×    |
| Integration   |    98 |        7%  |      1.4 s  |       3×    |
| E2E          |   485 |       34%  |      8.2 s  |      10×    |

**Verdict:** ICE-CREAM CONE — E2E % (34) far exceeds target (5).

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
   integration layer with [`testcontainers`](../../qa-test-environment/skills/testcontainers/SKILL.md).
3. **Review the remaining 75 E2E tests** for hero-flow coverage. If they
   cover 5-10 distinct critical journeys, the suite is healthy.

### Estimated impact

- CI time: ~38 min → ~12 min (per the cost-factor math).
- Flake rate: typical reduction 50-70% (E2E dominates flake).
- Per-PR feedback: <5 min for unit + integration (vs current 15 min).
```

## Step 6 - Cadence

| Cadence    | Trigger                                       |
|------------|-----------------------------------------------|
| Quarterly   | Scheduled review.                             |
| After major refactor | Re-inventory; ratios may have shifted. |
| New team owner | Inherit the test-mix; understand it.       |
| Sprint with E2E-heavy ship | Spot-check; don't tilt the pyramid. |

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| One-size-fits-all pyramid recommendation                              | Per [test-pyramid][tp]: ratios depend on the codebase.                    | Tune per change shape (Step 3). |
| Path-based-only classification                                         | A "unit" test that hits a real DB is actually integration; misclassified. | Read content for hint signals (Step 1 example). |
| Recommending E2E count = 0                                            | Some critical journeys need E2E; eliminating misses them.                 | Hero-flow E2E (5-15) is the floor (Step 5 example). |
| One-shot recommendation with no migration plan                         | Team doesn't know where to start.                                         | Stack-ranked list with specific candidates (Step 5). |
| Quarterly review without follow-up                                     | Recommendations don't ship.                                              | Track action items in tracker; review next quarter. |
| Treating runtime as the only signal                                    | A 0.5-sec E2E test is fine; a 0.5-sec unit test that ran 1000× isn't.   | Layer ratio + runtime + flake rate together. |

## Limitations

- **Heuristic classification.** Some tests legitimately span layers
  (an integration test exercising a UI fragment). Manual triage
  needed for ambiguous cases.
- **Doesn't measure test value.** Two unit tests of equal runtime
  can have very different bug-catching power. Pair with mutation
  testing for value signal.
- **Migration cost is real.** Moving 100 E2E tests to unit layer
  is multi-sprint work.
- **Per-team conventions.** What counts as "integration" varies by
  team's vocabulary; document the local definitions.

## References

- [tp][tp] - Mike Cohn's pyramid: unit / service / UI; "many more
  low-level UnitTests than high level BroadStackTests"; UI tests
  "brittle, expensive to write, and time consuming to run."
- [`test-architect`](../../../qa-roles/agents/test-architect.md) - 
  per-repo pyramid + framework recommendation; complementary
  agent (this skill is the analytical workflow).
- [`unit-test-coverage-targeter`](../../../qa-test-reporting/skills/unit-test-coverage-targeter/SKILL.md) - risk-weighted "what to add at unit layer" once the team decides
  to layer-down.
- [`e2e-suite-budget`](../e2e-suite-budget/SKILL.md) - sibling
  skill for capping E2E suite size.
