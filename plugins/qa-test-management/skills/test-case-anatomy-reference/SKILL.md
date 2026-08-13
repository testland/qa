---
name: test-case-anatomy-reference
description: "Pure-reference catalog of test-case anatomy and review quality - what fields a well-formed test case must have, what each field means, and how to score the content once the fields are filled. Enumerates the ISO/IEC/IEEE 29119-3:2021 test-case template fields (identifier, objective, preconditions, inputs, steps, expected results, postconditions, environment, traceability) and the ISTQB CTAL-TM specification-technique-driven additions (equivalence partition, boundary value, decision table, state transition), maps the canonical anatomy to five tracker-specific schemas (TestRail, Xray, Zephyr Scale, Allure TestOps, Qase), and carries the review rubric: six per-case quality axes plus six set-level axes with PASS / WEAK / FAIL verdicts derived without averaging, each threshold marked standard-backed or practitioner convention. Use as the authoritative source when authoring a case template, reviewing a batch of test cases for quality, or migrating between tools."
---

# test-case-anatomy-reference

## Overview

A test case has nine required parts. Skipping any of them produces
a case that's either ambiguous (a tester can't run it) or
unverifiable (a reviewer can't tell if it passed). The canonical
list comes from ISO/IEC/IEEE 29119-3:2021 §6, augmented by ISTQB
CTAL-TM's specification-based-testing additions.

This skill is a **pure reference** consumed by
`traceability-matrix-builder`, `tcm-case-management` (and its five
per-vendor references), and the `test-case-quality-critic` agent.

## When to use

- Authoring a case template for a new project.
- Reviewing whether a draft case has all required fields.
- Migrating cases between tools (TestRail → Xray; Zephyr → Qase) - need to map fields consistently.
- Onboarding a tester to "what makes a case complete?"

## How to use

1. Start from the nine canonical fields table below - treat it as the checklist a well-formed case must satisfy.
2. Fill each field concretely: name the exact identifier, one-sentence objective, verifiable preconditions, literal inputs, one action per step, a per-step expected result, postconditions, environment, and at least one traceability link.
3. If the case came from a specification technique, attach the technique-specific metadata from the ISTQB additions table (partition, boundary value, rule vector, state / event / output).
4. Map each canonical field to your tracker's real field name using [references/tracker-schema-map.md](references/tracker-schema-map.md), and set severity / priority / type from its cross-platform table.
5. Check the field cardinality reference so one-to-many fields (steps, inputs, expected results, environment, traceability) are modelled as arrays, not blobs.
6. Run the draft past the anti-patterns table; fix any match before the case is considered done.
7. When migrating, author in the canonical anatomy first, then let the tracker mapping be additive so a later tool switch stays cheap.

## The nine canonical fields (ISO 29119-3 §6)

Per ISO/IEC/IEEE 29119-3:2021 "Software and systems engineering - 
Software testing - Part 3: Test documentation" (cite by stable
ID; full text behind iso.org paywall):

| # | Field | Purpose | Common mistakes |
|---|---|---|---|
| 1 | **Identifier** | Unique ID for cross-reference, traceability, defect linking. | Reusing IDs after deletion; non-stable IDs across migrations. |
| 2 | **Objective** | One-sentence statement of what's being verified. | Vague ("test checkout"); should state behaviour ("verify discount applies before tax"). |
| 3 | **Preconditions** | System state required before the case runs. | Implicit ("user is logged in"); should be executable / verifiable. |
| 4 | **Inputs** | Specific data values fed to the system. | Generic ("a valid email"); should be concrete ("alice@example.com"). |
| 5 | **Steps** | Numbered actions the tester performs. | Combining actions ("login and add item"); should be one action per step. |
| 6 | **Expected results** | What the system should produce per step / overall. | Missing per-step results; should pair each action with its expected outcome. |
| 7 | **Postconditions** | System state after the case (cleanup expectations). | Omitted; matters for shared environments. |
| 8 | **Environment** | Where the case is valid (browser, OS, build, locale). | Universal-applicability assumption; should constrain explicitly. |
| 9 | **Traceability** | Links to requirements, designs, defects. | One-way link only (case → req); should be bidirectional. |

