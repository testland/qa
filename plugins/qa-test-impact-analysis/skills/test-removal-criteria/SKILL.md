---
name: test-removal-criteria
description: "Decides which existing tests should stop existing, using five removal classes (duplicate, tautology, trivial, dead-signal, orphan) and a four-condition delete gate where every condition must hold or the verdict reverts to keep. Puts the burden of proof on removal: each proposed deletion carries a written reason, redundant-coverage evidence from a per-test source map, and a named reviewer, and a test that has simply never failed is treated as possibly load-bearing rather than worthless. Covers removal only, not per-change test selection. Use when a suite has grown faster than its signal value and someone is about to open a pruning or suite-curation change set that deletes test files."
---

# test-removal-criteria

## The axis: removal, not selection

Two questions about a large test suite get confused, and they have very
different risk profiles:

| Question | What it decides | Effect of a wrong answer |
|----------|-----------------|--------------------------|
| Which tests run on this change? | A per-change subset of an unchanged suite. | Recoverable: the skipped test still exists and runs on the next full pass. |
| Which tests should stop existing? | The contents of the suite itself. | Not recoverable in practice: the behavior stops being asserted, and nothing in CI announces the loss. |

This skill owns the second question only. Anything about narrowing a single
run (impacted-set computation, previously-failing sets, fallback triggers,
nightly safety runs) belongs to per-change selection and is deliberately out
of scope here.

