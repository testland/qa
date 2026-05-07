---
name: unit-test-coverage-targeter
description: "Builds a \"what to test next\" recommendation by combining a coverage report (LCOV / Cobertura / coverage.py JSON / Jest JSON / JaCoCo XML) with the PR's `git diff`, ranking uncovered branches by risk × cost — risk weighted by McCabe cyclomatic complexity and code-churn frequency, cost weighted by the unit-test pyramid layer (unit tests cheaper than integration than E2E). Emits a prioritized list with concrete file:line targets and the test layer recommended for each. Use when a team has the budget to write 5–10 new tests and needs help picking which uncovered code to target first instead of blindly chasing 100% coverage."
rating: 23
d6: 4
archetype: S3
---

# unit-test-coverage-targeter

## Overview

100% coverage isn't the goal; **risk-adjusted coverage** is. A
50-line uncovered helper that hasn't been changed in 4 years is
lower priority than a 10-line uncovered branch on a payment-handling
function that gets edited every week.

This skill builds a ranked list of uncovered branches, scoring
each by:

- **Risk weight** — McCabe cyclomatic complexity ([cyclomatic][cc])
  + git churn frequency (commits in last N days) + PR-touch (was the
  file changed in this PR?).
- **Cost weight** — Per the test pyramid ([test-pyramid][tp]),
  unit tests are cheap, integration tests are medium, UI tests are
  expensive. The recommendation includes the layer.

[cc]: https://en.wikipedia.org/wiki/Cyclomatic_complexity
[tp]: https://martinfowler.com/bliki/TestPyramid.html

The output is **5–10 specific test targets** the team can take in
one PR — not a 200-line "everything uncovered" dump.

## When to use

- A coverage report shows 60–80% — adding 5 tests should target the
  highest-impact uncovered code, not random low-hanging fruit.
- A PR's coverage gate is failing on new files; the team needs to
  know which uncovered branches actually matter.
- A test-debt sprint is upcoming and the team needs a 10-test
  budget allocated to the right places.
- Pair with [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md)
  for the "what regressed" + "what to add" combo.

## Step 1 — Inputs

Two required + two optional inputs:

| Input              | Required | Source                                                      |
|--------------------|:--------:|-------------------------------------------------------------|
| Coverage report    |    ✓     | LCOV / Cobertura / Jest JSON / coverage.py JSON / JaCoCo XML |
| Source tree        |    ✓     | Project root checkout                                        |
| `git log` history  |   opt    | For churn weighting (Step 3).                                |
| PR diff            |   opt    | For PR-touch weighting (Step 4).                             |

## Step 2 — Extract uncovered branches

The shape (after parsing per upstream parser):

```python
{
  'path': 'src/checkout/cart.ts',
  'uncovered_branches': [
    { 'line': 42, 'condition': 'if (item.stock < quantity)', 'arms_uncovered': 1, 'arms_total': 2 },
    { 'line': 78, 'condition': 'switch (status)', 'arms_uncovered': 3, 'arms_total': 5 },
  ],
  'uncovered_lines': [33, 34, 35, 92, 93],
  'covered_pct': 65.4,
}
```

Per language tool:

- LCOV: parse `BRDA:<line>,<block>,<branch>,<taken>` records;
  `taken == '-'` is uncovered. Use [`lcov-analysis`](../lcov-analysis/SKILL.md).
- Cobertura: parse `<line branch="true" condition-coverage="50% (1/2)"/>`;
  use [`cobertura-analysis`](../cobertura-analysis/SKILL.md).
- Jest JSON `b` field: arrays of arm hit counts; uncovered = 0.
  Use [`jest-coverage-analysis`](../jest-coverage-analysis/SKILL.md).
- JaCoCo XML: parse `<counter type="BRANCH" missed="N" covered="M"/>`
  per method, then read source lines for context.
  Use [`jacoco-analysis`](../jacoco-analysis/SKILL.md).

## Step 3 — Compute the risk weight

```python
def risk_weight(file_path, branch):
    cyclomatic = mccabe_complexity(file_path, branch.line)
    churn      = git_churn(file_path, days=90)
    return (
        normalize(cyclomatic, 1, 20) * 0.5     # 50% complexity weight
        + normalize(churn,    0, 50) * 0.5     # 50% churn weight
    )
```

### McCabe cyclomatic complexity

Per [cyclomatic][cc]: McCabe's formula is `M = E - N + 2`
(edges − nodes + 2). The threshold convention:

