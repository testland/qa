---
name: test-design-scorecard
description: "Scores test files 1 to 5 on six design axes (AAA phase separation, single-responsibility, naming, fixture coupling, magic literals, setup time) using explicit per-level anchors that settle what separates a 2 from a 4, then turns the scores into growth-framed feedback and a per-author trend report. Owns the scoring and the write-up only: the conventions being scored live in a separate conventions catalog such as `test-code-conventions`, and block-or-approve gating belongs to an adversarial review. Use when a test diff needs a graded coaching read rather than a merge verdict: onboarding a new engineer, a team deliberately ramping up test discipline, or a quarterly per-author trend where the output is a conversation, not a gate."
---

# test-design-scorecard

## What this owns, and what it does not

This scorecard owns **the grading layer**: a 1 to 5 scale, the per-level
anchors on each axis, the arithmetic that turns per-axis scores into a file
score, and the feedback shape that makes a score actionable instead of
demoralising.

It deliberately does **not** own:

| Not owned | Where it lives |
|---|---|
| The conventions themselves (what AAA is, why one logical assertion, the naming patterns) | A separate conventions catalog, for example `test-code-conventions`. Reference the rule; do not restate it here. |
| The merge decision | An adversarial pass/fail review of the same conventions. That review answers "does this block?"; this scorecard answers "how is this trending?" |
| Assertion specificity, mocking technique, selector fragility | Reviews scoped to those concerns. They are excluded from the composite on purpose (see "Axes deliberately excluded"). |

Read the boundary this way: if two reviewers could disagree about **what the
rule is**, that belongs in the conventions catalog. If they agree on the rule
and disagree about **how well this file follows it**, that is what the anchors
below exist to settle.

The scorecard never emits a verdict. A file scoring 2.1 still ships. The score
is the input to a conversation and to next sprint's focus.

## The 1 to 5 scale is a practitioner convention

The five-point scale, the anchor wording, and the numeric thresholds in the
setup-time axis are **conventions fixed by this scorecard so that scores are
comparable across files, reviewers, and sprints**. They are not drawn from any
standard, and no standards body defines a "3 out of 5" test. What *is* sourced
is the underlying design guidance each anchor encodes, cited inline per axis.

| Score | Meaning |
|---|---|
| 5 | The design intent is obvious to a reader who has never seen the file. |
| 4 | Intent is clear; one stylistic step short of exemplary. |
| 3 | A reader recovers the intent by reading the body carefully. |
| 2 | The reader has to reconstruct intent from evidence outside the test. |
| 1 | Intent is not recoverable from the test at all. |

Score whole numbers per axis. Only the composite carries a decimal.

## Axis 1 - AAA phase separation

