---
name: decision-table-test-design
description: "Derives human-readable manual test cases from a business-rule spec via a decision table: identify conditions and actions, build the full 2^n-column matrix, collapse columns with irrelevant entries, strike infeasible combinations, then emit one test case per remaining column (each feasible column is one coverage item per ISTQB CTFL v4.0 section 4.2.3). A deep single-technique walkthrough rather than a broad multi-lens case matrix; the output is manual step/expected cases rather than parameterized test code, and it covers how cases are derived rather than how a case record is structured. Use when a spec's outcome depends on interacting conditions (pricing, eligibility, discounts, routing rules) rather than the boundaries of a single input."
metadata:
  keywords: "decision table, test design, istqb, ctfl, business rules, combinations, black-box, manual testing"
---

# decision-table-test-design

## Overview

Per [ISTQB CTFL Syllabus v4.0.1 §4.2.3](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf),
"decision tables are used for testing the implementation of requirements
that specify how different combinations of conditions result in different
outcomes" and are "an effective way of recording complex logic, such as
business rules." This skill walks that derivation end to end: spec in,
human-readable manual test cases out (step/expected tables, not code).

All syllabus claims below come from that v4.0.1 PDF (2024-09-15 revision);
later references cite it as §4.2.3 without repeating the URL. One worked
example (a shipping-fee rule) is carried through every step.

## When to use (and when EP/BVA wins)

Use a decision table when the spec is **business-rule logic with
interacting conditions** - the outcome depends on the *combination* of
conditions, not on any single condition alone (pricing, discount stacking,
eligibility, approval routing, feature gating). §4.2.3 names a second use:
the technique "provides a systematic approach to identify all the
combinations of conditions, some of which might otherwise be overlooked"
and "helps to find any gaps or contradictions in the requirements", so a
reviewer can also run it to check a spec for completeness.

Prefer equivalence partitioning / boundary value analysis instead when a
single input's *range* drives the behavior (e.g. "age must be 18-120"):
EP/BVA exercises the edges of one partition; a decision table exercises the
cross-product of several conditions. The two compose - derive the rule
columns here, then hand each numeric threshold (like the $50 below) to
`boundary-value-generator` for edge values. For a broad first-pass matrix
across many lenses rather than one technique in depth, use
`test-case-ideation-from-story`.

## Worked example spec (used in every step)

> **Shipping fee rules.** Premium members always ship free (standard or
> express). Non-members: standard shipping is free for orders of $50 or
> more, otherwise $5.99; express shipping is a flat $14.99. Express is
> only offered at checkout for orders of $50 or more (courier minimum).

## Step 1 - Identify conditions and actions

Per §4.2.3, "the conditions and the resulting actions of the system are
defined. These form the rows of the table. Each column corresponds to a
decision rule that defines a unique combination of conditions, along with
the associated actions."

Extract from the spec:

| ID | Conditions (Boolean) |
|----|----------------------|
| C1 | Customer is a premium member |
| C2 | Order total is $50 or more |
| C3 | Express shipping selected |

| ID | Actions |
|----|---------|
| A1 | Charge $0.00 (free shipping) |
| A2 | Charge $5.99 standard fee |
| A3 | Charge $14.99 express fee |

Guidance: make each condition **atomic** (one yes/no question) and
**independently settable** by a tester. "Member with a large order" is
two conditions, not one. Every distinct outcome in the spec becomes an
action row; if an outcome appears in the spec but in no action row, you
mis-extracted.

## Step 2 - Build the full table (2^n columns)

"A full decision table has enough columns to cover every combination of
conditions" (§4.2.3). For n Boolean conditions that is 2^n columns; here
2^3 = 8.

Notation, per the same section: `T` means the condition is satisfied,
`F` not satisfied, a dash (written `-` here) means the condition's value
"is irrelevant for the action outcome", and `N/A` means the condition "is
infeasible for a given rule". For actions, `X` means the action should
occur and blank means it should not. The syllabus adds that "other
notations may also be used."

Fill every column mechanically from the spec:

| | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|
| C1 member | T | T | T | T | F | F | F | F |
| C2 total >= $50 | T | T | F | F | T | T | F | F |
| C3 express | T | F | T | F | T | F | T | F |
| A1 free | X | X | ? | X | | X | ? | |
| A2 $5.99 | | | | | | | | X |
| A3 $14.99 | | | | | X | | ? | |

R3 and R7 already smell: the spec says express is only offered at $50 or
more, so "express selected on a sub-$50 order" may not be reachable. Mark
them `?` for now; Step 4 resolves it. Do not skip building the full
table: the mechanical cross-product is what surfaces the overlooked
combinations §4.2.3 warns about.