> "1–10: Simple procedure, little risk"
> "11–20: More complex, moderate risk"
> "21–50: Complex, high risk"
> ">50: Untestable code, very high risk"
> ([cyclomatic][cc])

Compute via per-language tools:

```bash
# Python
radon cc src/ -a

# JavaScript / TypeScript
npx complexity-report src/ -f json

# Java
# JaCoCo's COMPLEXITY counter (already in jacoco.xml per jacoco-analysis)
```

Function with cyclomatic >10 + uncovered branch = strong target.

### Git churn

```bash
# Commits in the last 90 days touching this file
git log --since='90 days ago' --format= -- src/checkout/cart.ts | wc -l
```

High-churn files are where bugs accumulate; uncovered branches in
high-churn files are the highest-priority targets.

Per [cyclomatic][cc]: "reducing the cyclomatic complexity of code is
not proven to reduce the number of errors or bugs in that code." Use
complexity as a *risk indicator*, not a goal.

## Step 4 — PR-touch boost

If the PR diff (Step 1 optional input) changed a file, **boost its
risk weight by 1.5×**. Newly-edited code is strictly higher
regression risk than untouched code.

```python
def pr_boost(file_path, pr_changed_files):
    return 1.5 if file_path in pr_changed_files else 1.0

final_risk = risk_weight(...) * pr_boost(...)
```

## Step 5 — Cost weight (test pyramid layer)

Per [test-pyramid][tp], the canonical layers (Cohn 2009):

| Layer            | Cost (relative) | Recommend for                                      |
|------------------|----------------:|----------------------------------------------------|
| Unit             |       1×        | Pure functions, business-logic branches.           |
| Service / API    |       3×        | Cross-module integration, controllers, repos.     |
| UI / E2E         |      10×        | User flows, browser interactions.                  |

Per [test-pyramid][tp]: "you should have many more low-level
UnitTests than high level BroadStackTests running through a GUI ...
UI tests are brittle, expensive to write, and time consuming to
run."

The targeter classifies each candidate branch by file path
heuristic:

```python
def layer(path):
    if any(s in path for s in ['/components/', '/views/', '/pages/', '/e2e/']):
        return 'ui-or-e2e'
    if any(s in path for s in ['/api/', '/routes/', '/controllers/', '/services/']):
        return 'service'
    return 'unit'
```

## Step 6 — Score and rank

```python
COST_BY_LAYER = {'unit': 1, 'service': 3, 'ui-or-e2e': 10}

for candidate in candidates:
    candidate['score'] = candidate['risk'] / COST_BY_LAYER[candidate['layer']]

candidates.sort(key=lambda c: c['score'], reverse=True)
```

Score = risk / cost. A unit-layer branch with risk 0.6 (score
0.60) beats a UI-layer branch with risk 0.9 (score 0.09).

Take the top **5–10 candidates** (configurable). More than 10 is a
to-do list, not a recommendation.

## Step 7 — Render

```markdown
## Uncovered branches — recommended targets (top 7)

This PR adds 12 uncovered branches in code touched by the PR. The
prioritized list focuses test budget on high-risk × low-cost
targets per the [test pyramid][tp].

| # | File                                | Line | Branch                              | Layer | Risk | Recommendation |
|---|-------------------------------------|-----:|-------------------------------------|-------|-----:|----------------|
| 1 | `src/checkout/promo.ts`              |  42 | `if (codeIsValid && !expired)`       | unit  | 0.91 | Add a unit test for the expired-code path. |
| 2 | `src/checkout/promo.ts`              |  78 | `switch (codeType)` arm `'BOGO'`     | unit  | 0.85 | Add a unit test per arm; BOGO arm uncovered. |
| 3 | `src/api/payments.ts`                | 134 | `if (provider === 'stripe')`         | service | 0.82 | Add an integration test for the stripe path. |
| 4 | `src/checkout/cart.ts`               |  21 | `if (item.stock < quantity)`         | unit  | 0.78 | Add a unit test for stock-shortfall edge case. |
| 5 | `src/api/payments.ts`                | 200 | `try / catch` (catch arm)            | service | 0.65 | Add a test that triggers the failure path. |
| 6 | `src/components/CheckoutModal.tsx`    |  88 | `if (showPromoBanner)`                | unit  | 0.55 | Add a snapshot/component test for the banner-hidden case. |
| 7 | `src/api/orders.ts`                  | 156 | `if (status === 'fulfilled')`        | service | 0.48 | Add an integration test for the fulfilled-status path. |

### Skipped (low score)

5 candidates skipped — see `coverage-targets.json` for the full
list. Highest-risk skipped: UI-layer test that would catch a 0.9
risk branch but cost 10× a unit test (score 0.09).

### Approach

For each target above, the recommended test shape:

- **Unit (5)**: Add a per-branch test in the existing `*.spec.ts`;
  use `expect.fail` if no path triggers the branch yet.
- **Service (2)**: Use [`testcontainers`](../../qa-test-environment/skills/testcontainers/SKILL.md)
  to bring up a real Postgres + the Stripe sandbox; assert the
  branch outcome.
```