Grounded in the Four-Phase Test: "Clearly identifying the four phases makes
the intent of the test much easier to see"
([Four-Phase Test](http://xunitpatterns.com/Four%20Phase%20Test.html)). The
three-phase naming comes from Bill Wake: "Arrange: Set up the object to be
tested. Act: Act on the object (through some mutator). Assert: Make claims
about the object"
([Arrange-Act-Assert](https://xp123.com/3a-arrange-act-assert/)).

| Score | Anchor |
|---|---|
| 5 | Phases visually separated (blank line or `// Arrange` style comment) and exactly one Act. |
| 4 | Exactly one Act, phases separable at a glance, no explicit markers. |
| 3 | One Act, but arrange lines appear after it; the reader reorders mentally. |
| 2 | Two or more Acts with verification between them. |
| 1 | No phase boundary at all: a script of interleaved actions and checks. |

**Settling 2 vs 4: count the Acts.** One Act the reader can point to is a floor
of 4 regardless of comment style. More than one Act is a ceiling of 2, because
per the same source it "will be self-evident if we have multiple exercise SUT
phases separated by result verification phases"
([Four-Phase Test](http://xunitpatterns.com/Four%20Phase%20Test.html)), and
that is the split-into-two-tests signal, not a formatting nit.

## Axis 2 - Single-responsibility

Grounded in the Eager Test cause of Assertion Roulette: "verifying many test
conditions in a single Test Method", whose tell is that the author "wants to
modify the Test Automation Framework to keep going after an assertion has
failed so that the rest of the assertions can be executed"
([Assertion Roulette](http://xunitpatterns.com/Assertion%20Roulette.html)).

| Score | Anchor |
|---|---|
| 5 | One logical assertion target; every assertion verifies one observable property. |
| 4 | Two assertion targets that are facets of the same outcome. |
| 3 | Two unrelated targets in one test. |
| 2 | Three or more unrelated targets, or a name containing "and". |
| 1 | The test walks a workflow, verifying each stage as it goes. |

**Settling 2 vs 4: ask whether a failure on the first assertion hides a
distinct defect.** If the later assertions could have caught a different bug,
they are separate conditions and the score is capped at 2. If they all fall
over together, they are one condition. Bill Wake is explicit that multiple
assertions are fine when they "explore a different 'dimension' of the object"
([Arrange-Act-Assert](https://xp123.com/3a-arrange-act-assert/)), which is
exactly the 4 anchor. Do not penalise three `expect` calls that describe one
outcome.

## Axis 3 - Naming

Grounded in Roy Osherove's three-part pattern
`[UnitOfWork_StateUnderTest_ExpectedBehavior]` and his argument that when a
test fails "the only thing left to save us then is the name of the test"
([Naming standards for unit
tests](https://osherove.com/blog/2005/4/3/naming-standards-for-unit-tests.html)).

| Score | Anchor |
|---|---|
| 5 | All three elements present: subject, scenario, expected outcome. |
| 4 | Two of three, with the third supplied by the enclosing block. |
| 3 | Subject plus a vague verb: "works", "handles errors". |
| 2 | Subject only, disambiguated by a number: `addItem 1`, `addItem 2`. |
| 1 | No subject: `it('works')`, `test('test 1')`. |

**Settling 2 vs 4: hide the body and read the name alone.** If you can state
the input condition and the expected outcome, it is a 4 or 5. If you can name
only the method under test, it is a 2. Count the enclosing `describe` chain as
part of the name; a nested structure that reads as a sentence top to bottom
scores the same as the flat three-part form.

**Consistency cap:** a suite mixing the flat pattern and the nested pattern
caps at 3 on this axis even when individual names are excellent. Score the
suite once for consistency, then the files individually.

## Axis 4 - Fixture coupling

Grounded in the Shared Fixture trade-off: its "biggest issue" is that it "can
lead to 'collisions' between tests possibly resulting in Erratic Tests since
tests may depend on the outcomes of other tests", and it "will often result in
a Obscure Test because the fixture is not constructed inside the test"
([Shared Fixture](http://xunitpatterns.com/Shared%20Fixture.html)).

| Score | Anchor |
|---|---|
| 5 | Fixture built inline in the test; everything the reader needs is in view. |
| 4 | Block-scoped or file-level setup, rebuilt fresh per test, shared by tests that genuinely vary one scenario. |
| 3 | Cross-file factory or builder producing fresh instances per call. |
| 2 | One fixture instance reused across tests in the file, and tests mutate it. |
| 1 | A cross-file global fixture object imported by unrelated suites. |

**Settling 2 vs 4: distinguish sharing the shape from sharing the instance.**
A factory that hands every test its own object shares a shape and stays at 3
or above. A fixture whose state survives from one test into the next shares an
instance and caps at 2, because that is the collision path above. The test
being short is not evidence of good coupling; brevity bought by an off-screen
fixture is the Obscure Test the same source describes.

## Axis 5 - Magic literals

Grounded in the Hard-Coded Test Data cause of Obscure Test: literals "are
hard-coded in the Test Method obscuring cause-effect relationships between
inputs and expected outputs", so the reader finds "it hard to determine how
various hard-coded (i.e. literal) values in the test are related to each other"
([Obscure Test](http://xunitpatterns.com/Obscure%20Test.html)).

| Score | Anchor |
|---|---|
| 5 | Every literal in the cause-effect chain is named, and the expected value is derived from the named inputs. |
| 4 | Inputs named; expected value a literal that is self-evidently their outcome. |
| 3 | Literals unnamed but obviously related (quantity `1` to count `1`). |
| 2 | Unrelated literals whose relationship the reader must infer, for example an expected total of `43.21`. |
| 1 | The same literals copy-pasted across tests, so one product change means hunting every file. |

**Settling 2 vs 4: cover the call to the system under test and try to derive
the expected value from the inputs still visible.** If you can, it is a 4. If
you have to run the code or open the production source to see where the number
came from, it is a 2.

**Do not over-apply.** Naming a `1` as `const QTY = 1` in a test whose whole
point is that one item makes a count of one adds ceremony, not clarity. A
score of 3 here is a legitimate resting place, not a defect to be fixed.

## Axis 6 - Setup time

This axis requires **measurement, not estimation**. Instrument setup and
teardown to log start and end time per test, then sort by duration: "The tests
with the longest execution times are the ones where it will be most worthwhile
focusing our efforts"
([Slow Tests](http://xunitpatterns.com/Slow%20Tests.html)). Score from that
list. If no timings exist, mark the axis `n/a` rather than guessing.

| Score | Anchor (thresholds are this scorecard's convention, not a standard) |
|---|---|
| 5 | Under 100 ms; setup is in-memory. |
| 4 | Under 1 s; no external process started. |
| 3 | 1 to 5 s, touching a real dependency, amortised across a suite. |
| 2 | Over 5 s per test. |
| 1 | Over 5 s and already mitigated by a shared mutable fixture. |

The 1 anchor is deliberately below the 2: reaching for a shared fixture to fix
slowness trades one problem for a worse one, since "a common reaction to Slow
Tests is to immediately go for a Shared Fixture but this almost always results
in other problems including Erratic Tests"; the recommended move is to replace
the slow component with a fake, and a fake database "can make the tests run on
average fifty times faster"
([Slow Tests](http://xunitpatterns.com/Slow%20Tests.html)).

**Settling 2 vs 4: find out what the time is spent on.** Under 1 s with no
process outside the test runner is a 4. Any per-test database write, container
start, or cache warm puts the ceiling at 3, and past 5 s at 2, because per the
same source database-backed setup runs roughly fifty times slower than the
in-memory equivalent.

## Axes deliberately excluded

Assertion specificity, mocking technique, and end-to-end selector quality are
**not scored**. Each needs a different kind of read (what the assertion would
still pass for, what the double couples to, what the locator breaks on) and
each is better served by a focused review than by a number. Mention them in the
prose if they stand out, but keep them out of the composite so the composite
stays comparable across sprints.

## Computing the file score

1. Score each applicable axis as a whole number.
2. Drop axes marked `n/a`. Do not score them 5, and do not score them 3.
3. Average the remaining axes unweighted. Round to one decimal.
4. Record the divisor next to the score, for example `3.8 / 5 (5 axes)`.

Unweighted averaging is a choice: it keeps the arithmetic auditable by the
person being coached. Weighting invites arguing about the weights instead of
about the tests.

## Feedback rules

The score is the smaller half of the output. These rules are what keep it a
coaching artefact:

1. **Strengths first, always at least one**, with line references so it reads
   as observation rather than politeness.
2. **Cap growth items at two per file.** A long list produces no change.
3. **Every growth item names the current score, the target, and one concrete
   edit.** "Naming is a 3" is a grade. "Naming is 3 of 5; adding the scenario
   makes it 5, like `addItem_validQty_incrementsCount`" is coaching.
4. **Markers: a check mark for strengths, a seedling for growth.** Never a
   cross or a warning triangle: those are gate vocabulary and reframe the whole
   document as a rejection.
5. **Banned words:** violation, fails, wrong, must. Use consider, next time,
   to reach 5.
6. **Score the file, never the person.** No inter-author comparison anywhere in
   the output, including the trend report.
7. **One growth focus per sprint**, chosen by the author, not assigned.

## Worked example: per-test feedback

```markdown
### `cart.spec.ts > addItem increments count` - 4.2 / 5 (5 axes)

**Strengths:**
- ✅ AAA phase separation (5/5): arrange lines 12-14, act line 16, assert 18-20.
- ✅ Single-responsibility (5/5): one observable target, `cart.itemCount`.
- ✅ Fixture coupling (5/5): built inline, nothing imported from elsewhere.

**Growth opportunities:**
- 🌱 Naming (3/5): "addItem increments count" gives the subject and the
  outcome. Adding the scenario reaches 5:
  `addItem_validQty_incrementsCount`.
- 🌱 Magic literals (3/5): the quantity `1` and expected count `1` are
  clearly related, so this is a fine resting place. Worth naming only once
  the arithmetic stops being obvious, for example a taxed total.

**Next sprint goal:** try the three-part naming pattern on every new test in
the cart suite, then reread the suite as a group and see whether it scans.
```

## Worked example: per-PR summary

```markdown
## Test design scorecard - PR #1234

**Files scored:** 3
**Average:** 3.8 / 5
**Trend:** up from 3.5 across the previous 3 PRs.

| File | Score | Standout | Top growth axis |
|---|---:|---|---|
| `cart.spec.ts` | 4.2 | Phase separation, single-responsibility | Naming |
| `checkout.spec.ts` | 3.5 | Inline fixtures | Magic literals |
| `payment.spec.ts` | 3.7 | Setup under 1 s | Single-responsibility (3 targets in one test) |

### Pick one focus for this sprint

1. **Naming:** add the scenario element to every new test name.
2. **Single-responsibility:** split tests with 3 or more assertion targets.
3. **Magic literals:** name the values that recur across files.

One focus beats three. Pick the one you would enjoy doing.

### This is not a gate

This PR ships on its own merits. The growth items are for the next one.
```

## Worked example: per-author trend

```markdown
## Test design trend - Q2

| Period | Avg score | PRs scored | Axes |
|---|---:|---:|---:|
| 2026-W18 | 3.5 | 4 | 5 |
| 2026-W19 | 3.7 | 3 | 5 |
| 2026-W20 | 3.8 | 5 | 6 |
| 2026-W21 | 3.9 | 4 | 6 |

**Direction:** up, roughly +0.1 per sprint.
**Most improved:** AAA phase separation, 3.0 to 4.5.
**Unchanged:** setup time, unscored in W18-W19 (no timings captured).
```

Two reporting conventions keep the trend honest, both chosen here rather than
sourced: report no trend on fewer than **3 scored PRs** in a period, and treat
a period-over-period delta under **0.3** as noise rather than movement, given
the reliability limit below. Always print the axis count per period: a
composite over 5 axes and one over 6 are not the same number.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Using the score as a merge gate | Authors optimise the number instead of the tests, and the honest signal disappears within two sprints. | Keep gating in a pass/fail review; publish this score after the merge decision, never as part of it. |
| Ranking engineers by score | Turns a coaching tool into a leaderboard and suppresses the candour it depends on. | Per-author trend only, visible to that author. |
| Emitting eight growth items per file | Decision fatigue; nothing changes. | Two per file, one focus per sprint. |
| Scoring setup time by eye | The axis is the only one with a numeric threshold, so guessing corrupts the composite. | Measure and sort by duration, or mark the axis `n/a`. |
| Silently changing the axis set between periods | The trend line compares different quantities. | Print the axis count with every composite. |
| Dropping the strengths section when scores are low | The author reads only deficits and disengages, which is the one failure mode this format exists to prevent. | Every file has at least one strength; find it. |
| Restating the conventions inside the feedback | Duplicates the rule book and lets the two drift apart. | Cite the rule by name and spend the words on the specific edit. |

## Limitations

- **Inter-rater reliability is the real weakness.** Two competent reviewers
  scoring the same file will often differ by a point on the judgement-heavy
  axes (naming, single-responsibility, fixture coupling). The anchors and the
  2-vs-4 tiebreakers narrow the spread; they do not close it. Treat a
  one-point difference between reviewers as inside the noise floor, and keep
  the same scorer across a trend line wherever possible.
- **Not a performance-management instrument.** These numbers do not belong in
  a performance review, a promotion packet, or a team dashboard that compares
  people. The scorecard measures how legible a test file is to a reader, which
  is a property of the file, of the codebase's age, and of how much of it the
  author inherited.
- **A well-formed test can still be the wrong test.** Every axis scores
  structure. None of them checks that the assertion verifies behaviour anyone
  cares about, so a 5.0 file can test nothing of value.
- **Context is invisible.** A shared fixture may be a deliberate, documented
  trade-off for a suite that would otherwise take an hour. Score what you see,
  then ask before writing the growth item.
- **Trends need consistent adoption.** Scored sporadically, the line tracks
  which PRs happened to get reviewed, not how anyone's testing changed.
