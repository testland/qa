---
component: e2e-flake-bisector
type: agent
archetype: A2
---

# e2e-flake-bisector — evals

Companion eval cases for [`e2e-flake-bisector`](../../e2e-flake-bisector.md).
Three cases cover happy path / branch / adversarial: a Playwright
bisect that isolates parallel-state + ordering as the axis (happy
artifact = bisect report), a Cypress bisect against a different
framework / driver / config (branch — non-Playwright runner with
different axis variations), and a refusal when the input scope is
incomplete (no baseline failure rate, no known-flake test target). Re-run
by feeding the **Input** block as the first user message and checking
the agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates below are the
eval-authoring date — each case is designed to be reproducible against
any tier.

## Eval 1 — happy path — Playwright bisect produces report (parallel + ordering)

**Input:**

```
Bisect the flake on tests/checkout.spec.ts:42.

Project setup:
  Runner:       Playwright v1.49 (TypeScript)
  Workers:      default -j 4 on CI
  Config:       playwright.config.ts (workers=4, retries=1, fullyParallel=true)
  Baseline:     the test fails 3/20 (15%) under the standard CI config
  Target test:  tests/checkout.spec.ts:42 — "loads order summary"
  Runtime per execution: ~2s

Please produce the bisect report. Use N=20 per axis.

For each axis sweep variation, here is what the recorded failure rate
came out to be in our offline trial (use these — assume CI cost is
already spent):

  Run-alone (alone):                   0/20  (0%)
  Worker count -j 1:                   1/20  (5%)
  Worker count -j 4:                   8/20  (40%)
  Worker count -j 8:                  12/20  (60%)
  Random order --randomize:           12/20  (60%)
  Network throttle 100kbps:            3/20  (15%)
  Viewport 375:                        3/20  (15%)
  Viewport 1280:                       4/20  (20%)
  Animation flag allow:                4/20  (20%)
  Repetition 100 sequential:           3/100 (3%)
  OS Linux container (baseline):       3/20  (15%)
  OS macOS runner:                     2/20  (10%)
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Produces the bisect report artifact per the agent's
documented output format. Run-alone (0/20) and -j 1 (1/20) reduce
failure rate by >2x relative to baseline 15%; -j 4 (40%), -j 8 (60%),
and `--randomize` (60%) all show >2x increase. Classification:
shared parallel state + test ordering (Pattern 3). Recommends
hand-off to
[`parallel-isolation-checker`](../../parallel-isolation-checker.md) to
localize the leak. Confidence: high. Network throttle / viewport /
animation / OS / 100-sequential repetition all fall within noise.

**Pass condition:** Output contains the literal string
`tests/checkout.spec.ts:42` AND mentions
`parallel-isolation-checker` (the named hand-off) AND contains both
the word `parallel` and the word `order` (or `ordering`)
case-insensitive. Output does NOT classify the root cause as
`async/timing` or `network`.

## Eval 2 — branch — Cypress bisect (different runner, different axes)

**Input:**

```
Bisect the flake on cypress/e2e/users.spec.cy.ts ("creates a user"
test, line 88).

Project setup:
  Runner:       Cypress v13 (JavaScript, no TypeScript)
  Workers:      cypress-parallel via cypress run --record --parallel
                (4 CI nodes), but per-node single-process
  Config:       cypress.config.js (testIsolation=true, video=false)
  Baseline:     the test fails 0/20 locally, 10/20 (50%) on CI
                with --parallel (specs distributed across nodes)
  Target test:  cypress/e2e/users.spec.cy.ts — "creates a user"
  Runtime per execution: ~6s

Please produce the bisect report. Recorded axis sweep:

  Run-alone (cypress run --spec users.spec.cy.ts only):  0/20  (0%)
  Random order (cypress run --random):                  14/20  (70%)
  Single-spec mode locally (no parallelism):             0/20  (0%)
  Parallel across 4 CI nodes:                           10/20  (50%)
  Parallel across 1 CI node:                             0/20  (0%)
  Network throttle (cy.intercept with delay 1000ms):     0/20  (0%)
  Viewport 375:                                          0/20  (0%)
  Viewport 1280:                                         0/20  (0%)

Note: Cypress does not have a worker count axis the same way
Playwright does — each node is a separate Cypress process. Treat
"parallel across N nodes" as the parallelism axis.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Produces the bisect report adapted to the Cypress runner
— different framework / driver / config than Eval 1. Run-alone passes
(0/20); parallel-across-4-nodes (50%) and random-order (70%) both
show >2x increase vs. local baseline. Classification: test ordering
(Pattern 2) is the dominant signal — random order alone hits 70%.
Parallelism interacts with ordering (specs distributed differently
across nodes), so a shared-parallel-state classification is also
acceptable. The report should not assert "worker count" findings
(Cypress doesn't have that axis the same way) and should adapt
terminology to nodes/specs. Recommended next step still routes to
[`parallel-isolation-checker`](../../parallel-isolation-checker.md)
because the underlying root cause is the same family.

**Pass condition:** Output contains the literal string
`cypress/e2e/users.spec.cy.ts` AND mentions both `Cypress` (or
`cypress`) and one of `ordering` / `random order` / `Pattern 2`
(case-insensitive). Output does NOT recommend changing Playwright
`workers` config (different framework) AND does NOT classify the root
cause as `viewport` or `network`.

## Eval 3 — adversarial — incomplete input (no baseline, refuse)

**Input:**

```
Please bisect our flake. Here is what we have:

  "Some test in our suite has been failing lately. We're not sure
   which one. We're also not sure if it's deterministic or
   intermittent. Can you figure out which axis is the problem and
   fix it?"

That's the full request from the engineering lead. They want a
turnkey answer by EOD.
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to run the bisect. Required inputs are absent:
no target test identifier (file:line), no baseline failure rate, no
runner / config, no axis sweep data, no clarification on whether the
failure is deterministic. The agent's own "When NOT to use this agent"
note also covers the deterministic-vs-intermittent question — for
intermittent failures, bisect is right; for deterministic regressions,
the right hand-off is
[`regression-bisector`](../../regression-bisector.md). The agent
should ask for (or list) the specific missing inputs and not invent a
target test, baseline, or axis data to satisfy the deadline framing.
Does NOT emit a bisect report table claiming to have classified the
root cause.

**Pass condition:** Output contains one of `missing` / `need` /
`required` / `cannot` (case-insensitive) in the context of the
incomplete input. Output does NOT contain a markdown table row with
`Failure rate` and a numeric value (no fabricated axis sweep). Output
does NOT claim a classification such as `parallel`, `ordering`,
`async/timing`, or `Pattern N` against an unspecified test.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — the eval
  feeds pre-recorded axis sweep data so reviewers do not need to burn
  hundreds of CI runs to reproduce; the bisect-orchestration logic
  is what is under test.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring
  (`tests/checkout.spec.ts:42`, `parallel-isolation-checker`,
  `cypress/e2e/users.spec.cy.ts`, `missing`, etc.).
- The agent's tool surface includes `Bash(npx playwright test *)`,
  `Bash(jest *)`, `Bash(npx cypress *)` — eval re-runs against a real
  repo would actually execute the test runners; against the pasted
  data above, the eval verifies the orchestration / classification /
  hand-off logic without needing a sandbox.
