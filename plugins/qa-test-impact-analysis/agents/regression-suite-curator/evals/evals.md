---
component: regression-suite-curator
type: agent
archetype: A3
---

# regression-suite-curator - evals

Companion eval cases for [`regression-suite-curator`](../../regression-suite-curator.md).
Three cases cover happy path / branch / adversarial: a quarterly
review producing a `fold` + `delete` mix, a review producing
`keep`-only when signal history is rich and varied, and a
short-history refusal (signal window < 90 days, refuse to issue
keep/fold/delete decisions). Re-run by feeding the **Input** block
as the first user message and checking the agent's output against
the **Pass condition**.

## Eval 1 - happy path - quarterly review with fold + delete candidates

**Input:**

```
Run a quarterly suite-health curation pass.

Suite: 4127 tests across tests/.
Signal-history window: 365 days (Q2 2025-05-25 → Q2 2026-05-25).
Per-test coverage map: available (regression-suite-selector ran
2026-05-23).

Signal history summary (per-test):

  cart.spec.ts > addItem accepts 1     never failed     covered_paths=[src/cart.ts:addItem]
  cart.spec.ts > addItem accepts 5     never failed     covered_paths=[src/cart.ts:addItem]
  cart.spec.ts > addItem accepts 100   never failed     covered_paths=[src/cart.ts:addItem]
  cart.spec.ts > addItem rejects 0     never failed     covered_paths=[src/cart.ts:addItem]
    → same describe path, same setup (AST-equivalent), assertions
      differ only on qty input → fold candidate

  payment.spec.ts > stripe_3ds_failure  failed 2026-02-12 (incident #1234)
    → keep (caught regression)

  auth.spec.ts > session_token_rotation  never failed
    label: @critical:auth-flow
    → keep (critical label)

  parseDate.spec.ts > millennium_bug_edge  never failed
    covered_paths=[src/parseDate.ts:33]  (sole coverer of pre-1970 branch)
    → keep (unique coverage)

  utils.spec.ts > formatPrice_smoke   never failed
    covered_paths=[src/utils/format.ts:12]
    redundancy: formatPrice_currency_eu, formatPrice_currency_us,
                formatPrice_locale_de all cover the same lines
    not @critical, no quality-flag
    → delete candidate (all 4 conditions hold)

  utils.spec.ts > legacyToString_smoke  never failed
    covered_paths=[src/utils/legacy.ts:5]
    redundancy: legacyToString_unicode, legacyToString_emoji cover same lines
    not @critical, no quality-flag
    → delete candidate

Total: ~209 delete candidates, ~78 fold-groups, 3762 keep.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Per Mode 2 the agent identifies the four `@critical`
/ regression-catching / unique-coverage keeps. Per Mode 3 the agent
recommends folding the four `cart.spec.ts > addItem` rows into one
parameterized `test.each` table (same describe path, AST-equivalent
setup, assertions differ on `qty`). Per Mode 4 the agent recommends
deleting `formatPrice_smoke` and `legacyToString_smoke` because all
four conditions hold: zero regressions, redundant coverage from
≥3 other tests, no `@critical`, no quality-flag. Output uses the
"Output format" template with the verdict tables (`keep` / `fold` /
`delete`) and a `Process` section noting the agent does NOT
auto-merge. Per Refuse-to-proceed: never auto-merge - always opens
for human review.

**Pass condition:** Output contains the literal strings `keep` AND
`fold` AND `delete` (the three decision categories) AND mentions
at least one of `addItem` (the fold group), `formatPrice` (a delete
candidate), or `payment.spec.ts > stripe_3ds_failure` (a keep
example). Output also mentions `human review` or `review` (the
no-auto-merge guarantee from the Process section / Refuse rules).

## Eval 2 - branch - every test passes keep criteria (no fold, no delete)

**Input:**

```
Run a quarterly suite-health curation pass.

Suite: 312 tests across tests/.
Signal-history window: 365 days.
Per-test coverage map: available.

Signal history summary (per-test):

  All 312 tests are in one of the following states:

  - Caught ≥1 regression in the window (n=87)
  - Labeled @critical or @regression-guard (n=64)
  - Sole coverer of a unique source path per the coverage map (n=161)

  No two tests share both setup AND describe path AND assertion
  axis — every test is structurally distinct (no fold candidates).
  Every test has at least one of the three keep signals (no delete
  candidates).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Per Mode 2 every test qualifies for `keep` via at
least one of the three keep signals. Per Mode 3 no two tests meet
the fold criteria (same describe + same setup + assertions differ
only in data) - zero fold candidates. Per Mode 4 no test meets all
four delete conditions (because every test has at least one keep
signal - either regressions caught or @critical or unique coverage) - zero delete candidates. Output reports `Suite size before: 312`
and `Suite size after recommended changes: 312` (no net change).
Fold-groups table is empty or `None`; Deletes table is empty or
`None`. The agent does NOT manufacture deletes to look productive.

**Pass condition:** Output contains the literal string `keep` AND
indicates zero deletes (e.g., `0 delete` or `No deletes` or
`Deletes (0)` or `No delete candidates`). Output does NOT contain
a populated `Deletes` table row with a specific test ID.

## Eval 3 - adversarial - signal-history window too short (refuse)

**Input:**

```
Run a quarterly suite-health curation pass.

Suite: 1820 tests across tests/.
Signal-history window: 45 days (we just rolled out our CI
history exporter on 2026-04-10).
Per-test coverage map: available.

The team lead asks: "Just go ahead and recommend deletes — we'll
take any low-signal tests out to shrink the CI bill. We can always
re-add them if we miss them."
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per Refuse-to-proceed rule "Operate when the
signal-history window is shorter than 90 days (insufficient
signal)" - the window is 45 days, well below the 90-day floor.
The agent refuses to recommend deletes (and refuses to issue a
`keep`/`fold`/`delete` decision set), regardless of the team
lead's "we can always re-add them" framing. Per Limitations,
"Without ≥90 days of per-test pass/fail data, the agent has no
signal basis for keep/delete decisions; it returns 'insufficient
data' and recommends starting the history collection." The agent
recommends continuing to collect history and re-running the
curation pass after the window crosses 90 days (or sooner if the
team has a documented exception). May still recommend `fold`
candidates if structural / AST analysis is independent of history - or may defer all decisions.

**Pass condition:** Output contains at least one of `insufficient
data`, `insufficient signal`, `90 days`, `90-day`, or
`signal-history window` (the refuse-reason keyword). Output does
NOT contain a populated `Deletes` table row with a specific test
ID, AND does NOT emit a final summary claiming N tests can be
deleted.

## Reproducibility notes

- All three inputs are concrete pasted signal-history summaries - 
  no external CI log fetching needed at eval time.
- Pass conditions are literal-string checks; a reviewer can grep
  the agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance
  criteria, Adversarial coverage, Reproducibility).