## ISTQB CTAL-TM specification-technique additions

Per the ISTQB Advanced Test Manager and Test Analyst syllabi, when
a case is derived from a specification technique, it carries
technique-specific metadata:

| Technique | Additional fields |
|---|---|
| **Equivalence partitioning** | Partition (valid/invalid), partition label, representative input |
| **Boundary value analysis** | Boundary (min, max, on/off), the specific BVA value (-1, 0, 1, 99, 100, 101) |
| **Decision table** | Rule ID, condition vector, action vector |
| **State transition** | Starting state, event, ending state, output |
| **Use case** | Main success scenario step, extension point |
| **Classification tree** | Tree node path |

These fields don't replace the nine above - they're traceability
to the design technique that produced the case. Per the ISTQB
glossary
([glossary.istqb.org](https://glossary.istqb.org/)).

## Tracker-schema map

Five common trackers (TestRail, Xray, Zephyr Scale, Allure TestOps,
Qase) each store the canonical anatomy under different field names,
plus their own severity / priority / type enums. The full per-tracker
field map and the cross-platform severity / priority / type table live
in [references/tracker-schema-map.md](references/tracker-schema-map.md).
Consult it when migrating cases between tools or writing to a specific
tracker's fields.

## Field cardinality reference

A migration / template author must know which fields are
one-to-one and which are one-to-many:

| Field | Cardinality |
|---|---|
| Identifier | 1 |
| Objective | 1 |
| Preconditions | 1 (free text) or n (linked sub-entities, Xray-style) |
| Steps | n (ordered) |
| Inputs | n (per step) |
| Expected results | n (one per step + optional overall) |
| Postconditions | 1 |
| Environment | n (browser × OS × locale × build) |
| Traceability | n (requirements, designs, defects) |
| Severity | 1 |
| Priority | 1 |
| Type | 1 |
| Automation status | 1 |
| Tags | n |

## Review rubric

The anatomy above answers "which fields"; this rubric answers "is the content
in them any good" - **given a case whose fields are already populated, is the
content good enough to hand to someone else?** Anchor definition: a test case
is "a set of preconditions, inputs, actions (where applicable), expected
results and postconditions, developed based on test conditions"
([ISTQB glossary, test case, V4.7.2](https://glossary.istqb.org/en_US/term/test-case)).
Every axis tests one clause of that sentence.

### Gate 0: is the case scorable at all?

Run this before scoring. A case that fails Gate 0 gets no axis verdicts: it
is reported as `UNSCORABLE` with the missing field named, and returned to its
author. Separating presence from quality keeps a templated stub from being
reported as six independent quality defects.

| Gate 0 check | Result if absent |
|---|---|
| Identifier present and unique | `UNSCORABLE` |
| Objective (title) present | `UNSCORABLE` |
| Preconditions present | `UNSCORABLE` |
| At least one step present | `UNSCORABLE` |
| At least one expected result present | `UNSCORABLE` |
| Environment stated | Score normally, raise a warning |
| Priority, severity, type populated | Score normally, raise a warning |
| Traceability reference present | Score normally, scored by axis A6 |

### Per-case axes

| ID | Axis | PASS bar | FAIL trigger | Basis |
|---|---|---|---|---|
| **A1** | Objective specificity | The title names a concrete observable behavior and a single verification. "Applies a 10 percent coupon to the subtotal before tax". | Title names only the feature or the activity: "Test checkout", "Checkout works", "Login". Or it joins two unrelated verifications with `and`. | ISO/IEC/IEEE 29119-3:2021 objective field; specificity bar is convention. |
| **A2** | Precondition executability | Each precondition names a state a second tester can reach and confirm: named account, named fixture, named build, named data row. | Precondition is a mood rather than a state: "system is ready", "user has data". Or it is stated but not reachable ("prod DB in Tuesday's shape"). | ISTQB precondition: "the required state of a test item and its test environment prior to test execution" ([glossary](https://glossary.istqb.org/en_US/term/precondition)). |
| **A3** | Step granularity | Each step is one interaction and carries its own expected result. | A step combines two interactions ("log in and add to cart"), or a step has no paired expected result, or the step's leading verb is `Test` / `Verify` / `Check` instead of naming an interaction. | ISTQB test step: "a single interaction between an actor and a test object consisting of an input, an action, and an expected result" ([glossary](https://glossary.istqb.org/en_US/term/test-step)). |
| **A4** | Step abstraction match | Step phrasing sits at the layer the objective claims to verify. | A business-rule case is written in DOM mechanics (`click #btn-checkout-submit`), or a UI-mechanics case is written so abstractly the mechanic under test disappears. | Convention, informed by [Cucumber, Writing better Gherkin](https://cucumber.io/docs/bdd/better-gherkin/): declarative phrasing "helps you focus on the value that the customer is getting, rather than the keystrokes they will use". |
| **A5** | Expected-result observability | Every expected result names something a tester can observe and compare without judgment: a value, a state, a message, a status code. | Expected result asserts a quality rather than an observation: "works correctly", "performs well", "looks right". Or it needs a judgment call with no documented bar. | ISTQB expected result: "the observable predicted behavior of a test item under specified conditions based on its test basis" ([glossary](https://glossary.istqb.org/en_US/term/expected-result)). Where a bar is needed, name the oracle ([glossary](https://glossary.istqb.org/en_US/term/test-oracle)). |
| **A6** | Traceability validity | The reference resolves to a live requirement, acceptance criterion, or a named exploratory charter. | The reference is present but **stale**: it points at a requirement that no longer exists. A stale reference is worse than none, because it reports coverage that does not exist. | ISTQB traceability ([glossary](https://glossary.istqb.org/en_US/term/traceability)); ISTQB CTFL v4.0 section 1.4.4: "traceability of test cases to requirements can verify that the requirements are covered by test cases" ([syllabus PDF](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)). |

A6 note on the empty case: a **missing** reference is WEAK, not FAIL. A case
with no link is still runnable; a case with a wrong link actively misreports
coverage. An intentionally unlinked case (an exploratory charter, a smoke
check covering no single requirement) passes A6 when the absence is stated
in the case rather than left blank.

### Set-level axes

Run these once over the whole set, never per case. They diagnose the shape
of the suite, not the craft of any one case.

| ID | Axis | PASS bar | FAIL trigger | Basis |
|---|---|---|---|---|
| **S1** | Equivalence-partition coverage | For every parameter the set exercises, each identified partition (valid and invalid) is covered by at least one case. | Only valid partitions covered, or several cases pile into one partition while others are untouched. | ISTQB CTFL v4.0 section 4.2.1: "test cases must exercise all identified partitions (including invalid partitions) by covering each partition at least once" ([syllabus PDF](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)). |
| **S2** | Boundary coverage | For every ordered partition with a declared bound, the boundary values are exercised. State which BVA variant the set claims: 2-value covers each boundary and its closest neighbor in the adjacent partition; 3-value covers the boundary and both neighbors. | Bounded parameters have cases only at partition midpoints. | ISTQB CTFL v4.0 section 4.2.2, which defines both 2-value and 3-value BVA and their coverage items ([syllabus PDF](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)). |
| **S3** | Duplication | No two cases assert the same postcondition under the same precondition with only cosmetic variation. | Near-identical cases that differ only in title wording or in an input value inside the same partition. | Follows from S1: two cases in one partition are one coverage item. |
| **S4** | Orphans and uncovered requirements | Every requirement in scope has at least one case; every case either links to a requirement or declares why it does not. | Requirements in scope with zero linked cases. Report both directions. | ISTQB CTFL v4.0 section 1.4.4: "accurate traceability supports coverage evaluation". |
| **S5** | Tier shape | The set has a defensible mix of smoke, regression, negative, and edge cases, matching what the team says the suite is for. | All-smoke sets, or zero negative cases in a set that covers a validated input. | **Convention, not a standard.** See "Conventions" below. |
| **S6** | Identifier consistency | One identifier scheme across the set. | `CART-142-TC-01` mixed with `cart-tc-2` mixed with `Test Case 03`. Inconsistent IDs break defect links and coverage rollups. | Convention. |

### Scoring and verdict derivation

**Per case**, take the worst axis verdict: any axis FAIL = `FAIL` (not
runnable by a second person as written; rewrite before execution); no FAIL
but one or more WEAK = `WEAK` (runnable, fix within the sprint); all PASS =
`PASS`.

**Per set**: any case `FAIL` / `UNSCORABLE` or any set axis FAIL = `BLOCK`;
no FAIL anywhere but one or more `WEAK` = `PASS WITH CAVEATS`; else `PASS`.

Two rules keep the aggregate honest: **never average** (a percentage hides
which cases are broken), and **never let the aggregate replace the detail**
(`BLOCK` on a 200-case set with three failing cases means "fix these three",
named by identifier - not "the suite is bad").

### Conventions, stated plainly

Three thresholds in common use have **no standard behind them**. They are
tripwires that start a conversation, not pass / fail lines; a team with
calibrated numbers should use those instead.

| Convention | Common value | What it is really detecting |
|---|---|---|
| Step-count ceiling | Roughly 15 steps | Not length: a long case is usually a case with more than one objective. Check A1 first; if the title still names a single behavior, a 20-step case may be correct. Flag as WEAK, never FAIL. |
| Tier distribution bands | Smoke 10-20%, regression 50-70%, negative 15-25%, edge 5-15% | Whether anyone designed the suite. The failure the bands catch is the all-smoke or zero-negative set, not a set five points outside a band. |
| Unresolved-provenance threshold | More than 30% of cases with blank or placeholder references | An upstream authoring problem, not a case-review problem. Above the line, stop reviewing and fix how cases are written. |

Nothing in the ISTQB glossary, the CTFL v4.0 syllabus, or ISO/IEC/IEEE
29119-3:2021 sets these numbers; presenting them as standards is the most
common way a review loses the author's trust.

### Judgment calls reviewers split on

- **Imperative steps** are not automatically defects: judge abstraction
  against the case's own objective (A4). A keyboard-traversal case *should*
  say Tab and Shift+Tab; a pricing case should not say
  `#btn-checkout-submit`.
- **`Verify` is banned only in steps** (names no interaction, fails A3); a
  title beginning "Verifies the order total excludes shipping" passes A1.
- **Missing requirement link is WEAK; a stale link is FAIL.** An unlinked
  case under-reports coverage (visible in S4); a stale link over-reports it,
  invisibly.
- **One failing case sends the set to `BLOCK`** - and the report names the
  failing identifiers, both halves.
- **A disjunctive expected result** ("either client blocks at 32 chars or
  server returns 422") on a first-run probe of undocumented behavior is
  WEAK with a collapse-after-first-run note, not FAIL.

A weak case scored `FAIL` across the axes, then its `PASS` rewrite with
per-axis before / after evidence, is worked end to end in
[references/review-rubric-worked-examples.md](references/review-rubric-worked-examples.md).

### Rubric limitations

- **Structural, not semantic.** No axis can tell that step 3's expected
  value is arithmetically wrong for the requirement; a domain reviewer still
  reads the case.
- **A5 is heuristic at the margin.** "Response is fast" clearly fails; "the
  banner is prominent" is a judgment call - record the reasoning.
- **S1 / S2 need parameter-aware authoring**; when cases don't expose input
  partitions, assess against the specification instead and emit
  `n/a, no parameterized inputs` rather than fabricating findings.
- **Verdict thresholds are opinionated.** "Any FAIL blocks" suits a set
  about to be automated; an exploratory backlog may run the same axes with a
  softer gate.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One step per case | Cases proliferate; coverage harder to track | Group related steps into one case with multiple ordered steps |
| Steps as a single text blob | Per-step pass/fail tracking impossible | Use Steps template (TestRail) / steps array (everywhere else) |
| Implicit preconditions | "User is logged in" - but as whom? | State preconditions in verifiable terms |
| Generic inputs | "Use a valid email" - tester picks one, results vary | Specify concrete inputs |
| No traceability links | Case-to-requirement orphans; coverage reporting broken | Always link to at least one requirement |
| Missing expected results per step | Tester runs steps but can't tell what to assert | Pair every step with its expected outcome |
| Tracker-specific case structure mixed in | Migration cost exploded | Author cases in the canonical anatomy; let tracker mapping be additive |
| Reusing IDs after deletion | History broken; defect links point to ghost cases | IDs are immutable; deletion is soft |
| Scoring a stub with empty fields across all six axes | Six findings for one problem; buries the real signal | Gate 0 first: report `UNSCORABLE` with the missing field named |
| Reporting a single percentage for a reviewed set | Hides which cases are broken; nothing gets fixed | Per-case verdicts, then a routing verdict derived from them |
| Quoting the step ceiling or tier bands as standards | Conventions with no standard behind them; overstating them costs trust on the standard-backed axes | Say "our convention" and give the reason |
| Rewriting cases silently during review | The author loses the context; the same defect returns next batch | Score, cite the axis, propose the rewrite; leave the commit to the author |

## Worked example

A reviewer receives a draft case titled "test checkout" with a single
free-text blob: "log in, add item, apply code SAVE10, pay, order
confirmed." Walking it against the nine canonical fields:

1. **Identifier** - none assigned; give it a stable ID (`C1051`).
2. **Objective** - "test checkout" is vague; rewrite to "verify a 10% discount applies before tax at checkout."
3. **Preconditions** - implicit "logged in"; make it verifiable: "user `alice@example.com` is authenticated with an empty cart."
4. **Inputs** - generic "an item"; specify "SKU `WIDGET-1`, unit price 20.00, coupon `SAVE10`."
5. **Steps / Expected results** - the blob combines four actions; split into ordered steps each paired with an expected result (add item -> cart shows 20.00; apply `SAVE10` -> subtotal shows 18.00; pay -> confirmation page renders; overall -> order total taxes the discounted 18.00, not 20.00).
6. **Postconditions** - add "cart is emptied; one order record created."
7. **Environment** - unstated; constrain to "Chrome / build 4.2 / en-US."
8. **Traceability** - orphaned; link to requirement `REQ-DISCOUNT-3`.

Mapping to TestRail via the tracker-schema map: objective -> `title`,
preconditions -> `custom_preconds`, the step / expected pairs ->
`custom_steps_separated` (Steps template), traceability -> `refs`. The
blob is now a complete, runnable, verifiable case.

## Limitations

- **Tracker reality varies.** Custom-field discipline differs
  across orgs; this anatomy is the floor.
- **Specification-technique linkage is optional.** Most teams
  don't carry the technique metadata; ISTQB-aligned orgs do.
- **Environment as a case-level field is imperfect.** Some
  trackers (Xray, Zephyr) push environment to the run level - the
  case is environment-agnostic until executed.
- **Traceability is bidirectional in theory, often unidirectional
  in practice.** Tools support bidirectional but discipline lapses.

## References

- ISO/IEC/IEEE 29119-3:2021 §6 "Test case specification" - cite
  by stable ID; canonical anatomy. Full text behind iso.org paywall.
- ISTQB Advanced Test Manager (CTAL-TM) syllabus - 
  specification-technique-driven case derivation.
- ISTQB Glossary - 
  [glossary.istqb.org](https://glossary.istqb.org/) - test case, test step,
  precondition, expected result, test oracle, traceability, equivalence
  partitioning, boundary value analysis (V4.7.2, cited inline in the rubric).
- ISTQB Certified Tester Foundation Level Syllabus v4.0 (2023-04-21),
  sections 1.4.4, 4.2.1, 4.2.2:
  https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf
  (mirror used for quotation: https://www.gasq.org/files/content/gasq/downloads/certification/ISTQB/Foundation%20Level/ISTQB_CTFL_Syllabus-v4.0%20.pdf)
- Cucumber documentation, Writing better Gherkin (declarative vs imperative):
  https://cucumber.io/docs/bdd/better-gherkin/
- TestRail Cases API reference - 
  support.testrail.com/hc/en-us/articles/7077871398036-Cases
  (Cloudflare-protected; cite by stable URL).
- Xray Cloud REST API - docs.getxray.app/display/XRAYCLOUD/REST+API.
- Zephyr Scale Cloud REST API v2 - 
  smartbear.com/test-management/zephyr-scale.
- Allure TestOps REST API - 
  docs.qameta.io/allure-testops/integrations/rest-api/.
- Qase Public API - developers.qase.io.
- Sibling skills:
  `traceability-matrix-builder`,
  `tcm-case-management` (the five per-vendor schemas live in its references/).
