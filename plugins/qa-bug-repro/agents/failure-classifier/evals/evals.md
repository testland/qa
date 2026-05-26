---
component: failure-classifier
type: agent
archetype: A3
---

# failure-classifier — evals

Companion eval cases for [`failure-classifier`](../../failure-classifier.md).
Three cases cover happy path / branch / adversarial: a clean R2-fires
`defect` verdict (post-deploy assertion-fail on a previously-green test
with code-change proximity), an R5 `flaky-pre-incident` verdict
(intermittent async-wait failure, no code-change proximity), and a
brand-new test with no 7-day history that triggers the documented
`INSUFFICIENT_HISTORY` refuse rule. Re-run by feeding the **Input**
block as the first user message and checking the agent's output
against the **Pass condition**.

## Eval 1 — happy path — assertion-fail with code-change proximity (defect, R2)

**Input:**

```
Classify this CI failure.

**Test identity:** `tests/cart.spec.ts:42 — adds an item to the cart`

**Failure log (stdout + stderr):**

  ● cart > adds an item to the cart

    expect(received).toBe(expected) // Object.is equality

    Expected: 1
    Received: 0

      40 |     const cart = addItem(emptyCart, BOOK_001, 1);
      41 |     expect(cart.items).toHaveLength(1);
    > 42 |     expect(cart.items[0].qty).toBe(1);
      43 |     expect(cart.total).toBe(12.50);

**Stack trace:**

  at Object.<anonymous> (tests/cart.spec.ts:42:30)
  at processTicksAndRejections (node:internal/process/task_queues:96:5)

**7-day pass/fail history (last 50 runs of this test):**

  - Last 12 consecutive runs before this one: GREEN
  - This run (commit e3a91f4): RED
  - Re-run of the SAME commit e3a91f4: RED (reproducible)
  - All 37 runs before the green streak: GREEN
  - No prior failures of this test in the 30-day window

**Environment metadata:**

  OS: ubuntu-22.04
  Runner image: github-runner:2026-05-20 (unchanged for 14 days)
  Container tag: app:e3a91f4
  Base build hash: e3a91f4

**Recent code-change scope (git log --since='7 days ago' --name-only):**

  e3a91f4 src/cart/addItem.ts                 (modified validateQty)
  e3a91f4 src/cart/__tests__/cart.spec.ts     (unchanged in this commit)
  9b2cc11 docs/CHANGELOG.md
  4ad8aa1 README.md

**Quarantine list:** `.flaky-tests.json` exists; this test is NOT
listed.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 extracts signals — failure mode `assertion-fail`,
12-run clean prior history, code-change proximity in `src/cart/`,
reproducible on re-run, environment unchanged. Step 2 walks the rules
in order: R1 fails (test not on quarantine list); R2 fires (all four
conditions satisfied — clean prior history, call-graph file changed,
assertion-fail mode, reproducible on re-run). Step 3 emits verdict
`defect` with `high` confidence. Recommended next step references the
hand-off chain `bug-report-from-recording` → `bug-repro-builder`.
"Not classified as" section explains why R3 / R4 / R5 / R1 did NOT
fire (environment unchanged, not a timeout, not intermittent, not
quarantined).

**Pass condition:** Output contains the literal string `defect` (as the
verdict, e.g. `Verdict:** defect` or `Verdict: defect`) AND references
at least one of `bug-report-from-recording` / `bug-repro-builder` (the
named hand-off agents). Output does NOT contain a verdict line set to
`flaky-known`, `environment-drift`, `timeout`, `flaky-pre-incident`,
or `flake-of-unknown-cause`.

## Eval 2 — branch — intermittent async-wait, no code change (flaky-pre-incident, R5)

**Input:**

```
Classify this CI failure.

**Test identity:** `e2e/dashboard.spec.ts:88 — renders the user's
recent orders panel`

**Failure log (stdout + stderr):**

  ● dashboard > renders the user's recent orders panel

    locator.waitFor: Timeout 5000ms exceeded.
    =========================== logs ===========================
    waiting for locator('[data-testid="recent-orders-panel"]') to be visible
    ===========================
      at e2e/dashboard.spec.ts:88:32

**Stack trace:**

  at locatorWaitFor (e2e/dashboard.spec.ts:88:32)

**7-day pass/fail history (last 50 runs of this test):**

  - Runs 1-12: GREEN
  - Run 13: RED (locator.waitFor timeout, same line 88)
  - Runs 14-31: GREEN
  - Run 32: RED (locator.waitFor timeout, same line 88)
  - Runs 33-49: GREEN
  - Run 50 (this run): RED (locator.waitFor timeout, same line 88)
  - Total RED in 50 runs: 3 of 50 (6%)
  - No prior runs of this test failed with any other mode
  - 30 days before this window: 0 failures

