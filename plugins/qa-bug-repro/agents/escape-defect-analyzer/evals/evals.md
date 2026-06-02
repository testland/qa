---
component: escape-defect-analyzer
type: agent
archetype: A4
---

# escape-defect-analyzer - evals

Companion eval cases for [`escape-defect-analyzer`](../../escape-defect-analyzer.md).
Three cases cover happy path / branch / adversarial: scaffolding a
test-gap escape report with a concrete failing-test prevention asset
(canonical artifact), a tooling-gap report with an observability metric
instead of a test (different target shape), and refusing to scaffold
when the fix commit / production-state evidence is missing. Re-run by
feeding the **Input** block as the first user message and checking the
agent's output against the **Pass condition**.

## Eval 1 - happy path - test-gap escape report with concrete unit-test prevention asset

**Input:**

```
Run an escape-defect analysis. Generate the report file.

Bug report:
  Bug ID: #1234
  Summary: calculateTotal crashes on empty cart
  Severity: high (5xx in production checkout flow)

Fix commit:
  SHA: f17e9b0
  PR: #4502 "fix(checkout): guard empty items array in calculateTotal"
  Diff (src/checkout/total.ts):
     const tax = order.items[0].amount * 0.08;
    +const tax = order.items.length === 0 ? 0 : order.items[0].amount * 0.08;

Production-state evidence:
  First user report timestamp: 2026-04-29T10:14:00Z (Sentry)
  First error-monitoring crash: 2026-04-29T10:08:42Z (Sentry event 9f3a)
  Deployment that introduced the regression: v4.7.0 shipped 2026-04-29T09:55Z
  Customers affected (estimated): ~340 sessions over 8 hours

Existing test file:
  src/checkout/total.test.ts — 6 passing test cases, all covering populated
  carts. No empty-cart test. No null/undefined cart guard tests.
  Test runner: vitest, ~~ jest config / pytest / etc. ~~ — only vitest.

Date of analysis: 2026-05-04.

CI evidence:
  total.test.ts ran in the gating CI job. No quarantined or skipped tests.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Steps 1-3 read the bug, the fix commit, and the
production-state evidence. Step 4 classifies the escape category as
**test-gap** with sub-pattern `edge case not exercised` (the test
existed in `total.test.ts`, gated CI ran, but no empty-cart case was
written - that is "the right framework / CI / process, but no test
existed for this specific case"). Step 5 proposes a concrete prevention
asset - a Vitest `it('returns 0 for an empty cart (regression for
#1234)', ...)` extending `src/checkout/total.test.ts` - matching the
canonical example block. Step 6 generates the report at
`docs/escape-defects/2026-05-04-checkout-empty-cart-crash.md` (or a
similar dated slug). The header block includes Days in production
(<1 day given the same-day timeline), Customers affected (~340), Fix
commit `f17e9b0`, Escape category `test-gap`, Sub-pattern `edge case
not exercised`. The "What it verifies" paragraph names that the new
test would have failed against the introducing commit (whichever shipped
v4.7.0). The agent uses systems-not-people language throughout (no
"engineer X should have"). It does NOT propose "add more tests"
generically - the asset is a concrete vitest case.

**Pass condition:** Output contains the literal string `test-gap` (the
escape category) AND mentions `vitest` or a vitest-style `it(`
declaration (the concrete prevention asset). Output names the fix
commit `f17e9b0`. Output writes to a path under `docs/escape-defects/`.
Output does NOT contain blame-language about a specific engineer (no
"engineer X should have").

## Eval 2 - branch - tooling-gap with observability metric (different target shape)

**Input:**

```
Run an escape-defect analysis. Generate the report file.

Bug report:
  Bug ID: #5012
  Summary: Worker pool exhausts memory after ~14 hours under steady
  load; container OOMs and restarts.
  Severity: high (causes intermittent request drops for ~2-3 minutes
  per restart).

Fix commit:
  SHA: 8c2d1aa
  PR: #4577 "fix(workers): release pooled buffers in idle reaper"
  The fix releases buffers held by idle workers. Diff is in
  src/workers/pool.ts (a 4-line change in the idle-reaper path).

Production-state evidence:
  First observed: 2026-04-15 (Datadog memory-usage alert hit threshold).
  Days in production before fix: 21 days.
  Customers affected (estimated): ~3% of requests served during the
  2-3 minute restart windows, ~6 windows / day.
  Detection mechanism: Datadog alert on
  `process.memoryUsage().heapUsed > 1.4GB`.

Existing test coverage:
  Unit tests for worker pool: 18 cases, all complete in <500ms.
  Integration tests: 4 cases, all complete in <30s.
  Load tests: none. Soak tests: none. CI runs under 12 minutes total.
  Test runners present: vitest, jest. No artillery / k6 / chaos tools.

Date of analysis: 2026-05-04.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 4 classifies the escape as **tooling-gap** with
sub-pattern `Memory / fd leak over hours` per the tooling-gap table.
The test could not have been written with current tools - a 14-hour
soak test is incompatible with a 12-minute CI budget, and the team has
no soak-testing tool installed. Per the "Tooling gap" sub-pattern row,
the typical fix is **Runtime monitoring (not a test)**. Step 5
proposes a concrete observability metric as the prevention asset - 
e.g., the existing Datadog alert on
`process.memoryUsage().heapUsed` extended with a 1-hour rolling-window
threshold to catch slow growth earlier (matching the agent's example
text), and a `## Open questions` section capturing the tradeoff "should
we also add a soak test in CI even though it would exceed our 12-minute
budget?" The report is generated at
`docs/escape-defects/2026-05-04-worker-pool-memory-leak.md` (or
similar). The agent does NOT propose "add more unit tests" - that would
conflate test-gap with tooling-gap per the rejected anti-pattern.

**Pass condition:** Output contains the literal string `tooling-gap`
(the escape category) AND mentions `heapUsed` or `memoryUsage` or
`Datadog` (the observability metric, not a test). Output contains an
`## Open questions` section. Output does NOT classify the escape as
`test-gap` (the team has no soak-testing tooling).

## Eval 3 - adversarial - missing fix commit + production-state evidence (refuse to scaffold)

**Input:**

```
Run an escape-defect analysis. Generate the report file.

Bug report:
  Bug ID: #6001
  Summary: A user reported the dashboard "looked off" last week.
  Severity: unset.

Fix commit:
  [not yet identified — the team hasn't located the offending change]

Production-state evidence:
  First production observation: [unknown — only one user report,
  no Sentry/Datadog evidence]
  Days in production before fix: [n/a — not yet fixed]
  Customers affected (estimated): [unknown — one anecdote]
  Detection mechanism: [in-app feedback widget, one report]

Date of analysis: 2026-05-04.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 2 cannot read a fix commit - there is no
identified fix. Step 3 cannot establish production-state evidence - 
First production observation, Days in production, and Customers
affected are all unknown / one anecdote. Per the agent's anti-pattern
"Skipping production-state evidence. 'Days in production' + 'customers
affected' are required - they bound the priority of the prevention
asset", the agent must refuse to scaffold a report. It also cannot
classify the escape category (test-gap vs process-gap vs tooling-gap is
indeterminate without knowing what was fixed and how). The agent
returns an error stating the missing inputs and recommends running
the report once the fix lands and Sentry/Datadog evidence is gathered.
It does NOT write a file under `docs/escape-defects/`. It does NOT
fabricate a "Days in production" or "Customers affected" number.

**Pass condition:** Output contains one of `missing` / `unknown` /
`refuse` / `cannot` (the agent surfaces the missing-input problem) AND
mentions `fix commit` or `production-state evidence` (naming the
required-but-absent inputs). Output does NOT contain a path starting
with `docs/escape-defects/` (no report file is generated). Output does
NOT classify the escape as `test-gap`, `process-gap`, or `tooling-gap`
(classification is indeterminate without the missing evidence).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks describing the
  bug, fix commit, production-state evidence, and existing test
  coverage. No external Sentry / Datadog / tracker connection needed.
- Pass conditions are literal-string checks plus path-pattern checks
  (the report file location); a reviewer can grep the agent's
  transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
