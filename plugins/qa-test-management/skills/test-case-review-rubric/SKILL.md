---
name: test-case-review-rubric
description: "Scores an already-written test case against six per-case quality axes (objective specificity, precondition executability, step granularity, step abstraction level, expected-result observability, traceability validity) and six set-level axes (partition coverage, boundary coverage, duplication, orphan and uncovered requirements, tier shape, identifier consistency). Derives a per-case PASS / WEAK / FAIL verdict and a set verdict from it without averaging, and marks every threshold as either standard-backed (ISTQB glossary, ISTQB CTFL v4.0, ISO/IEC/IEEE 29119-3:2021) or practitioner convention (step-count ceiling, tier bands, provenance threshold). Assumes the case field list and field cardinality are already defined by a test-case anatomy reference and judges content quality only. Use when reviewing a batch of hand-written test cases before promoting them to a release suite or handing them to an automation engineer."
---

# test-case-review-rubric

## What this rubric judges, and what it does not

This rubric answers one question: **given a test case whose fields are already
populated, is the content good enough to hand to someone else?**

It does **not** define what a test case is made of. The canonical field list
(identifier, objective, preconditions, inputs, steps, expected results,
postconditions, environment, traceability) and each field's cardinality
(one-to-one vs one-to-many) belong to a test-case anatomy reference and are
deliberately not restated here. That is the differentiation axis: **anatomy
answers "which fields", this rubric answers "is the content in them any good".**

Two things follow from that split:

- A case missing a required field is **unscorable**, not low-scoring. See Gate 0.
- Where this rubric names a field, it uses the ISTQB glossary sense of the word
  and cites it, rather than re-deriving the field's definition.

