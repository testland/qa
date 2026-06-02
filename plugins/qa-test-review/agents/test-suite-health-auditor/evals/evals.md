---
component: test-suite-health-auditor
type: agent
archetype: A3
---

# test-suite-health-auditor - evals

Companion eval cases for [`test-suite-health-auditor`](../../test-suite-health-auditor.md).
Three cases cover happy path / branch / adversarial: pyramid inversion
(verdict `Needs refactor`), healthy suite (verdict `Healthy`), and a
sample-too-small refusal (verdict `Cannot assess`). Re-run by feeding the
**Input** block as the first user message and checking the agent's output
against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - pyramid inversion (Needs refactor)

**Input:**

```
Audit our test suite. Here is the file inventory by tier (we tag with
`pytest -m {unit,integration,e2e}` markers, so classification is
unambiguous):

  tests/unit/             50 files,   2_100 LOC
  tests/integration/     100 files,   8_400 LOC
  tests/e2e/             200 files,  24_000 LOC

Total: 350 test files.

CI data: not available — we don't have JUnit XML history exported.

Stated target: we don't have a documented pyramid target.
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24), opus (2026-05-24)

**Expected:** Step 3 detects pyramid inversion (200 E2E > 50 unit). Axis
`Pyramid ratio` → `Critical`. Per the agent's calibration rule, the suite
verdict floor becomes `Needs refactor`. Step 4 emits `n/a - CI flake data
not supplied`. Top-1 recommendation calls for rebalancing toward unit
tests; the report cites the ice-cream-cone / pyramid-inversion anti-pattern.
"What was NOT assessed" lists CI flake data and any axis that fell back to
`n/a`.

**Pass condition:** Output contains the literal string `Needs refactor`
AND at least one of `pyramid inversion` / `inverted` / `ice-cream cone`
(case-insensitive). Output does NOT contain a `Healthy` verdict line.

## Eval 2 - branch - healthy suite

**Input:**

```
Audit our test suite. Tier classification uses `pytest -m` markers so it's
unambiguous:

  tests/unit/             350 files,  18_000 LOC
  tests/integration/       80 files,   6_400 LOC
  tests/e2e/               30 files,   4_200 LOC

Total: 460 test files (78% / 18% / 4% ratio).

CI data: last 50 runs per layer:
  unit:        flake rate 0.8%
  integration: flake rate 1.4%
  e2e:         flake rate 1.9%

Stated target: 70/20/10 (canonical pyramid; documented in
docs/test-strategy.md).

Selector quality scan E2E: 0 positional XPath, 0 hashed CSS class
selectors found.

Assertion quality scan: 0 tautological assertions found.
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24)

**Expected:** Step 3 deltas: unit +8pp, integration -2pp, e2e -6pp - all
within ±10pp → `Pyramid ratio` axis `Healthy`. Step 4: every layer
<2% flake → `Flake rate` axis `Healthy`. Steps 6 and 7 find no
fragile selectors or tautological assertions. No `Critical` findings; no
`Important` findings. Verdict line: `Healthy`. Top-3 recommendations are
either empty or strictly keep-the-current-state items (no prune /
refactor calls).

**Pass condition:** Output contains the literal string `Healthy` as the
verdict AND does NOT contain the word `Critical` (case-sensitive - the
finding-severity Critical, not generic English use). Output does NOT
recommend a refactor or prune action in the Top 3 (those slots either
say `keep` or the section explicitly notes no remediation required).

## Eval 3 - adversarial - sample too small (refuse to opine)

**Input:**

```
Audit our test suite. We're a small startup, here is everything we have:

  tests/login_test.py
  tests/checkout_test.py
  tests/dashboard_test.py

Total: 3 test files. No CI flake data, no documented strategy, no tier
convention (we just dump everything in tests/).
```

**Target models:** sonnet (2026-05-24)

**Expected:** Refuses to issue a `Healthy` / `Needs pruning` /
`Needs refactor` verdict. The Refuse-to-proceed rule "<3 test files in
the supplied tree" is the controlling case (the input is exactly 3, which
is on the threshold - the rule treats <3 as the strict refuse; at 3 the
agent should still refuse because tier classification is ambiguous,
selector / assertion scans yield no statistical signal, and ROI cannot
be computed). Verdict line: `Cannot assess` (with reason qualifier).
Recommends [`test-code-critic`](../../test-code-critic.md) for per-test
review - that is the named hand-off in the agent's Refuse-to-proceed
section. Does NOT emit a 7-row findings table claiming to assess the
suite.

**Pass condition:** Output contains the literal string `Cannot assess`
AND mentions `test-code-critic` (the named per-test hand-off). Output
does NOT contain a `Healthy` verdict line; does NOT contain a
`Needs pruning` verdict line; does NOT contain a `Needs refactor` verdict
line. (The agent may not claim to assess the suite - that is the entire
adversarial point of the eval.)

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a sample repo.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow `Bash(git log
  | diff | find *)`) is read-only - eval re-runs cannot modify the test
  repository or production source.
- Eval cases were authored 2026-05-24 against the v3.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
