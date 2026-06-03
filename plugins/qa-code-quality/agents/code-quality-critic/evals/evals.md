---
component: code-quality-critic
type: agent
---

# code-quality-critic - evals

Companion eval cases for [`code-quality-critic`](../../code-quality-critic.md).
Three cases cover happy path / branch / adversarial: a feature PR with one
net-new Critical (verdict `BLOCK`), a refactor PR that reduces debt
(verdict `READY`), and a tools-scope-includes-test-files refusal (Step 1
early return). Re-run by feeding the **Input** block as the first user
message and checking the agent's output against the **Pass condition**.

Target models for re-runs: `sonnet`, `haiku`, `opus`. Dates recorded
below are the eval-authoring date - each case is designed to be
reproducible against any tier.

## Eval 1 - happy path - feature PR with net-new Critical (BLOCK)

**Input:**

```
Review this feature PR for code quality.

PR diff (`git diff main...HEAD`): adds a new function `validateSession()`
in `src/auth/session.ts` (62 lines, 14 elif/if branches handling token
expiry, refresh, revocation, and audit). No deletions.

Scope check (Step 1):
  sonar-project.properties contains: sonar.tests=tests/
  lizard-cmd.txt: lizard src/ -x tests/* -x "*spec*" -C 10 --csv
  .madgerc: excludeRegExp = ["\\.test\\.ts$", "\\.spec\\.ts$"]

SonarQube branch analysis JSON (excerpt):
  - rule S3776 (cognitive complexity), file src/auth/session.ts:42,
    function validateSession, message "Cognitive Complexity of 32 exceeds
    threshold of 15", severity Critical, type Code Smell, newCode: true

Lizard --csv (excerpt):
  src/auth/session.ts,validateSession,42,118,CCN=32,NLOC=62

Madge --circular --json: []
Knip --reporter json: { "files": [], "exports": [], "dependencies": [] }

Qlty check --upstream main JSON: no duplication findings; no smells.

PR description: "Add new session validator. No ratchet ticket cited."
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 passes (production-only scope verified). Step 2
dedupes SonarQube S3776 + Lizard CCN=32 into one finding on
`validateSession()` (cites both tools). Step 3 buckets it as `Net new`
(newCode flag + new function). Step 4 severity → `Critical` (Lizard CCN
≥ 30 AND SonarQube cognitive complexity). Step 6 emits verdict `BLOCK`
with a Net-new findings table containing the Critical row. Refusal rule
fires: "Net-new Blocker or Critical exists". Recommends extracting the
token-refresh path per Step 5 to reduce CCN.

**Pass condition:** Output contains the literal string `BLOCK` AND the
literal string `validateSession` AND at least one of `Lizard` /
`SonarQube` AND the literal string `Critical`. Output does NOT contain
a `READY` verdict line.

## Eval 2 - branch - refactor PR that reduces debt (READY)

**Input:**

```
Review this refactor PR.

PR diff (`git diff main...HEAD`): refactors two functions in
`src/orders/process.ts` — `processOrder()` and `fulfillOrder()` — by
extracting helper methods. Net change: -180 / +205 lines on existing
files. No new files.

Scope check (Step 1):
  sonar-project.properties contains: sonar.tests=tests/
  lizard-cmd.txt: lizard src/ -x tests/* -C 10 --csv
  .madgerc: excludeRegExp = ["\\.test\\.ts$"]

SonarQube branch analysis JSON: no new issues; 2 existing S3776
violations REMOVED on processOrder (was CCN 22) and fulfillOrder
(was CCN 19).

Lizard --csv:
  src/orders/process.ts,processOrder,42,28,CCN=14,NLOC=18
  src/orders/process.ts,fulfillOrder,75,22,CCN=11,NLOC=14
  (Baseline 2026-04-15: processOrder CCN=22, fulfillOrder CCN=19)

Madge --circular --json: [] (unchanged from baseline)
Knip --reporter json: { "files": [], "exports": [], "dependencies": [] }
Qlty: no new duplication; -1 duplicated block resolved.

PR description: "Refactor processOrder + fulfillOrder to reduce CCN.
No new functionality."
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 passes. Step 2 produces no merged findings (no new
violations). Step 3 buckets: 0 Net new, 2 Modified-line improvements
(CCN reductions), 0 inherited new. Step 4: no new Major/Critical;
existing finding count reduced. Step 6 emits verdict `READY` because
count(Net new) = 0 < count(Removed). Matches the "Example 1 - Refactor
PR (good case)" pattern in the agent body.

**Pass condition:** Output contains the literal string `READY` AND
references CCN reduction (one of `22 → 14`, `19 → 11`, `reduced`,
`net debt reduced`). Output does NOT contain a `BLOCK` verdict line
AND does NOT contain a Net-new Critical row.

## Eval 3 - adversarial - scanner scope includes test files (refuse)

**Input:**

```
Review this PR.

PR diff: standard feature work in `src/` and `tests/`.

Scope check files:
  sonar-project.properties:
    sonar.projectKey=acme-shop
    sonar.sources=src,tests
    # NOTE: sonar.tests is NOT set

  lizard-cmd.txt:
    lizard . -C 10 --csv

  .madgerc:
    {}

SonarQube branch analysis JSON includes findings on:
  tests/auth/session.spec.ts (CCN 18, function setupComplexFixture)
  tests/orders/process.spec.ts (CCN 22, function buildOrderScenario)
  src/auth/session.ts (CCN 9)

Lizard --csv includes test files in the report.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 detects `sonar.tests` not set, Lizard not excluding
tests, and Madge not excluding tests. Per the documented Step 1 rule
("If warnings appear, **return early** with a config-fix recommendation
before producing findings"), the agent refuses to issue a verdict and
returns config-fix recommendations naming `sonar.tests=`, the Lizard
`-x` flag for tests, and the `.madgerc` `excludeRegExp`. Per the Step 7
Refuse-to-proceed rule, the agent must not mark `READY` if Step 1
detected test files in any tool's scope.

**Pass condition:** Output mentions at least two of `sonar.tests`,
`lizard`/`-x`, `madgerc`/`excludeRegExp`, AND mentions `test files` or
`tests/` scope. Output does NOT contain a `READY` verdict line AND does
NOT emit a Net-new findings table with severity rows for the listed
test-file findings.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a sample repo or run scanners.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow
  `Bash(jq *)`, `Bash(git *)`) is read-only - eval re-runs cannot
  modify source code or scanner reports.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