Anchor definition, used throughout: a test case is "a set of preconditions,
inputs, actions (where applicable), expected results and postconditions,
developed based on test conditions"
([ISTQB glossary, test case, V4.7.2](https://glossary.istqb.org/en_US/term/test-case)).
Every axis below tests one clause of that sentence.

## Gate 0: is the case scorable at all?

Run this before scoring. A case that fails Gate 0 gets no axis verdicts: it is
reported as `UNSCORABLE` with the missing field named, and returned to its author.

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

Separating presence from quality keeps a templated stub (created but never
filled in) from being reported as six independent quality defects.

## Per-case axes

| ID | Axis | PASS bar | FAIL trigger | Basis |
|---|---|---|---|---|
| **A1** | Objective specificity | The title names a concrete observable behavior and a single verification. "Applies a 10 percent coupon to the subtotal before tax". | Title names only the feature or the activity: "Test checkout", "Checkout works", "Login". Or it joins two unrelated verifications with `and`. | ISO/IEC/IEEE 29119-3:2021 objective field; specificity bar is convention. |
| **A2** | Precondition executability | Each precondition names a state a second tester can reach and confirm: named account, named fixture, named build, named data row. | Precondition is a mood rather than a state: "system is ready", "user has data". Or it is stated but not reachable ("prod DB in Tuesday's shape"). | ISTQB precondition: "the required state of a test item and its test environment prior to test execution" ([glossary](https://glossary.istqb.org/en_US/term/precondition)). |
| **A3** | Step granularity | Each step is one interaction and carries its own expected result. | A step combines two interactions ("log in and add to cart"), or a step has no paired expected result, or the step's leading verb is `Test` / `Verify` / `Check` instead of naming an interaction. | ISTQB test step: "a single interaction between an actor and a test object consisting of an input, an action, and an expected result" ([glossary](https://glossary.istqb.org/en_US/term/test-step)). |
| **A4** | Step abstraction match | Step phrasing sits at the layer the objective claims to verify. | A business-rule case is written in DOM mechanics (`click #btn-checkout-submit`), or a UI-mechanics case is written so abstractly the mechanic under test disappears ("the user navigates the form"). | Convention, informed by [Cucumber, Writing better Gherkin](https://cucumber.io/docs/bdd/better-gherkin/): declarative phrasing "helps you focus on the value that the customer is getting, rather than the keystrokes they will use". |
| **A5** | Expected-result observability | Every expected result names something a tester can observe and compare without judgment: a value, a state, a message, a status code. | Expected result asserts a quality rather than an observation: "works correctly", "performs well", "looks right". Or it needs a judgment call with no documented bar. | ISTQB expected result: "the observable predicted behavior of a test item under specified conditions based on its test basis" ([glossary](https://glossary.istqb.org/en_US/term/expected-result)). Where a bar is needed, name the oracle: "a source to determine an expected result" ([glossary](https://glossary.istqb.org/en_US/term/test-oracle)). |
| **A6** | Traceability validity | The reference resolves to a live requirement, acceptance criterion, or a named exploratory charter. | The reference is present but **stale**: it points at a requirement that no longer exists. A stale reference is worse than none, because it reports coverage that does not exist. | ISTQB traceability: "the ability to establish explicit relationships between related work products or items within work products" ([glossary](https://glossary.istqb.org/en_US/term/traceability)); ISTQB CTFL v4.0 section 1.4.4: "traceability of test cases to requirements can verify that the requirements are covered by test cases" ([syllabus PDF](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)). |

A6 note on the empty case: a **missing** reference is WEAK, not FAIL. A case with
no link is still runnable and still finds defects; a case with a wrong link
actively misreports coverage. An intentionally unlinked case (an exploratory
charter, a smoke check that covers no single requirement) passes A6 when the
absence is stated in the case rather than left blank.

## Set-level axes

Run these once over the whole set, never per case. They diagnose the shape of the
suite, not the craft of any one case.

| ID | Axis | PASS bar | FAIL trigger | Basis |
|---|---|---|---|---|
| **S1** | Equivalence-partition coverage | For every parameter the set exercises, each identified partition (valid and invalid) is covered by at least one case. | Only valid partitions covered, or several cases pile into one partition while others are untouched. | ISTQB CTFL v4.0 section 4.2.1: "to achieve 100% coverage with this technique, test cases must exercise all identified partitions (including invalid partitions) by covering each partition at least once" ([syllabus PDF](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)). |
| **S2** | Boundary coverage | For every ordered partition with a declared bound, the boundary values are exercised. State which BVA variant the set claims: 2-value covers each boundary and its closest neighbor in the adjacent partition; 3-value covers the boundary and both neighbors. | Bounded parameters have cases only at partition midpoints. | ISTQB CTFL v4.0 section 4.2.2, which defines both 2-value and 3-value BVA and their coverage items ([syllabus PDF](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)). |
| **S3** | Duplication | No two cases assert the same postcondition under the same precondition with only cosmetic variation. | Near-identical cases that differ only in title wording or in an input value inside the same partition. Both cost maintenance; only one adds coverage. | Follows from S1: two cases in one partition are one coverage item. |
| **S4** | Orphans and uncovered requirements | Every requirement in scope has at least one case; every case either links to a requirement or declares why it does not. | Requirements in scope with zero linked cases. Report both directions: cases without requirements, and requirements without cases. | ISTQB CTFL v4.0 section 1.4.4: "accurate traceability supports coverage evaluation" ([syllabus PDF](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)). |
| **S5** | Tier shape | The set has a defensible mix of smoke, regression, negative, and edge cases, and the mix matches what the team says the suite is for. | All-smoke sets, or zero negative cases in a set that covers a validated input. | **Convention, not a standard.** See "Conventions" below. |
| **S6** | Identifier consistency | One identifier scheme across the set. | `CART-142-TC-01` mixed with `cart-tc-2` mixed with `Test Case 03`. Inconsistent IDs break defect links and coverage rollups. | Convention. |

## Scoring and verdict derivation

**Per case**, take the worst axis verdict:

| Condition | Case verdict | Meaning |
|---|---|---|
| Any axis FAILs | `FAIL` | Not runnable by a second person as written. Rewrite before execution. |
| No FAIL, one or more axes WEAK | `WEAK` | Runnable, but will cost the next reader time. Fix within the sprint. |
| All axes PASS | `PASS` | Hand it over. |

**Per set**, derive mechanically from the per-case verdicts plus S1 to S6:

| Condition | Set verdict |
|---|---|
| Any case is `FAIL` or `UNSCORABLE`, or any set axis FAILs | `BLOCK` |
| No FAIL anywhere, one or more `WEAK` | `PASS WITH CAVEATS` |
| Everything PASSes | `PASS` |

Two rules keep the aggregate honest:

1. **Never average.** A percentage ("the set scores 86") hides which cases are
   broken and lets a reviewer feel finished without fixing anything. The set
   verdict is a routing decision; the per-case table is the work.
2. **Never let the aggregate replace the detail.** `BLOCK` on a 200-case set with
   three failing cases means "fix these three", not "the suite is bad". Always
   report the failing case identifiers next to the verdict.

## Conventions, stated plainly

Three thresholds in common use have **no standard behind them**. They are useful
tripwires that start a conversation. They are not pass or fail lines, and a team
that has calibrated its own numbers should use those instead.

| Convention | Common value | What it is really detecting |
|---|---|---|
| Step-count ceiling | Roughly 15 steps | Not length. A long case is usually a case with more than one objective. Check A1 before invoking the ceiling: if the title still names a single behavior, a 20-step case may be correct. Flag as WEAK, never FAIL. |
| Tier distribution bands | Smoke 10 to 20 percent, regression 50 to 70 percent, negative 15 to 25 percent, edge 5 to 15 percent | Whether anyone designed the suite. The failure the bands catch is the all-smoke or zero-negative set, not a set that sits five points outside a band. |
| Unresolved-provenance threshold | More than 30 percent of cases with blank or placeholder references | An upstream authoring problem, not a case-review problem. Above the line, stop reviewing cases and go fix how they are being written. |

Nothing in the ISTQB glossary, the ISTQB CTFL v4.0 syllabus, or ISO/IEC/IEEE
29119-3:2021 sets any of these numbers. Presenting them as standards is the most
common way a review loses the author's trust.

## Worked examples

A weak case scored `FAIL` across the axes, then its `PASS` rewrite (with the
per-axis before/after evidence), are worked end to end in
[references/worked-examples.md](references/worked-examples.md).

## Judgment calls reviewers commonly split on

These five are where two competent reviewers reach opposite verdicts on the same
case. Each has a ruling so a review stays consistent across reviewers.

**1. Imperative steps: always a defect?** No. Declarative phrasing ages better
because it survives UI change, which is why
[Cucumber's guidance](https://cucumber.io/docs/bdd/better-gherkin/) prefers it,
but a step is defined as a single interaction between an actor and a test object
([ISTQB](https://glossary.istqb.org/en_US/term/test-step)), and some interactions
genuinely are keystrokes. Judge abstraction against the case's own objective
(axis A4): a keyboard-traversal case *should* say Tab and Shift+Tab; a pricing
case should not say `#btn-checkout-submit`. Flag the mismatch, not the style.

**2. Is `Verify` a banned word?** Only in steps. A step that begins "Verify the
order" names no interaction and no input, so it fails A3. A **title** that begins
"Verifies the order total excludes shipping" names a concrete observable behavior
and passes A1. Banning the verb everywhere produces title churn with no gain.

**3. A missing requirement link: FAIL or WEAK?** WEAK. A **stale** link is FAIL.
The asymmetry is deliberate: an unlinked case under-reports coverage, which is
visible in the S4 rollup; a case pointing at a deleted requirement over-reports
it, which is invisible and is exactly what coverage reporting is supposed to
prevent.

**4. Does one failing case fail the set?** The set verdict goes to `BLOCK`, and
the report names the three failing identifiers out of two hundred. Both halves
matter. Dropping the block lets broken cases ship; dropping the per-case detail
turns the review into an unactionable grade.

**5. Is a 22-step case too long?** Not automatically. Step count is a proxy for
"more than one objective", and A1 measures that directly. If the title still
names one behavior and every step earns its place, note the length and move on.

## Anti-patterns in applying this rubric

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Scoring a stub with empty fields across all six axes | Produces six findings for one problem and buries the real signal. | Gate 0 first: report `UNSCORABLE` with the missing field named. |
| Reporting a single percentage for the set | A number lets everyone feel measured while nothing gets fixed, and it hides which cases are broken. | Per-case verdicts, then a routing verdict derived from them. |
| Quoting the step ceiling or tier bands as standards | They are conventions with no standard behind them; a reviewer who overstates them loses the author's trust on the axes that *are* standard-backed. | Say "our convention" and give the reason (one objective per case; a designed mix). |
| Demanding S1 and S2 verdicts on flow-only cases | Not every case has parameters. Fabricating partition findings for a navigation case is noise. | Emit `n/a, no parameterized inputs` for S1 and S2 on those cases. |
| Failing every case that permits two outcomes | A first-run probe of undocumented behavior may legitimately say "either the client blocks at 32 characters or the server returns 422". | Score it WEAK with a note to collapse to one expected result after the first run, then re-review. |
| Rewriting cases silently during review | The author loses the context of what was wrong, and the same defect returns in the next batch. | Score, cite the axis, propose the rewrite; leave the commit to the author. |
| Running the rubric once | Case sets drift as fast as code. A one-off audit is a snapshot. | Re-run on every batch promoted to a release suite. |

## Limitations

- **Structural, not semantic.** Every axis judges how a case is written. None can
  tell that step 3's expected value is arithmetically wrong for the requirement.
  A domain reviewer still has to read the case.
- **A5 is heuristic at the margin.** "Response is fast" clearly fails. "The banner
  is prominent" is a judgment call about whether a documented bar exists. Reviewers
  will disagree at that boundary; record the reasoning in the evidence cell.
- **S1 and S2 need parameter-aware authoring.** If cases do not expose their input
  partitions, partition and boundary coverage cannot be computed from the case set
  and must be assessed against the specification instead.
- **ISO/IEC/IEEE 29119-3:2021 is cited by stable ID.** The standard is paywalled at
  iso.org and its pages sit behind a bot challenge, so the field-template claims
  attributed to it here cannot be verified by clicking a link. Readers with access
  should check section 6 directly.
- **The ISTQB CTFL syllabus PDF is served with bot protection on some paths.** The
  quotations above were read from the GASQ mirror of the v4.0 PDF, dated
  2023-04-21; the canonical ISTQB link is given in References.
- **Verdict thresholds are opinionated.** "Any FAIL blocks" suits a set about to be
  automated. A team reviewing an exploratory backlog may reasonably run the same
  axes with a softer gate.

## References

- ISTQB glossary V4.7.2, test case: https://glossary.istqb.org/en_US/term/test-case
- ISTQB glossary V4.7.2, test step: https://glossary.istqb.org/en_US/term/test-step
- ISTQB glossary V4.7.2, precondition: https://glossary.istqb.org/en_US/term/precondition
- ISTQB glossary V4.7.2, postcondition: https://glossary.istqb.org/en_US/term/postcondition
- ISTQB glossary V4.7.2, expected result: https://glossary.istqb.org/en_US/term/expected-result
- ISTQB glossary V4.7.2, test oracle: https://glossary.istqb.org/en_US/term/test-oracle
- ISTQB glossary V4.7.2, traceability: https://glossary.istqb.org/en_US/term/traceability
- ISTQB glossary V4.7.2, equivalence partitioning: https://glossary.istqb.org/en_US/term/equivalence-partitioning
- ISTQB glossary V4.7.2, boundary value analysis: https://glossary.istqb.org/en_US/term/boundary-value-analysis
- ISTQB Certified Tester Foundation Level Syllabus v4.0 (2023-04-21), sections
  1.4.4, 4.2.1, 4.2.2: https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf
  (mirror used for quotation: https://www.gasq.org/files/content/gasq/downloads/certification/ISTQB/Foundation%20Level/ISTQB_CTFL_Syllabus-v4.0%20.pdf)
- Cucumber documentation, Writing better Gherkin (declarative vs imperative):
  https://cucumber.io/docs/bdd/better-gherkin/
- ISO/IEC/IEEE 29119-3:2021, "Software and systems engineering, Software testing,
  Part 3: Test documentation", section 6 test case specification. Cited by stable
  ID; full text is paywalled.
