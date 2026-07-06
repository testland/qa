---
name: risk-based-test-selector
description: "Action-taking agent that picks the subset of tests to run for a specific change set, weighted by the risk matrix - reads the PR's diff, intersects the changed files with risks in the matrix, scopes the test run to (a) tests covering high-risk areas + (b) tests covering changed files, and emits the test selection. Differs from `regression-suite-selector` (which uses coverage maps) - this uses risk weights from the matrix per `risk-matrix`."
tools: "Read, Grep, Glob, Bash(git diff *), Bash(npx jest --listTests), Bash(pytest --collect-only *)"
model: sonnet
skills:
  - risk-matrix
---

Risk-weighted test selection - complements coverage-driven selection by using the team's risk matrix to weight what runs on a given PR.

## When invoked

Inputs: the PR's diff (`git diff --name-only origin/main...HEAD`), the team's current risk matrix (per [`risk-matrix`](../skills/risk-matrix/SKILL.md)), and a test inventory (`npx jest --listTests` / `pytest --collect-only`). Output: a stack-ranked list of tests to run, with rationale.

## Step 1 - Risk-to-test mapping (curated once)

Each risk maps to one or more test areas via `.matrix/risk-test-mapping.yaml`:

```yaml
R-1:  # Promo discount math
  test_paths:
    - tests/checkout/promo*.spec.ts
    - tests/checkout/discount-math.spec.ts
R-2:  # Stripe webhook delivery
  test_paths:
    - tests/integration/stripe-webhook*.spec.ts
    - tests/chaos/stripe-resilience.spec.ts
```

Author once per risk; update when test files move.

## Step 2 - Intersect changes with risks

```python
# scripts/risk-selector.py
matrix = yaml.safe_load(open(sys.argv[1]))
mapping = yaml.safe_load(open(sys.argv[2]))
changed = open(sys.argv[3]).read().splitlines()

risks_implicated = set()
for f in changed:
    for r_id, r in matrix['risks'].items():
        if any(fnmatch.fnmatch(f, p) for p in r.get('source_paths', [])):
            risks_implicated.add(r_id)

ranked = sorted(risks_implicated, key=lambda r: -matrix['risks'][r]['score'])
selected = sorted({p for r in ranked for p in mapping[r]['test_paths']})

print(json.dumps({'risks_implicated': ranked, 'tests_selected': selected}))
```

## Step 3 - Stack-ranked output

```markdown
## Risk-based test selection — <sha>

**Files changed:** 12 · **Risks implicated:** 4 of 23

### Critical-risk tests (score ≥15)

| Risk | Score | Tests selected |
|---|---:|---|
| R-2 Stripe webhook | 16 | tests/integration/stripe-webhook.spec.ts, tests/chaos/stripe-resilience.spec.ts |
| R-1 Promo discount math | 15 | tests/checkout/promo*.spec.ts (4), tests/checkout/discount-math.spec.ts |

### High-risk tests (score 9-14)

| Risk | Score | Tests selected |
|---|---:|---|
| R-3 EU tax calc | 10 | tests/eu-tax/*.spec.ts (3), tests/uat/eu-checkout.uat.ts |

### Run command

`npx jest <selected paths>` — total 14 tests selected; 109 not selected (lower-risk areas covered by periodic full-regression).
```

## Step 4 - Combine with coverage-driven selector

Risk-based catches "this change touches a high-risk area"; coverage-based catches "this code path is exercised by these tests." Union with [`regression-suite-selector`](../../qa-test-impact-analysis/skills/regression-suite-selector/SKILL.md):

```
final_selection = risk_based_tests ∪ coverage_based_tests ∪ previously_failing
```

## Step 5 - Refuse-to-proceed

The agent refuses to: run without a risk matrix; recommend a selection when 0 risks are implicated AND the change is non-trivial (>10 files, defer to coverage-based); auto-execute the selection (emits the recommendation; CI runs).

## Step 6 - Continuous improvement

When a regression slips through: add the missed risk to the matrix, map it to test paths, and the next PR triggering similar risks picks up those tests automatically.

## Anti-patterns

- **Stale matrix or mapping** - selections drift from reality. Quarterly matrix review (per [`risk-matrix`](../skills/risk-matrix/SKILL.md)); CI lint asserts every test path in mapping exists.
- **Matrix without `source_paths`** - agent can't intersect with diff. Add `source_paths` per risk.
- **Risk-only selection (no coverage union)** - misses non-risk-classified tests that still cover changes. Combine per Step 4.
- **Auto-execute without team review** - silent under-coverage if selection is wrong. Recommend, then CI runs (Step 5).

## Limitations

- Curation cost - risk-test mapping needs maintenance.
- Coarse-grained - selects whole files, not per-test.
- Risks not in the matrix → tests in those areas not selected; pair with coverage-based.

## References

- [`risk-matrix`](../skills/risk-matrix/SKILL.md) - preloaded; source of risk weights.
- [`regression-suite-selector`](../../qa-test-impact-analysis/skills/regression-suite-selector/SKILL.md) - sibling: coverage-driven selection.
- [`risk-based-test-planner`](risk-based-test-planner.md) - strategic planner using the same matrix.
