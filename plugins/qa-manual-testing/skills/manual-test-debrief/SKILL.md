---
name: manual-test-debrief
description: "Session debrief template + tour-coverage tracker - captures the SBTM PROOF format (Past, Results, Obstacles, Outlook, Feelings) plus three-bucket time accounting (test design / setup / bug investigation), the tours applied + areas covered + areas skipped, and the per-session quality-of-attention signal. Output is the artifact a charter delivers into; the team aggregates debriefs across sessions to track what's been explored vs what's still uncharted. Use after every exploratory session - without the debrief, the session's findings disappear."
---

# manual-test-debrief

## Overview

The Session-Based Test Management (SBTM) framework ends every session with
a **PROOF** report - a five-section debrief the team can aggregate,
compare, and act on. Skip it and the session's findings live only in the
tester's head: no team learning, no audit trail, no follow-up. This skill
provides the template and the aggregation conventions.

## When to use

- After every charter session.
- After a bug bash cohort completes its 90-min slot per
  `bug-bash-facilitator`.
- After a free-form tester exploration (even without a formal
  charter, the PROOF structure converts the session to an artifact).

## PROOF format

The acronym from the original Bach & Bach SBTM paper:

| Letter | Section       | What it captures |
|--------|---------------|-------------------|
| **P**  | Past          | What was tested - areas covered, paths walked, tours applied. |
| **R**  | Results       | What was learned - confirmed-working items, surprises, novel observations. |
| **O**  | Outlook       | What's left - areas NOT covered; what to explore next session. |
| **O**  | Obstacles     | What slowed the session - broken setup, missing test data, environment instability. |
| **F**  | Feelings      | Tester's qualitative read on product quality (confident / uneasy / unsure). |

**Feelings** is the load-bearing field teams skip. Keep it - the tester's
qualitative judgment is signal no metric captures.

## Step 1 - Debrief template

Fill one per session, within 30 min of session end. The blank spine:

```markdown
# Session debrief - `<session-id>`

**Charter:** [link]   **Tester:** ____   **Date:** ____
**Time-box:** 90 min   **Actual:** ___ min   **Build / Env:** ____

## Past - what was tested
Tours applied (per `exploratory-tours-reference`); areas covered;
notable paths walked.

## Results - what was learned
Confirmed-working items; bugs found (with bug IDs); surprises;
confirmed-fixed vs prior session.

## Outlook - what's left
Areas not covered (out of time / scope); recommended next charter;
open questions for PM / dev.

## Obstacles
Setup pain; environment instability; recommendations for next session.

## Feelings
Quality of attention; confidence in the feature; unease about untested
areas; recommendation to the release manager.

## Time accounting (3-bucket)
| Bucket | Minutes |
|---|--:|
| Test design | __ |
| Setup | __ |
| Bug investigation | __ |
| **Total actual** | __ |
```

A fully worked example (a promo-code checkout session, every field filled
with real bug IDs and time splits) is in
[references/debrief-examples.md](references/debrief-examples.md). A high
setup % is a signal the environment or test data needs investment, not
that the tester is slow.

## Step 2 - Aggregation across sessions

Individual debriefs are useful; aggregating them surfaces patterns - which
areas are well-covered, which are stale, which have never been touched,
and where bugs cluster. Charter authoring uses the rollup to pick where
the next session should focus. The Feelings section also yields a
per-session quality-of-attention signal worth tracking over time; when it
stays low for a tester or area, change something (tester, time-box, tour,
or scope). The full quarterly rollup table and the attention tracker are
in [references/debrief-examples.md](references/debrief-examples.md).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping the Feelings section                                         | Loses the qualitative signal; rollup is metric-only.                     | Always fill it (Step 1). |
| Debrief written days later                                             | Memory faded; details lost.                                              | Author within 30 min of session end. |
| Debrief without bug IDs                                                | Findings can't be tracked; team can't follow up.                         | Every "Result" links to a bug ID OR is logged as a quirk. |
| One-line Past section ("tested promo")                                 | Coverage gap invisible at rollup time.                                   | List tours, areas, paths walked (Step 1). |
| No Outlook section                                                     | Next session has no continuity; same areas re-explored.                  | "Recommended next charter" is the chain to next session. |
| Aggregating without acting                                              | Rollup data sits; team doesn't reallocate sessions.                       | Action items per rollup (Step 2). |
| Debrief in chat / Slack DMs                                             | Not searchable; not in version control.                                   | Markdown file in `docs/sessions/<session-id>.md` (or wiki / Notion DB). |

## Limitations

- **Self-reported.** Honesty is load-bearing. A tester who
  consistently overstates attention quality skews the rollup.
- **Time accounting is approximate.** The 3-bucket split rounds to
  the nearest 5 min; that's fine.
- **Aggregation is manual.** A rollup script can compute coverage %
  but the action items need a human's call.
- **Per-team conventions vary.** Some teams add a 6th letter
  (PROOFS - Stakeholders) for who needs to see the report. Adapt
  the template per team norms.

## References

- Bach, J. & Bach, J., *Session-Based Test Management* (HP, 2000;
  PDF at `satisfice.com/download/session-based-test-management`) - 
  PROOF debrief format origin, three-bucket time accounting.
- Full worked debrief, quarterly rollup, and attention tracker:
  [references/debrief-examples.md](references/debrief-examples.md).
- `exploratory-tours-reference` - the tours catalogued in the Past section.
- `bug-bash-facilitator` - 
  multi-cohort bug bash inherits this debrief format.
