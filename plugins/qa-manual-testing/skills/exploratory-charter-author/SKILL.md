---
name: exploratory-charter-author
description: "Authoring workflow that turns a feature spec, risk area, or bug cluster into a session-based exploratory testing charter per Jonathan and James Bach's SBTM - frames the one-sentence mission, scopes 3-7 areas, picks a 60 / 90 / 120 min time-box, suggests tours, and wires the PROOF debrief deliverables. Per Bach, exploratory testing is \"performing tests while learning things that may influence the testing\" - the charter sets the mission while leaving exact steps to the tester's judgment. Use when a feature has too many unknowns to script (new feature / refactor blast-radius / bug cluster) and a session-based exploration is the right approach. Authors the charter only: the ready-to-fill charter card, session vocabulary, debrief template, and session review live in the exploratory-testing skill this workflow composes with."
---

# exploratory-charter-author

## Overview

A charter is the structured-but-open frame of an SBTM session: it tells the
tester what to **learn**, not what to click. This skill is the authoring
workflow - from a raw input (spec, diff, incident) to a filled charter card.
The card format itself, the session vocabulary, and the time-box rationale are
owned by [`exploratory-testing`](../exploratory-testing/SKILL.md); the
ready-to-fill card is its
[references/charter-template.md](../exploratory-testing/references/charter-template.md).
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
[`exploratory-testing`](../exploratory-testing/SKILL.md).

Suggested tours, and how many to pick per session:
[references/tours.md](../exploratory-testing/references/tours.md).
The charter suggests; the tester picks. For the Bad-data tour, point the
tester at
[`malicious-payload-bank`](../../../qa-test-data/skills/malicious-payload-bank/SKILL.md).

## Step 3 - Wire the deliverables (PROOF debrief)

Sessions deliver a structured PROOF debrief into the
[`exploratory-testing`](../exploratory-testing/SKILL.md) debrief template
([references/debrief.md](../exploratory-testing/references/debrief.md)); the
debrief fields and the session-sheet structure are owned by that skill.
The charter's deliverables block names three things:

- PROOF debrief at session end.
- Defects in `BUG-*` format via
  [`bug-repro-builder`](../../../qa-bug-repro/agents/bug-repro-builder.md).
- Coverage notes: which areas had time, which didn't.

## Step 4 - Fill the charter card

Assemble mission (Step 1), areas + time-box + suggested tours (Step 2), and
deliverables (Step 3) into the card format from
[references/charter-template.md](../exploratory-testing/references/charter-template.md),
adding the source artifact ("Created from: story / diff / incident"), the
target build / SHA, and an explicit out-of-scope list (performance / load →
[`k6-load-testing`](../../../qa-load-testing/skills/k6-load-testing/SKILL.md);
a11y → `qa-accessibility`; cross-browser → `qa-web-e2e`).

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
  [`manual-test-script-author`](../manual-test-script-author/SKILL.md).
- **Post-session debrief** →
  [`exploratory-testing`](../exploratory-testing/SKILL.md) references/debrief.md.
- **Defects found during the session** →
  [`bug-repro-builder`](../../../qa-bug-repro/agents/bug-repro-builder.md).

## References

- Bach J. + Bach J., "Session-Based Test Management" - charter, session,
  debrief vocabulary: https://www.satisfice.com/exploratory-testing
- [`exploratory-testing`](../exploratory-testing/SKILL.md) - owns the charter
  card template, tour catalog, session sheet, and PROOF debrief this workflow
  fills.
