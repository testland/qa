---
name: risk-based-test-selector
description: "Action-taking agent that picks the subset of tests to run for a specific change set, weighted by the risk matrix — reads the PR's diff, intersects the changed files with risks in the matrix, scopes the test run to (a) tests covering high-risk areas + (b) tests covering changed files, and emits the test selection. Differs from `regression-suite-selector` (which uses coverage maps) — this uses risk weights from the matrix per `risk-matrix`."
tools: "Read, Grep, Glob, Bash(git diff *), Bash(npx jest --listTests), Bash(pytest --collect-only *)"
model: sonnet
skills:
  - risk-matrix
rating: 22
d6: 3
archetype: A2
---

A complement to coverage-driven test selection — this agent uses the team's risk matrix to weight test selection, not just coverage data.

## When invoked

The agent takes:

- A PR's diff (`git diff --name-only origin/main...HEAD`).
- The team's current risk matrix (per
  [`risk-matrix`](../skills/risk-matrix/SKILL.md)).
- A test inventory (per `npx jest --listTests` / `pytest --collect-only`).

Output: a stack-ranked list of tests to run, with rationale.

## Step 1 — Map risks to test areas

The risk matrix has rows like:

```
| R-1 | Promo discount math wrong | Business | 5×3 | property tests on rounding | Alice |
| R-2 | Stripe webhook delivery   | Technical| 4×4 | retry + DLQ + chaos test    | Bob   |
| R-3 | EU tax calc                | Regulatory | 5×2 | UAT with finance           | Carol |
```

Each risk maps to one or more test areas (file globs):

```yaml
# .matrix/risk-test-mapping.yaml
R-1:
  test_paths:
    - tests/checkout/promo*.spec.ts
    - tests/checkout/discount-math.spec.ts
R-2:
  test_paths:
    - tests/integration/stripe-webhook*.spec.ts
    - tests/chaos/stripe-resilience.spec.ts
R-3:
  test_paths:
    - tests/eu-tax/*.spec.ts
    - tests/uat/eu-checkout.uat.ts
```

The mapping is curated — author once per risk; updates when test
files move.

## Step 2 — Identify changed files

```bash
CHANGED=$(git diff --name-only origin/${BASE_BRANCH}...HEAD)
```

## Step 3 — Map changed files to risks

```python
# scripts/risk-selector.py
import yaml, fnmatch, json, sys

# Load inputs
matrix = yaml.safe_load(open(sys.argv[1]))   # risk-matrix.yaml
mapping = yaml.safe_load(open(sys.argv[2]))   # risk-test-mapping.yaml
changed = open(sys.argv[3]).read().splitlines()  # changed files list

# Map each risk to its source-code paths (what production code does this risk relate to?)
risk_to_source = {}
for r_id, r in matrix['risks'].items():
    risk_to_source[r_id] = r.get('source_paths', [])

# For each changed file, find the risks it intersects
risks_implicated = set()
for f in changed:
    for r_id, paths in risk_to_source.items():
        if any(fnmatch.fnmatch(f, p) for p in paths):
            risks_implicated.add(r_id)

# Rank risks by score
risks_by_score = sorted(risks_implicated, key=lambda r: -matrix['risks'][r]['score'])

# Emit test selection
selected_tests = set()
for r in risks_by_score:
    for path in mapping[r]['test_paths']:
        selected_tests.add(path)

print(json.dumps({
    'risks_implicated': list(risks_by_score),
    'tests_selected': sorted(selected_tests),
}))
```

## Step 4 — Stack-rank output

```markdown
## Risk-based test selection — `<sha>`

**Files changed:** 12
**Risks implicated:** 4 (of 23 in matrix)

### High-priority tests (covering Critical risks)

| Risk    | Score | Tests selected                                                |
|---------|------:|---------------------------------------------------------------|
| R-2 Stripe webhook delivery | 16 | tests/integration/stripe-webhook.spec.ts, tests/chaos/stripe-resilience.spec.ts |
| R-1 Promo discount math       | 15 | tests/checkout/promo*.spec.ts (4 files), tests/checkout/discount-math.spec.ts |

### Medium-priority tests (covering High risks)

| Risk    | Score | Tests selected                                                |
|---------|------:|---------------------------------------------------------------|
| R-3 EU tax calc                | 10 | tests/eu-tax/*.spec.ts (3 files), tests/uat/eu-checkout.uat.ts |

### Total tests selected: 14
### Run command:
```bash
npx jest tests/integration/stripe-webhook.spec.ts tests/chaos/stripe-resilience.spec.ts \
         tests/checkout/promo*.spec.ts tests/checkout/discount-math.spec.ts \
         tests/eu-tax/*.spec.ts tests/uat/eu-checkout.uat.ts
```

### Tests NOT selected (low risk OR not implicated)

109 tests in the suite weren't selected. These cover lower-risk
areas; they run on the periodic full-regression cadence (per
[`regression-suite-selector`](../../qa-test-impact-analysis/skills/regression-suite-selector/SKILL.md)).
```

## Step 5 — Combine with coverage-driven selector

This agent's output is one input; combine with
[`regression-suite-selector`](../../qa-test-impact-analysis/skills/regression-suite-selector/SKILL.md):

```
final_selection = risk_based_tests ∪ coverage_based_tests ∪ previously_failing
```

Risk-based catches "this change touches a high-risk area" cases;
coverage-based catches "this code path is exercised by these tests"
cases. Union is more thorough than either alone.

## Step 6 — Refuse-to-proceed rules

The agent refuses to:

- Run if the risk matrix doesn't exist.
- Recommend a selection if 0 risks are implicated AND the change
  is non-trivial (>10 files). Defer to coverage-based selector.
- Auto-execute the test selection — emits the recommendation; the
  CI runs.

## Step 7 — Continuous improvement

When a regression slips through (caught in production, not by the
selected tests):

- Update the risk matrix to add the missed risk.
- Update `risk-test-mapping.yaml` to map the new risk to test
  paths.
- The next PR triggering similar risks will include those tests.

## Output format

(per Step 4)

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Stale risk matrix                                                     | Selections drift from reality.                                            | Quarterly matrix review (per [`risk-matrix`](../skills/risk-matrix/SKILL.md)). |
| Stale risk-test mapping                                               | Tests move; mapping doesn't update; selections wrong.                    | CI lint: every test path in mapping must exist. |
| Risk matrix without source_paths field                                | Agent can't intersect with diff.                                          | Add `source_paths` per risk in the matrix file. |
| Selecting only risk-based tests (ignoring coverage / regression)      | Misses non-risk-classified tests that still cover changes.                | Combine with other selectors (Step 5). |
| Auto-executing without team review of selection                       | Silent under-coverage if selection is wrong.                              | Recommend, then CI runs (Refuse rules). |

## Limitations

- **Curation cost.** Risk-test mapping needs maintenance.
- **Coarse-grained.** Selects whole files; doesn't go to per-test
  granularity.
- **Risk matrix coverage.** Risks not in the matrix → tests in
  those areas not selected. Pair with coverage-based selector.

## References

- [`risk-matrix`](../skills/risk-matrix/SKILL.md) — preloaded;
  source of risk weights.
- [`regression-suite-selector`](../../qa-test-impact-analysis/skills/regression-suite-selector/SKILL.md)
  — sibling: coverage-driven selection.
- [`risk-based-test-planner`](risk-based-test-planner.md) —
  strategic planner using the matrix at a higher level.
