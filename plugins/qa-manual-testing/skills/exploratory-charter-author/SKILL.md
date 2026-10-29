---
name: exploratory-charter-author
description: "Use when a feature has too many unknowns to script (new feature, risky refactor, bug cluster) and the team needs an exploratory test plan. Writes a session-based testing charter: one-sentence mission, 3-7 areas, a 60, 90 or 120 minute time-box, suggested tours and the debrief deliverables."
---

# exploratory-charter-author

## Overview

A charter is the structured-but-open frame of an SBTM session: it tells the
tester what to **learn**, not what to click. This skill is the authoring
workflow - from a raw input (spec, diff, incident) to a filled charter card.
The card format itself, the session vocabulary, and the time-box rationale are
owned by `exploratory-testing`; the
ready-to-fill card is its charter-template reference.
This workflow fills that template - it does not redefine it.

Input: a feature spec / story, a diff / changeset, a bug cluster / incident
postmortem, or a backlog item labeled "needs exploration."
Output: a charter card the tester executes and reports against.

## Step 1 - Frame the mission

The **mission** is the load-bearing field - one sentence telling the
tester what to learn. Three patterns:

| Pattern | Example mission |
|---|---|
| New feature | "Explore the new promo-code apply flow at checkout to discover usability issues, edge cases, and integration risks." |
| Refactor / change risk | "Explore cart and checkout after the cart-state refactor to find regressions in state persistence." |
| Bug cluster / risk area | "Explore the Stripe webhook handler with focus on retry / out-of-order delivery after the webhook-replay incident." |

A mission is **not** "test the checkout page" (too vague) or "verify
promo codes apply" (too narrow - that's a scripted test).

## Step 2 - Scope areas, pick the time-box, suggest tours

**Areas** (3-7 per 90-min session) scope the exploration; they are
**what to look at**, not **what to assert**. Derive them from the input:
spec sections, diff blast-radius, or the bug cluster's common surface.

Time-box lengths (60 / 90 / 120 min) and their rationale:
`exploratory-testing`.

Suggested tours, and how many to pick per session: the tours reference in
`exploratory-testing`.
The charter suggests; the tester picks. For the Bad-data tour, point the
tester at
`malicious-payload-bank`.

## Step 3 - Wire the deliverables (PROOF debrief)

Sessions deliver a structured PROOF debrief into the
`exploratory-testing` debrief template (its debrief reference); the
debrief fields and the session-sheet structure are owned by that skill.
The charter's deliverables block names three things:

- PROOF debrief at session end.
- Defects in `BUG-*` format via
  `bug-repro-builder`.
- Coverage notes: which areas had time, which didn't.

## Step 4 - Fill the charter card

Write `charters/<YYYY-MM-DD>-<kebab-feature>.md`. The minimal card
(the full one, with oracle and SFDPOT sections, is the charter-template
reference in `exploratory-testing`):

```markdown
# Charter - 2026-11-03 - promo-code-apply

**Mission:** Explore the promo-code apply flow at checkout with boundary
inputs and stacked codes to discover discount-calculation defects and
error-state gaps.
**Created from:** STORY-482
**Target build / SHA:** (tester fills before session)
**Time-box:** 90 min
**Tester:** ________  **Date:** ________

## Areas (3-7)
- Code entry and validation messages
- Discount math with stacked codes
- Expiry at the boundary minute
- Cart edits after a code is applied

## Suggested tours
- Bad-data tour (payloads: `malicious-payload-bank`)
- Money tour

## Out of scope
- Load / performance (`k6-load-testing`), accessibility
  (`qa-accessibility`), cross-browser (`qa-web-e2e`)

## Deliverables
- PROOF debrief at session end
- Defects as BUG-* via `bug-repro-builder`
- Coverage notes: areas with time / areas without
```

The mission uses the SBTM "Explore <area> with <resources> to discover
<what to learn>" pattern (cited in the `exploratory-testing` charter
template). Bach defines exploratory testing as testing while learning
([satisfice.com][sbtm]), so the "to discover" clause is what makes it a
mission.

## Step 5 - Validate against the halt rules

Re-read the card against each halt rule below. For every hit, fix the
card and check again; emit it only when none apply:

| Check | Fix |
|---|---|
| Mission has no "to discover" clause | Rewrite it to name what to learn |
| Mission joins two goals with "and also" / two areas of the product | Split into two charters |
| Fewer than 3 or more than 7 areas | Merge narrow areas or split the charter |
| Time-box over 120 min | Split into two charters |
| An area was explored last session | Link that session's PROOF debrief and narrow the area to what it left open, or drop it |
| No out-of-scope list | Add one, even if it says "none" |

## Halt rules

Do **not** emit a charter that violates any of these:

- **No mission.** "Explore X" is not a mission; it's a target. The mission
  must say what to **learn**.
- **Multiple missions in one charter.** Each charter has one mission;
  multi-mission sessions get split.
- **Time-box over 120 minutes.** Longer sessions diminish; split into
  multiple charters.
- **Re-exploring last session's area without its PROOF debrief.** Duplicate
  exploration is a smell; review the previous debrief first.

## Hand-off targets

- **Scripted steps rather than a charter** →
  `manual-test-script-author`.
- **Post-session debrief** →
  the `exploratory-testing` debrief reference.
- **Defects found during the session** →
  `bug-repro-builder`.

## References

- Bach J. + Bach J., "Session-Based Test Management" - charter, session,
  debrief vocabulary: [satisfice.com][sbtm]
- `exploratory-testing` - owns the charter
  card template, tour catalog, session sheet, and PROOF debrief this workflow
  fills.

[sbtm]: https://www.satisfice.com/exploratory-testing
