---
name: manual-test-debrief
description: "Session debrief template + tour-coverage tracker - captures the SBTM PROOF format (Past, Results, Obstacles, Outlook, Feelings) plus three-bucket time accounting (test design / setup / bug investigation), the tours applied + areas covered + areas skipped, and the per-session quality-of-attention signal. Output is the artifact a charter delivers into; the team aggregates debriefs across sessions to track what's been explored vs what's still uncharted. Use after every exploratory session - without the debrief, the session's findings disappear."
---

# manual-test-debrief

## Overview

A session without a debrief is a session that didn't happen - the
findings live only in the tester's head, no team learning, no
audit trail, no follow-up scheduling.

The Session-Based Test Management (SBTM) framework introduced
**PROOF** as a structured debrief format: every session ends with
a five-section report that the team can aggregate, compare, and
act on.

This skill provides the template and the aggregation conventions.

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

**Feelings** is the load-bearing field most teams want to skip.
Resist that. The tester's qualitative judgment is signal that no
metric captures.

## Step 1 - Template

```markdown
# Session debrief - `<session-id>`

**Charter:** [link to charter]
**Tester:** _______________
**Date:** _______________
**Time-box:** 90 min   **Actual:** ___ min
**Build / Environment:** _______________

## Past - what was tested

**Tours applied:**
- [x] Money tour (per `exploratory-tours-reference`)
- [x] Bad-data tour
- [ ] Configuration tour (skipped - out of time)

**Areas covered:**
- Promo code input field - full coverage including SQL/XSS payloads
- Promo discount math - 10% / 50% / 100% / fractional cent edge cases
- Promo + tax interaction - covered for US tax states only

**Paths walked (notable ones):**
- Apply WELCOME10 to $24.99 cart → $22.49 ✓
- Apply two stackable promos → second silently overrides first (BUG-987)
- Apply expired promo → graceful error message ✓

## Results - what was learned

**Confirmed working:**
- Single-promo apply
- Promo code expiration enforcement
- Free-shipping promo

**Bugs found:** (with bug IDs)
- BUG-987: Stacking two promos doesn't combine - second silently overrides first.
- BUG-988: SQL injection in promo input field returns 500 instead of 400.
- BUG-989: $0.01 cart with 50% off rounds to $0.00 instead of $0.01.

**Surprises:**
- Discount is applied to subtotal BEFORE tax, but the original SOW
  said after-tax. Need to clarify with PM.
- "WELCOME10" code is case-sensitive; "welcome10" silently rejected
  with no helpful message.

**Confirmed-fixed (vs prior session):**
- Previous BUG-832 (promo input losing focus) is fixed. ✓

## Outlook - what's left

**Areas not covered (out of time / scope):**
- EU tax cases (covered separately by next session's charter).
- Multi-currency promo behavior.
- Promo + subscription billing.

**Recommended next charter:**
- "Explore the EU tax + promo interaction" (90 min).
- "Explore promo + subscription billing edge cases" (60 min).

**Open questions for PM / dev team:**
- Confirm: discount before vs after tax (cited as "before" in
  current implementation; SOW says "after").
- Confirm: should case-insensitive promo codes be supported?

## Obstacles

**Setup pain:**
- Stripe test card kept timing out at checkout - added 5 min to
  the session.
- Required test promo codes weren't pre-seeded; had to create them
  manually.

**Environment instability:**
- Staging was down for ~10 min mid-session; lost momentum.

**Recommendations for next session:**
- Pre-seed promo codes via a fixture per `synthetic-data-tool-selector`.
- Verify staging is up before session start.

## Feelings

**Quality of attention this session:** Strong (focused throughout;
caught the BUG-987 cluster early which sustained interest).

**Confidence in the feature:** Mixed. The single-promo path is
solid; the multi-promo path has architectural issues that aren't
just bugs (SOW ambiguity on discount-before-tax suggests the
business hasn't fully decided).

**Unease about untested areas:** Moderate. Multi-currency promos
weren't touched; gut says there are bugs there.

**Recommendation to release manager:** Block release until
BUG-987 (stacking) and BUG-988 (SQL injection) are fixed.
BUG-989 (rounding) is low impact; can ship with known-issue note.

## Time accounting (3-bucket)

| Bucket            | Minutes |
|-------------------|--------:|
| Test design       |      35 |
| Setup             |      25 |
| Bug investigation |      30 |
| **Total actual**  |      90 |

(Per SBTM convention; useful for calibrating future sessions - 
high setup % suggests test-data or environment investment is
worth it.)
```

## Step 2 - Aggregation across sessions

Individual debriefs are useful; aggregating them surfaces patterns:

```markdown
## Quarterly debrief rollup - Q2 2026

**Sessions completed:** 47
**Bugs raised:** 138
**Average session: 90-min charter, 3-bucket: 38 / 28 / 24**

### Areas by coverage

| Area                       | Sessions | Bugs found | Last covered |
|----------------------------|---------:|-----------:|--------------|
| Checkout - promo flow       |    8    |    34     | 2026-04-28  |
| Checkout - payment          |    6    |    19     | 2026-05-02  |
| Account - subscription       |    4    |    12     | 2026-05-05  |
| Account - profile            |    3    |     8     | 2026-04-15  |
| Admin panel                  |    1    |     2     | 2026-03-20  |  ← stale
| Reports                      |    0    |     0     | (never)      |  ← uncovered

### Action items from rollup

- Schedule sessions for Admin panel + Reports areas (under-covered).
- Subscription area surfaced 12 bugs - investigate root-cause
  pattern.
- Average setup time (28 min) is high - invest in fixture tooling.
```

The rollup shows what's been explored vs what's stale vs what's
never been touched. Charter authoring uses this to pick where the
next session should focus.

## Step 3 - Quality-of-attention signal

The Feelings section produces a per-session subjective signal.
Track over time:

| Session  | Feelings (numeric: 1-5) | Notes                               |
|----------|-------------------------|-------------------------------------|
| ses-201  |                       4 | Strong; BUG cluster found early.    |
| ses-202  |                       2 | Weak; tester sick / distracted.     |
| ses-203  |                       5 | Excellent; new tester, fresh eyes.  |

When attention is consistently low across a tester / area, change
something - different tester, different time-box, different tour,
different scope.

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
- `exploratory-tours-reference` - the tours catalogued in the Past section.
- `bug-bash-facilitator` - 
  multi-cohort bug bash inherits this debrief format.
