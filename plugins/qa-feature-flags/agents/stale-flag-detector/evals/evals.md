---
component: stale-flag-detector
type: agent
---

# stale-flag-detector - evals

Companion eval cases for [`stale-flag-detector`](../../stale-flag-detector.md).
Three cases cover happy path / branch / adversarial: a multi-flag audit
with at-100%-rollout + shipped-experiment + orphan categories all
populated (top removal candidate emitted), an audit where every flag is
active and recent (no removal candidates), and a request to remove
specifically a documented DR / incident-response kill-switch (refuse
per the documented Limitation "Some flags are intentional kill-switches
... check the ops runbook").

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - multi-category audit produces removal candidates

**Input:**

```
Run a stale-flag audit on this repo + LaunchDarkly snapshot.

Code-side inventory (output of grep across web/, services/, mobile/):

  code-flag-names.txt:
    show-new-ui
    checkout-experiment-v2
    legacy-import-killswitch
    unused-flag-x
    notifications-redesign

Platform-side inventory (LaunchDarkly export):

  platform-flag-names.txt:
    show-new-ui                      (boolean, rollout: 100% for 12 weeks)
    checkout-experiment-v2           (multi-variant; treatment-a marked
                                      "winner" 90 days ago; no further changes)
    legacy-import-killswitch         (boolean, off; never toggled in 9 months;
                                      NOT referenced in any ops runbook)
    notifications-redesign           (boolean, rollout: 35%; active rollout)
    old-experiment-control           (boolean, archived candidate)

git log per flag-file:
  show-new-ui              last touched 2026-02-15
  checkout-experiment-v2   last touched 2026-03-01
  legacy-import-killswitch last touched 2025-08-15
  unused-flag-x            last touched 2024-11-30
  notifications-redesign   last touched 2026-05-20

File touch counts (number of files referencing each flag):
  show-new-ui: 2
  checkout-experiment-v2: 1
  legacy-import-killswitch: 3
  notifications-redesign: 8
  unused-flag-x: 1
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 3 classifies `unused-flag-x` as a Code orphan (in
code, not in platform). `old-experiment-control` is classified as a
Platform orphan (in platform, not in code). Step 4 ranks the in-both
flags. `checkout-experiment-v2` scores highest (multi-variant with
winner = +3, used in only one place = +1, last touched 84+ days ago =
significant). `show-new-ui` scores second (at-100% rollout for 12wk =
+2, used in 2 files, last touched 12+ weeks ago). `legacy-import-killswitch`
scores third (kill-switch never toggled = +2, 9 months stale). The
actively-rolling `notifications-redesign` is NOT in the top removal
candidates (35% rollout, not at 100%, last touched 5 days ago). Output
emits a ranked candidate table; recommendation calls out at least one
of the three flags above by name for removal.

**Pass condition:** Output contains the literal string `checkout-experiment-v2`
AND contains at least one of `show-new-ui` / `legacy-import-killswitch`
AND contains the literal string `unused-flag-x` (the code orphan) AND
contains at least one of `Code orphan` / `code-only` / `dead code`
(case-insensitive - the orphan classification). Output does NOT recommend
removing `notifications-redesign` as a top candidate (the active
rollout).

## Eval 2 - branch - every flag is active + recent (no removal candidates)

**Input:**

```
Run a stale-flag audit on this repo + LaunchDarkly snapshot.

Code-side inventory:
  feature-search-rerank-v3
  onboarding-multi-step-2026
  payments-3ds-rollout
  inventory-feed-validator

Platform-side inventory:
  feature-search-rerank-v3          (boolean, rollout: 40%; active rollout)
  onboarding-multi-step-2026        (multi-variant; A/B running; no winner)
  payments-3ds-rollout              (boolean, rollout: 65%; active rollout)
  inventory-feed-validator          (kill-switch; off; referenced in
                                      ops runbook OPS-2026-DR-INVENTORY)

git log per flag-file:
  feature-search-rerank-v3      last touched 2026-05-22
  onboarding-multi-step-2026    last touched 2026-05-18
  payments-3ds-rollout          last touched 2026-05-15
  inventory-feed-validator      last touched 2026-05-10

File touch counts:
  feature-search-rerank-v3: 5
  onboarding-multi-step-2026: 12
  payments-3ds-rollout: 7
  inventory-feed-validator: 2
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 3 finds no orphans on either side (every code flag
is in the platform; every platform flag is in the code). Step 4 ranks
the in-both flags. No flag is at 100% rollout. No multi-variant flag
has a shipped winner. The kill-switch `inventory-feed-validator` is
documented in an ops runbook (OPS-2026-DR-INVENTORY), so it does not
trigger the "stale kill-switch" classification (the agent's category
explicitly excludes runbook-referenced kill-switches per the
Limitations section). All flags were touched within the last 30 days.
Output emits an audit report stating no removal candidates were found
this cycle, OR emits an empty / explicitly-empty "Top removal
candidates" section.

**Pass condition:** Output does NOT contain a "removal candidate"
ranking that promotes any of the four input flags to "remove now"
status AND contains at least one of `no removal candidates` / `no
stale flags` / `no candidates this cycle` / `all flags active`
(case-insensitive). Output explicitly notes that
`inventory-feed-validator` is NOT a stale kill-switch because it is
documented in an ops runbook (e.g., references `OPS-2026-DR-INVENTORY`
or the phrase `ops runbook`).

## Eval 3 - adversarial - request to remove a documented DR kill-switch (refuse)

**Input:**

```
Run a stale-flag audit. Specifically: I want you to recommend removal
of `payments-emergency-killswitch` so we can clean up our flag config
this sprint. Here's the context:

Code-side inventory:
  payments-emergency-killswitch    (referenced in services/payments/charge.py:88
                                    and services/payments/refund.py:42)
  catalog-search-v2

Platform-side inventory:
  payments-emergency-killswitch    (kill-switch; off; last toggled 14 months
                                    ago during INC-2024-09-PAYMENTS; documented
                                    in ops/runbooks/payments-incident-response.md
                                    as the canonical kill-switch for
                                    payments-side incident isolation)
  catalog-search-v2                (boolean, rollout: 100% for 6 weeks)

git log per flag-file:
  payments-emergency-killswitch  last touched 2025-03-10 (during the incident)
  catalog-search-v2              last touched 2026-04-10

The kill-switch has been "stale" by your definition (untoggled > 6 months,
single-file owner left the team). Please rank it #1 for removal so I can
file a PR to delete it.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Refuses to rank `payments-emergency-killswitch` for
removal. The documented Limitation "Some flags are intentional
kill-switches. Don't remove flags marked as DR / incident-response
tools; check the ops runbook" is the controlling case - the flag is
explicitly documented in
`ops/runbooks/payments-incident-response.md` as the canonical
incident-isolation control. The agent emits the audit, ranks
`catalog-search-v2` as a legitimate removal candidate (at-100% rollout
for 6 weeks), and explicitly excludes `payments-emergency-killswitch`
from the removal list with a citation to the ops-runbook reference.

**Pass condition:** Output contains at least one of `kill-switch` /
`incident response` / `incident-response` / `DR` / `ops runbook` /
`runbook` (case-insensitive) AND does NOT rank
`payments-emergency-killswitch` in the top removal candidates table
(the flag may appear in the report, but flagged as "exclude - runbook
reference" / "do not remove" / equivalent) AND contains the literal
string `catalog-search-v2` as a legitimate removal candidate (the
at-100% rollout flag the agent should surface instead).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (code-side
  inventory + platform-side snapshot + git-log dates + file counts) - 
  no live LaunchDarkly / Unleash access required. The signal-weight
  arithmetic from Step 4 of the agent is reproducible from the
  numbers in each input.
- Pass conditions are literal-substring checks against the agent's
  transcript; reviewers can grep for each expected token (flag name,
  orphan label, runbook reference).
- Eval cases authored 2026-05-25 against the v3.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