## Step 8 — Wire into CI as advisory

This skill is **advisory, not gating**. Post the recommendation as
a PR comment via `coverage-diff-reporter`'s sticky-comment mechanism
(see [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md)
Step 7) but don't fail the build on it:

```yaml
- name: Generate coverage targets
  if: github.event_name == 'pull_request'
  run: |
    python scripts/coverage_targets.py \
      --coverage current.json \
      --diff <(git diff --name-only origin/${{ github.base_ref }}...HEAD) \
      --top 7 \
      > targets.md

- name: Post sticky comment
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    header: coverage-targets
    path: targets.md
```

## Anti-patterns

| Anti-pattern                                                            | Why it fails                                                                  | Fix |
|-------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Recommending coverage targets without considering test layer            | Suggests UI tests for branches that should be unit-tested; cost ignored.     | Score = risk / cost (Step 6). |
| Listing every uncovered branch                                           | 200-row list; team ignores.                                                  | Top 5–10 (Step 6). |
| Pure-coverage chase (every uncovered line is a target)                  | Hits 100% by writing low-value tests; signal-to-noise collapses.            | Risk-weight by complexity + churn (Step 3). |
| Treating cyclomatic complexity as a goal                                 | Per [cyclomatic][cc]: reducing complexity isn't proven to reduce defects.   | Use complexity as a risk indicator only (Step 3). |
| Ignoring PR-changed files                                                | A new function added in the PR with 0 coverage isn't surfaced.               | PR-touch boost (Step 4). |
| Recommending tests for code marked `# pragma: no cover` / `istanbul ignore` | The team explicitly excluded that code.                                       | Skip files / lines with explicit ignores. |
| Blocking the build on the recommendation                                  | Recommendation is opinion; gating turns it into bureaucracy.                  | Advisory comment only (Step 8); the actual gate is `lcov-analysis` / `cobertura-analysis`. |

## Limitations

- **Cyclomatic complexity is one signal, not the truth.** Per
  [cyclomatic][cc]: "captures only one aspect of software, so
  relying on it alone may provide an incomplete representation."
  Pair with churn for a better signal.
- **Layer heuristic is path-based.** A `services/` directory might
  contain pure functions (unit) and DB-touching code (integration).
  Tune the heuristic per project.
- **No semantic understanding of "what the branch does".** The
  targeter says "branch at line 42 needs a test"; it doesn't say
  "the test should assert that expired codes return 400".
- **Churn requires `git log`.** Shallow CI clones (default
  `actions/checkout` with no `fetch-depth`) lack the history;
  `fetch-depth: 0` is needed.
- **No long-term memory.** A target ignored three PRs in a row keeps
  reappearing; consider persisting a "snoozed" list in a
  `coverage-targets.snoozed.json` checked into the repo.

## References

- [test-pyramid][tp] — Mike Cohn's pyramid (2009), three layers
  (unit / service / UI), "many more low-level UnitTests than high
  level BroadStackTests" rationale (UI tests "brittle, expensive
  to write, and time consuming to run").
- [cyclomatic][cc] — McCabe (1976) cyclomatic complexity formula
  `M = E - N + 2`, threshold convention (1–10 / 11–20 / 21–50 /
  >50), the warning that "reducing the cyclomatic complexity of
  code is not proven to reduce the number of errors or bugs".
- [`lcov-analysis`](../lcov-analysis/SKILL.md),
  [`cobertura-analysis`](../cobertura-analysis/SKILL.md),
  [`jest-coverage-analysis`](../jest-coverage-analysis/SKILL.md),
  [`jacoco-analysis`](../jacoco-analysis/SKILL.md),
  [`coverage-py-analysis`](../coverage-py-analysis/SKILL.md) —
  upstream parsers this skill consumes.
- [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md) —
  sibling reporter; the diff identifies what regressed, the
  targeter identifies what to add next.