The asymmetry is the whole reason this skill is written conservatively.
Meszaros names the end state of a bad removal a **Lost Test**, whose symptom
is that "the number of tests being executed in a test suite has dropped (or
has not increased as much as expected)", and lists it as a direct cause of
**Production Bugs**: untested code has "no automated tests to tell the
developer when they have introduced a problem"
([Meszaros, Production Bugs](http://xunitpatterns.com/Production%20Bugs.html)).
A deleted test and a disabled test produce the same silence.

## How to use

1. Classify each candidate into exactly one removal class - `duplicate`,
   `tautology`, `trivial`, `dead-signal`, or `orphan` (Step 1); anything that
   fits no class is not a candidate.
2. Apply that class's test to confirm the classification (Step 2), honouring
   the never-remove list.
3. Run the four-condition delete gate; any failed or missing-input condition
   reverts the verdict to `keep` (Step 3).
4. Choose the action - `keep`, `rewrite`, `fold`, or `remove` (Step 4).
5. Record the pass as a ledger plus a kept table, packaged by confidence -
   templates and the confidence-to-action rules are in
   [references/removal-ledger-and-report-format.md](references/removal-ledger-and-report-format.md)
   (Step 5).

## The burden of proof sits on removal

Five rules govern every decision below. They are not advisory.

1. **Keep is the default verdict.** A test stays unless a removal case is
   affirmatively made. "No case was made either way" resolves to keep, never
   to delete.
2. **Every removal carries a stated reason and a named reviewer.** The reason
   names the removal class and the evidence; the reviewer is a person, not a
   team alias, who signed off on that specific row. A removal without both is
   not eligible to ship. (Practitioner convention, not a standard: teams that
   skip the named-reviewer column end up with rubber-stamped bulk deletes.)
3. **"It never fails" is not evidence a test is worthless.** A test that has
   passed for years while its subject churned may be the load-bearing guard
   that is passing *because the code is still correct*. Absence of failure is
   absence of evidence, in both directions.
4. **Coverage-tool output alone is not grounds for removal.** Coverage finds
   untested code; it does not measure test quality. Per Fowler, "if you make a
   certain level of coverage a target, people will try to attain it. The
   trouble is that high coverage numbers are too easy to reach with low
   quality testing"
   ([Fowler, TestCoverage](https://martinfowler.com/bliki/TestCoverage.html)).
   A redundant-coverage number is one input to the delete gate below, never
   the whole case.
5. **Never remove a test to make a signal go away.** Meszaros is explicit
   about the temptation with an intermittently failing test: "we may be
   tempted to remove the failing test from the suite to 'Keep the Bar Green'
   but this would result in an (intentional) Lost Test"
   ([Meszaros, Erratic Test](http://xunitpatterns.com/Erratic%20Test.html)).
   Flakiness is a diagnosis problem, not a removal class. Quarantine and fix.

## Step 1 - Classify the candidate into one removal class

Each candidate gets exactly one class. If two fit, take the more conservative
one (the one lower in this table).

| Class | Signal that puts a test in this class | Default action |
|-------|----------------------------------------|----------------|
| `duplicate` | Two tests with the same normalized setup and the same normalized assertion arguments. | Keep one, remove the other. |
| `trivial` | The body has no assertion at all, or its only assertion is self-satisfying (`expect(true).toBe(true)`, `expect(1).toBe(1)`, `expect(undefined).toBe(undefined)`). | Remove. |
| `orphan` | The test imports a module or calls a function that no longer exists. | Remove, and name the missing module in the change description. |
| `tautology` | The expected side of the assertion recomputes the behavior under test. | Rewrite to a known-good literal. Remove only if the rewrite has no value left. |
| `dead-signal` | Zero failures across the signal window while the source files it covers have churned. | Human review only, per test. Never batched. |

A candidate that fits none of these five classes is not a removal candidate.
"Old", "long", "slow", "nobody remembers why it is there", and "the coverage
report says it is redundant" are not classes.

### The never-remove list

Regardless of class, a test is off limits when any of these holds:

- It is labeled `@critical`, `@regression-guard`, or any team-configured
  do-not-delete marker.
- It has failed inside the signal window. A failure is the exact evidence
  that says this is a real test.
- A test-code quality review has flagged it for rewrite. Obscure or badly
  structured tests get refactored, not deleted: "test code is just as
  important as the production code and it needs to be refactored just as
  often" ([Meszaros, Obscure Test](http://xunitpatterns.com/Obscure%20Test.html)).
- It lives in vendored or third-party paths the team does not own.
- It is currently flaky (see rule 5).

## Step 2 - Apply the class test

Step 1 proposes a class from a signal; this step confirms it with a
class-specific test before the gate runs. The confirmation methods are precise
and easy to get wrong:

- **`duplicate`** - compare a normalized `(describe-path, normalized-setup,
  normalized-assertion-arguments)` signature, not assertion text; keep the
  co-located copy, and check for a `fold` (Step 4) first.
- **`tautology`** - confirmed when the expected side of the assertion calls
  into a production import (recomputes the subject), not by the literal shape
  `expect(x).toBe(x)`; the default action is **rewrite**, not remove.
- **`trivial`** - no assertion, or a self-satisfying one; add the missing
  assertion if the smoke value matters, otherwise remove.
- **`dead-signal`** - requires the 90-day per-test history minimum plus a
  three-question reviewer checklist, reviewed one test at a time, never batched.
- **`orphan`** - confirm the imported module or symbol is genuinely gone, not
  moved or re-exported, then remove and name the missing module.

The full method per class - normalized signatures, detection heuristics, code
examples, the dead-signal thresholds and reviewer checklist, and the supporting
citations (Meszaros, Fowler, Zhang and Mesbah) - is in
[references/applying-the-removal-classes.md](references/applying-the-removal-classes.md).

## Step 3 - The delete gate: all four conditions must hold

Classification proposes. This gate disposes. For a removal to be eligible,
**every one** of these must hold. If any one fails, the verdict is `keep`.

1. **No caught regression in the window.** The test has never gone from pass
   to fail to pass-after-fix inside the signal window. That transition is the
   signature of a test catching a real regression, and one occurrence is
   enough to end the discussion.
2. **Redundant coverage, proven per test.** Every source path this test covers
   is also covered by at least one other test, confirmed against a per-test to
   source-file map, not a merged coverage report. The bidirectional mapping
   this requires is the same one test impact analysis builds: "one test (from
   many) exercises a subset of the production sources" and "one prod source is
   exercised by a subset of the tests"
   ([Hammant and Fowler, The Rise of Test Impact Analysis](https://martinfowler.com/articles/rise-test-impact-analysis.html)).
   No per-test map means condition 2 cannot be evaluated, which means no
   removal in that pass. Merged line coverage cannot answer "which other test
   covers this line".
3. **No do-not-delete label.** Not `@critical`, `@regression-guard`, or any
   team-configured equivalent.
4. **Not flagged for rewrite.** A test that a test-code quality review marked
   as obscure, weakly asserted, or badly structured is a fix, not a delete.

Two properties of this gate matter more than the conditions themselves:

- It is **conjunctive and unweighted**. Three strong conditions do not
  outvote one failing condition. Do not convert it into a score.
- **A missing input is a failed condition, not a skipped one.** No signal
  history means condition 1 fails. No per-test map means condition 2 fails.
  Silence never counts in favor of removal.

## Step 4 - Choose the action

Removal is one of four possible outcomes, and it is the last one to reach for.

| Outcome | When it applies |
|---------|-----------------|
| `keep` | The gate failed on any condition, or the class was dead-signal and the reviewer checklist said keep. Also the outcome for every test not classified at all. |
| `rewrite` | The test names a behavior worth asserting but asserts it badly: tautologies, missing assertions, obscure structure. |
| `fold` | Several tests in the same describe path share setup and differ only in input data. Combine into one parameterized table. Folding reduces test-code maintenance surface without reducing coverage, so it is not a removal and does not need the gate. Do not fold across describe paths, and do not fold a labeled-critical test together with an unlabeled one: the fold hides the label. |
| `remove` | The class test passed and all four gate conditions hold. |

A fold looks like this:

```typescript
// Before: 4 tests, 4 setup blocks.
test('addItem accepts 1',   () => { /* ... */ });
test('addItem accepts 5',   () => { /* ... */ });
test('addItem accepts 100', () => { /* ... */ });
test('addItem rejects 0',   () => { /* ... */ });

// After: 1 test, per-row failure messages preserved by the name template.
test.each([
  { qty: 1,   expected: 'accepted' },
  { qty: 5,   expected: 'accepted' },
  { qty: 100, expected: 'accepted' },
  { qty: 0,   expected: 'rejected' },
])('addItem qty=$qty is $expected', ({ qty, expected }) => { /* ... */ });
```

### Confidence to action

Confidence is a property of the *classification*, not a license to skip the
gate: every class still passes Step 3 before anything is removed, and classes
go in separate change sets so a mix of high- and low-confidence rows never
trains the reviewer to skim. The per-class confidence-to-action table - which
classes may be batched, which are reviewed one at a time - is in
[references/removal-ledger-and-report-format.md](references/removal-ledger-and-report-format.md).

## Step 5 - Record and report

A removal pass produces exactly three artifacts, in the change description,
before anyone approves:

1. **The removal ledger** - one row per proposed removal, each with a class, a
   reason, four gate results, and a named reviewer.
2. **The kept table** - every classified candidate the gate stopped, with the
   failing condition named. It is how a reviewer checks the gate was run rather
   than asserted, and the record that explains, a year later, why a quiet test
   was left alone.
3. **A separate rewrite and fold list** - not removals, and they do not ship in
   the same change set as deletions.

The row templates for the ledger and the kept table are in
[references/removal-ledger-and-report-format.md](references/removal-ledger-and-report-format.md).
If the pass produces test names with no gate columns and no reviewer column, it
is not a removal proposal - it is a list of suspicions, and nothing on it is
eligible to be deleted.

## Worked example

A suite of 1,283 tests, 41 candidates surfaced, 214 days of per-test history.

| # | Candidate | Class | Gate result | Outcome |
|---|-----------|-------|-------------|---------|
| 1 | `cart.spec.ts:34` duplicate of `:12` | duplicate | all four pass | remove |
| 2 | `add.spec.ts:5` `expect(add(2,3)).toBe(2+3)` | tautology | gate 4 fails: quality review flagged it | rewrite to `.toBe(5)` |
| 3 | `smoke.spec.ts:2` `expect(true).toBe(true)` | trivial | all four pass | remove |
| 4 | `report.spec.ts:8` imports deleted module | orphan | all four pass | remove |
| 5 | `pricing.spec.ts:44` 0 fails, covered files churned 22x | dead-signal | gate 2 fails: sole test covering the tax-rounding branch | keep |
| 6 | `auth.spec.ts:19` 0 fails, churn 14x | dead-signal | gate 3 fails: `@critical:auth-flow` | keep |
| 7 | `checkout.spec.ts:60` intermittent failures | none (flaky) | not a removal class | quarantine and diagnose |

Result: 3 removals across two change sets (one for `duplicate` plus `trivial`,
one for `orphan`), 1 rewrite, 3 tests kept with recorded reasons. Candidate 5
is the case the whole gate exists for: it looked like the strongest
dead-signal row in the batch until the per-test map showed it was the only
test on that branch.

## Anti-patterns

| Anti-pattern | Why it fails | Instead |
|--------------|--------------|---------|
| Treating a coverage report's "redundant" verdict as sufficient grounds | Coverage measures execution, not verification; high numbers are cheap to reach with weak tests ([Fowler, TestCoverage](https://martinfowler.com/bliki/TestCoverage.html)). | Coverage is gate condition 2 only, and only from a per-test map (Step 3). |
| Bulk-deleting dead-signal tests because none of them ever failed | The always-passing test may be the load-bearing one; the next regression ships silently. | Per-test reviewer checklist, never batched (Step 2). |
| Deleting because the test is old | Age is not signal. The five-year-old test caught last month's regression. | Classify by class plus signal, not by date (Step 1). |
| Deleting a flaky test to get the build green | Produces an intentional Lost Test ([Meszaros, Erratic Test](http://xunitpatterns.com/Erratic%20Test.html)). | Quarantine and diagnose; flakiness is not a removal class (rule 5). |
| Deleting an obscure or badly asserted test | The behavior it names is still worth asserting; test code is refactored like production code ([Meszaros, Obscure Test](http://xunitpatterns.com/Obscure%20Test.html)). | Rewrite (Step 4). |
| Converting the four conditions into a weighted score | Three passes plus one fail becomes "mostly safe", and the one that failed was the coverage check. | Conjunctive gate: any fail means keep (Step 3). |
| Running the gate with no signal history or no per-test map, then proceeding | A missing input silently reads as "no objection". | Missing input equals failed condition (Step 3). |
| Matching duplicates on assertion text | Cosmetic differences hide real duplicates; identical text across describe paths flags false ones. | Normalized three-part signature (Step 2). |
| Flagging tautologies by the literal shape `expect(x).toBe(x)` | Real tautologies spell the recomputation differently on each side. | Check whether the expected side calls into a production import (Step 2). |
| One giant quarterly change set | Reviewers rubber-stamp volume; the risky rows are invisible among the safe ones. | One change set per class, chunked by directory (Step 4). |
| Removing tests you can classify but do not own (vendored or third-party paths) | Proposes changes against code the team cannot maintain. | Never-remove list (Step 1). |

## Limitations

- **A removal decision cannot be fully automated.** Classification is
  mechanical; the dead-signal checklist and the reviewer sign-off are not.
  Every rule here assumes a person reads the ledger.
- **No semantic understanding of value.** A test that scores as low-signal on
  every mechanical input may carry architectural or regression-guard value
  that no heuristic sees. This is why gate condition 3 depends on labels, and
  why unlabeled load-bearing tests are the standing risk: the team has to
  label them for the gate to protect them.
- **Redundancy evidence is only as good as the per-test map.** Tests that
  exercise a function indirectly through an integration path may not appear
  in a per-test coverage map at all, which makes redundancy look higher than
  it is and over-flags the dead-signal class.
- **Short history means no dead-signal decisions.** Under the 90-day minimum,
  the signal-driven classes are unusable. Duplicate, trivial, and orphan still
  work, because their evidence is structural rather than historical.
- **Removing tests does not make a suite fast.** It reduces count and
  maintenance surface. Per-test speed and per-change run size are different
  problems with different tools.
