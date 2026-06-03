---
component: regression-bisector
type: agent
---

# regression-bisector - evals

Companion eval cases for [`regression-bisector`](../../regression-bisector.md).
Three cases cover happy path / branch / adversarial: a clean Playwright
+ npm bisect that pinpoints a culprit commit (happy artifact = culprit
report), a Jest + Make bisect that hits skipped-build commits and
re-runs with `--first-parent` (branch - different framework / driver /
config), and a refusal when the failure is intermittent rather than
deterministic (git bisect prerequisite violated). Re-run by feeding
the **Input** block as the first user message and checking the agent's
output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates below are the
eval-authoring date - each case is designed to be reproducible against
any tier.

## Eval 1 - happy path - Playwright + npm bisect to clear culprit

**Input:**

```
Bisect this regression.

Target test:    tests/checkout.spec.ts:42 — "loads order summary"
Failure mode:   fails 20/20 on HEAD (current `main`)
Known good:     20/20 pass on tag v1.4.2 (released 4 weeks ago)
                — `git describe --tags --abbrev=0` returns `v1.4.2`
Commits between v1.4.2 and HEAD: 80
Runner:         Playwright v1.49 (TypeScript), `npx playwright test`
Build:          `npm install && npm run build`
CI per-iteration time: ~6 min

User states: "this passed in v1.4.2; broke sometime in the last week."

Bisect transcript (recorded, for the report):

  git bisect start
  git bisect bad HEAD                         # 20/20 fail
  git bisect good v1.4.2                      # 20/20 pass
  git bisect run scripts/bisect-test.sh
  ... 7 iterations ...
  abc1234 is the first bad commit
  commit abc1234
  Author: Alice <alice@example.com>
  Date:   2026-05-22
      Refactor checkout summary calculation

  src/checkout/Summary.tsx | 42 ++++++++++++++++++--------------
  1 file changed, 24 insertions(+), 18 deletions(-)

  Diff summary: reordered two useMemo hooks (subtotal computed AFTER
  tax) so the integration test sees a stale subtotal value when the
  cart line items change.

Please produce the regression bisect report and recommended next step.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Produces the culprit report artifact per the agent's
documented output format. Identifies `abc1234` as the introducing
commit, names the author and date, lists `src/checkout/Summary.tsx` as
the changed file, and provides a one-paragraph hypothesis about the
`useMemo` reordering. Bisect iterations: 7. Skipped commits: 0.
Recommended next step lists `git show abc1234`, revert-on-branch
verification, and the revert-or-forward-fix decision per the agent's
documented output. Does NOT classify as flake / hand off to
`e2e-flake-bisector` (deterministic 20/20 failure).

**Pass condition:** Output contains the literal string `abc1234` AND
mentions `src/checkout/Summary.tsx` AND mentions one of `useMemo` /
`subtotal` / `stale` (case-insensitive - the hypothesis terms). Output
does NOT recommend hand-off to `e2e-flake-bisector`.

## Eval 2 - branch - Jest + Make bisect with skipped commits, `--first-parent`

**Input:**

```
Bisect this regression.

Target test:     packages/billing/__tests__/invoice.test.ts —
                 "computes tax on cross-border invoice"
Failure mode:    fails 50/50 on HEAD
Known good:      50/50 pass on commit deadbeef (3 months ago)
Commits between: 675
Runner:          Jest v29 (CommonJS), invoked via Make:
                   make test PKG=billing
                 Build:
                   make build  (compiles a native Rust addon — broken
                   on many intermediate commits during a partially
                   applied dependency update last month)
CI per-iteration time: ~3 min when build succeeds, ~30s when build
fails (exit code propagates).

Recorded bisect transcript:

  git bisect start
  git bisect bad HEAD
  git bisect good deadbeef
  git bisect run scripts/bisect-test.sh
  ... 9 iterations, then ...
  There are only 'skip'ped commits left to test. The first bad commit
  could be any of:
    cafe0001 cafe0002 cafe0003 cafe0004 cafe0005 cafe0006 cafe0007
    cafe0008 cafe0009 cafe000a cafe000b cafe000c
  We cannot bisect more!

  ($ git log --oneline cafe0001^..cafe000c | wc -l → 12)
  Those 12 commits all exit 125 (build broken) due to the partial
  Rust dependency update.

The user wants a follow-up plan — what does the agent do when bisect
stalls on skipped commits?
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Produces a regression bisect report that acknowledges
the stall - different framework / driver / config than Eval 1 (Jest +
Make + native build, not Playwright + npm). Lists the 12 skipped
commits, classifies them as `exit 125` (build broken), and recommends
the agent's documented remediation: re-bisect with `--first-parent`
to discard the broken intermediate commits and bisect only across
merge commits; OR manually `git show` each candidate. Does NOT emit a
single confident "culprit: cafe0007" claim when bisect itself reported
12 candidates.

**Pass condition:** Output mentions `--first-parent` AND mentions
`125` (the documented skip exit code) AND mentions one of `skipped` /
`skip` (case-insensitive). Output does NOT name a single specific
culprit commit from the cafe0001-cafe000c range as "the" first bad
commit.

## Eval 3 - adversarial - intermittent failure (refuse, route to flake bisector)

**Input:**

```
Bisect this regression.

Target test:     tests/cart.spec.ts:88 — "applies promo code"
Failure mode:    fails ~6/20 on HEAD (30% rate)
                 passes 20/20 on tag v1.4.2
                 BUT on the v1.4.0 release tag (earlier), it also
                 fails ~3/20 (15%) — the failure rate has been
                 drifting upward over the last 6 months.

The team would like to bisect to find "the commit that introduced
this." Please run git bisect against this test.
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to run `git bisect` against this target. The
agent's Step 1 ("Confirm this is a regression, not a flake") and the
explicit "When NOT to use this agent - Intermittent failures" note
both apply: 6/20 on HEAD (intermittent) and 3/20 on v1.4.0
(intermittent across history) means git bisect cannot produce
deterministic per-commit verdicts. The right hand-off is named
explicitly in the agent - `e2e-flake-bisector`. The output should
state the deterministic-vs-intermittent prerequisite, point at
`e2e-flake-bisector` (and optionally
`parallel-isolation-checker` / quarantine), and refuse to emit a
culprit-commit report. Does NOT proceed to run `git bisect` blindly
and announce a culprit.

**Pass condition:** Output contains one of `flake` / `flaky` /
`intermittent` / `not deterministic` (case-insensitive) AND mentions
`e2e-flake-bisector` (the named hand-off agent). Output does NOT
report a `Culprit` / `Bad commit` line with a specific SHA against
`tests/cart.spec.ts:88`.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - the eval
  feeds a pre-recorded bisect transcript / `git log` excerpt so
  reviewers do not need to clone a real repo and burn hours running
  `git bisect`; the orchestration / report-shape / refuse logic is
  what is under test.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (`abc1234`,
  `src/checkout/Summary.tsx`, `--first-parent`, `e2e-flake-bisector`,
  etc.).
- The agent's tool surface includes `Bash(git bisect *)`,
  `Bash(git log *)`, `Bash(git show *)`, `Bash(npx playwright test *)`,
  `Bash(jest *)`, `Bash(npm test *)`, `Bash(make *)` - eval re-runs
  against a real repo would actually drive `git bisect`; against the
  pasted data above, the eval verifies the report shape and the
  decision to refuse / re-route.