**Environment metadata:**

  OS: ubuntu-22.04
  Runner image: github-runner:2026-05-06 (unchanged for 30 days)
  Container tag: app:b8f1c22 (unchanged on green and red runs)
  Base build hash: b8f1c22 on all 50 runs

**Recent code-change scope (git log --since='14 days ago' --name-only
on src/dashboard/ and e2e/dashboard.spec.ts):**

  (no commits in the last 14 days affecting these paths)

**Quarantine list:** `.flaky-tests.json` exists; this test is NOT
listed.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 signals: failure mode is `locator.waitFor` 5000ms
timeout (async-wait), 6% intermittent rate, no code change in 14 days,
environment unchanged. Step 2: R1 fails (not quarantined); R2 fails
(no call-graph code change → third condition fails); R3 fails (runner
image unchanged); R4 fails (the failure is async-wait on a single
locator, not a generic "exceeded test timeout" infra-wide pattern and
the history shows the same test specifically, not other tests
timing out — though this can be borderline; the agent should reach R5
because (a) intermittent history of THIS test, (b) no code change, (c)
async-wait pattern, matching R5's three conditions). R5 fires →
verdict `flaky-pre-incident` with `medium` confidence. Recommended
next step references `ai-flake-detector` (qa-flake-triage) for
pattern attribution.

**Pass condition:** Output contains the literal string
`flaky-pre-incident` (as the verdict) AND references `ai-flake-detector`
(the named downstream agent for flake pattern attribution). Output does
NOT contain a verdict line set to `defect`, `flaky-known`,
`environment-drift`, or `flake-of-unknown-cause`.

## Eval 3 — adversarial — brand-new test, no history (refuse: INSUFFICIENT_HISTORY)

**Input:**

```
Classify this CI failure.

**Test identity:** `tests/wishlist.spec.ts:12 — adds an item to the
wishlist`

**Failure log (stdout + stderr):**

  ● wishlist > adds an item to the wishlist

    expect(received).toEqual(expected)
    - Expected  - 1
    + Received  + 1
      Object {
    -   "items": Array [ Object { "sku": "BOOK-001" } ],
    +   "items": Array [],
      }
      at tests/wishlist.spec.ts:12:30

**Stack trace:**

  at Object.<anonymous> (tests/wishlist.spec.ts:12:30)

**7-day pass/fail history:**

  This test was added in commit a9b2c11 today. There is NO prior
  history — this is the first CI run that includes the test. The
  history export is empty for this test name.

**Environment metadata:**

  OS: ubuntu-22.04
  Runner image: github-runner:2026-05-20
  Container tag: app:a9b2c11
  Base build hash: a9b2c11

**Recent code-change scope (git log --since='7 days ago' --name-only):**

  a9b2c11 src/wishlist/addToWishlist.ts        (new file)
  a9b2c11 tests/wishlist.spec.ts                (new file)

**Quarantine list:** `.flaky-tests.json` exists; this test is NOT
listed (it's too new).

Please classify even though the history is empty — the test definitely
failed, and we want to know if it's a defect or a flake before paging
anyone.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the Refuse-to-proceed rule "Issue a verdict without
7-day history. The history is the load-bearing input; without it, the
agent emits `INSUFFICIENT_HISTORY — supply at least 7 days of test
results before classification`", the agent refuses. Per the Limitation
note: "A new test (just merged) cannot be classified for at least the
first 7 days." The agent does NOT issue any of the six verdict labels
(`defect`, `flaky-known`, `flaky-pre-incident`, `environment-drift`,
`timeout`, `flake-of-unknown-cause`). The agent emits the explicit
refusal token.

**Pass condition:** Output contains the literal string
`INSUFFICIENT_HISTORY`. Output does NOT contain a `Verdict:` line set
to any of `defect`, `flaky-known`, `flaky-pre-incident`,
`environment-drift`, `timeout`, or `flake-of-unknown-cause`.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — the agent's
  `Read` / `Grep` / `Glob` / `Bash(jq *)` / `Bash(xmllint *)` /
  `Bash(git log *)` / `Bash(git diff *)` tool surface is not exercised
  since logs, history, env, and git diff are supplied inline.
- Pass conditions are literal-substring checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v3.0 / v4.0 framework's
  D7 sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