## Step 3 - Collapse with irrelevant (dash) entries

The table "can also be minimized by merging columns, in which some
conditions do not affect the outcome, into a single column" (§4.2.3).
(Formal minimization algorithms are explicitly "out of scope of this
syllabus"; pairwise inspection is enough at this scale.)

A merge is legal only if **every expansion of the dash is feasible and
produces identical actions**.

- R2 + R4 (member, standard): free either way; C2 does not affect the
  outcome. Merge into one column with C2 = `-`. **Legal.**
- R1 + R3 (member, express) and R5 + R7 (non-member, express) look
  mergeable on the same logic, but R3 and R7 are the columns flagged `?`
  in Step 2. **Hold both merges until the feasibility check.**

## Step 4 - Spot infeasible combinations

"The table can be simplified by deleting columns containing infeasible
combinations of conditions" (§4.2.3).

Re-read the spec for constraints that make condition combinations
unreachable. Here: express is never offered below $50, so C3 = `T` with
C2 = `F` cannot occur. R3 and R7 are infeasible; delete them. That kills
the held merges from Step 3: C2 is **not** irrelevant in the express
columns, because only one of its values is reachable there. A naive
R1 + R3 merge would have produced a test case for an impossible state.

Final collapsed table (5 feasible columns):

| | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| C1 member | T | T | F | F | F |
| C2 total >= $50 | T | - | T | T | F |
| C3 express | T | F | T | F | F |
| A1 free | X | X | | X | |
| A2 $5.99 | | | | | X |
| A3 $14.99 | | | X | | |

The infeasible columns are not test-less: add one **constraint check**
outside the table that verifies the infeasibility itself holds (the
express option is absent from checkout below $50). If that check fails,
the table must be rebuilt with R3/R7 feasible.

## Step 5 - One test case per remaining column

Per §4.2.3, "the coverage items are the columns containing feasible
combinations of conditions", 100% coverage means test cases "exercise all
these columns", and "coverage is measured as the number of exercised
columns, divided by the total number of feasible columns". Here: 5
feasible columns = 5 coverage items; the 5 cases below = 100% decision
table coverage (5/5).

For a dash entry, pick one concrete value (P2 below uses $20; pairing
with BVA would add $49.99/$50.00 around the threshold).

| TC ID | Column | Setup | Action | Expected result |
|---|---|---|---|---|
| TC-DT-1 | P1 | Member account; cart total $80.00 | Select express at checkout | Shipping line shows $0.00; order total unchanged |
| TC-DT-2 | P2 | Member account; cart total $20.00 | Select standard at checkout | Shipping line shows $0.00 |
| TC-DT-3 | P3 | Non-member account; cart total $80.00 | Select express at checkout | Shipping line shows $14.99 |
| TC-DT-4 | P4 | Non-member account; cart total $80.00 | Select standard at checkout | Shipping line shows $0.00 |
| TC-DT-5 | P5 | Non-member account; cart total $20.00 | Select standard at checkout | Shipping line shows $5.99 |
| TC-DT-6 | (constraint) | Non-member account; cart total $20.00 | Open shipping options at checkout | Express option is not offered |

Each row expands into a full runnable script (preconditions, per-step
expected results, sign-off) via `manual-test-script-author`; this skill's
output is the derivation plus the case table above.

## Extended-entry tables and anti-patterns

The limited-entry vs extended-entry table forms (when to collapse
correlated numeric conditions into one row) and the technique's
anti-patterns table are in
[references/decision-table-details.md](references/decision-table-details.md).

## Limitations

- **Stateless rules only.** Decision tables model input-combination
  logic. If the outcome depends on history (what happened before this
  event), use
  `state-transition-test-design`.
- **Combination coverage, not boundary coverage.** A column says
  "total >= $50 is true"; it does not test $49.99 vs $50.00. Pair each
  threshold with `boundary-value-generator`.
- **Minimization is informal here.** Formal minimization algorithms are
  out of CTFL scope per §4.2.3; for large tables expect to lean on
  risk-based selection rather than perfect minimal form.

## References

- ISTQB CTFL Syllabus v4.0.1, §4.2.3 Decision Table Testing -
  [istqb.org PDF](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)
  (official syllabus, fetched 2026-06-10; all quoted phrases above are
  from this section).
- ISTQB Glossary term "decision table testing" exists at
  glossary.istqb.org but the site blocks non-browser fetches; cite the
  syllabus section above as the stable source.
- Siblings:
  `state-transition-test-design`
  (stateful behavior),
  `manual-test-script-author`
  (expands derived cases into runnable scripts).
- Neighbors this skill is distinct from:
  `test-case-ideation-from-story`,
  `boundary-value-generator`,
  `test-case-anatomy-reference`.
