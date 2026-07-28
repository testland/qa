---
name: test-effort-estimation
description: "Turns a list of testable areas plus a change-shape distribution into a PERT three-point test effort estimate, reporting every row as a range around the expected value rather than a single number, requiring a named assumptions ledger across six mandatory categories, and recommending a per-layer ownership split across developer, automation, and exploratory roles. Owns the hours and the ownership recommendation only: it consumes a change-shape distribution rather than producing one, and it does not choose which tests to run or how deep coverage should go. Use when an epic or release has been broken into testable areas and someone is about to commit test capacity for a sprint."
---

# test-effort-estimation

## Overview

A test effort estimate is a probability distribution over hours. Reporting it as
one number destroys the only information that makes it useful: how wide the
distribution is, and what has to stay true for it to hold.

This skill produces three things per epic:

1. A per-area, per-layer effort range computed with the PERT three-point method.
2. A ledger of named assumptions the ranges depend on.
3. A recommended split of which role owns which layer of the work.

## Differentiation axis

This skill owns **hours and ownership**. It does not own the taxonomy of change
shapes, the path and content signals used to detect them, or the relative
per-layer cost model. Those belong to `code-change-shape-classifier`, and this
skill **consumes** its output: a distribution over `pure-logic`,
`service-layer`, `ui-heavy`, and `data-heavy`, each already mapped to the test
layer where its verification lands. Do not re-derive that mapping here. If the
shape definitions get copied into the estimator, the two answers drift and stop
agreeing.

It also stops short of two downstream decisions. It does not select which
existing tests to run for a given change, and it does not set coverage depth
(how many tests of what type, with what entry and exit criteria). Both consume
this estimate; neither is produced by it.

Read the boundary as: shape in, hours and owners out.

## When to use

- An epic is broken into stories and someone is about to promise a sprint's
  worth of test capacity.
- A release plan needs a defensible number rather than a gut feel, and the
  number will be challenged.
- Two people disagree about how long a test area will take and a structured
  three-point round would settle it.
- A previous estimate was blown and the team wants to know which assumption
  failed, which is only answerable if a ledger existed.

## Step 1 - Decompose into testable areas and weight them for risk

Split the epic into discrete testable areas. Each area maps to one or more
acceptance criteria and to a coherent chunk of behaviour a person can be
assigned and tracked against. Record for each:

- **Area name**: a short label such as "checkout flow", "discount-code API".
- **Story IDs**: which stories contribute to it.
- **Change shape and layer**: taken from the change-shape distribution, not
  re-derived. Each shape already carries the layer where most of its
  failure-detection value sits.

Then assign a **risk weight** on a coarse 1 to 3 scale:

| Weight | Meaning |
|---|---|
| 1 | Internal only, easily rolled back, small blast radius |
| 2 | Customer facing, recoverable if broken |
| 3 | Payment, authentication, data integrity, or compliance |

Risk weight shifts effort upward: a risk-3 service area gets more test work than
a risk-1 service area of the same size. The 1 to 3 scale is a **practitioner
convention used here as an effort modifier, not a standard risk-scoring method**.
It is deliberately too coarse to serve as a formal risk assessment. If the
programme needs one, run a structured risk-scoring method separately and feed
its output in as the weight.

An area with no risk weight is not estimable. Force at least one risk-1 and one
risk-3 assignment per epic, or the scale collapses to "medium for everything"
and stops carrying signal.

## Step 2 - Elicit three points per area and layer

For each (area, layer) pair, produce three values in hours:

| Symbol | Meaning |
|---|---|
| `a` | Optimistic: everything goes smoothly, no environment or data problems |
| `m` | Most likely |
| `b` | Pessimistic: blockers, missing test data, flaky infrastructure |

These are the standard three-point inputs: `a` is "the best-case estimate", `m`
is "the most likely estimate", `b` is "the worst-case estimate"
([Wikipedia, Three-point estimation](https://en.wikipedia.org/wiki/Three-point_estimation)).

### Gathering the three points with more than one estimator

When several people could estimate the area, run a **Wideband Delphi** round
rather than averaging opinions in a meeting ([Wikipedia, Wideband delphi](https://en.wikipedia.org/wiki/Wideband_delphi)). Boehm's sequence, adapted to test effort:

1. The coordinator gives each estimator the area description and a blank form.
2. The group meets and discusses estimation issues, including what is in scope.
3. Estimators fill out `a`, `m`, `b` **anonymously**.
4. The coordinator summarizes and distributes the spread.
5. The group meets again, focusing only on the widely varying rows.
6. Estimators fill out the forms anonymously again. Repeat steps 4 to 6 as
   needed.

The anonymity in steps 3 and 6 is the mechanism, not a formality: it stops the
loudest or most senior estimate from anchoring the rest. Every disagreement that
surfaces in step 5 is a candidate assumption for Step 4's ledger, because two
people estimating the same area differently are usually assuming different things
about scope, environment, or data.

## Step 3 - Compute the expected value and the spread

Combine the three points with the PERT formulas:

```
E  = (a + 4m + b) / 6
SD = (b - a) / 6
```

These are the classical PERT definitions, valid on the assumption that a PERT
distribution governs the data ([Wikipedia, Three-point estimation](https://en.wikipedia.org/wiki/Three-point_estimation); [Brunel University](https://people.brunel.ac.uk/~mastjjb/jeb/or/netpert.html)). The 1/6:4/6:1/6 weighting "is essentially
fixed and cannot be altered" (Brunel); to weight the pessimistic case more
heavily, raise `b`, do not rewrite the formula.

**Report every row as a range, `E - SD` to `E + SD`. Never collapse a row to a
point.** The three estimates define a distribution in which "all times are
possible (with an associated probability)" (Brunel); a single number discards that.

### Aggregating rows to an epic total

Expected values add directly: the epic total `E` is the sum of the row `E`
values.

Spreads do not. Sum the **variances** (`SD` squared) and take the square root of
the total, which is how PERT combines activity spreads along a path
([Brunel University, Network analysis: uncertain completion times](https://people.brunel.ac.uk/~mastjjb/jeb/or/netpert.html)):

```
E_total  = sum(E_i)
SD_total = sqrt( sum(SD_i^2) )
```

That aggregation assumes the rows are independent. The cited PERT treatment
makes the same independence assumption explicitly and warns that when it does
not hold "the probability figures calculated may be inaccurate"
([Brunel University, Network analysis: uncertain completion times](https://people.brunel.ac.uk/~mastjjb/jeb/or/netpert.html)).
Test rows are frequently *not* independent: one missing staging environment
blows out every row at once. When rows share a dependency, also report the
fully-correlated bound, `sum(SD_i)`, as a worst case, and name the shared
dependency in the ledger.

## Step 4 - The assumptions ledger (mandatory)

**An estimate without a ledger is not an estimate. It is a guess with a decimal
point.** The ledger is what makes the number auditable: it is the only artifact
that lets someone later ask "which assumption failed?" instead of "who was
wrong?".

This is not a local house rule. Federal cost-estimating guidance makes
documentation one of the four pillars of a reliable estimate: a well-documented
estimate identifies "rationales, assumptions, original source data, and
methodologies used for calculations" ([IRS IRM 1.33.9.3](https://www.irs.gov/irm/part1/irm_01-033-009)).

Every row in the effort table cites at least one assumption ID. Six categories
are mandatory: an epic-level ledger that is missing any of them is incomplete,
and the missing category is usually where the estimate later breaks.

| # | Category | What it pins down | Example entry |
|---|---|---|---|
| 1 | Scope boundary | What is explicitly excluded | "Stories 12 to 15 only. Story 16 (dark mode) is excluded." |
| 2 | Environment | What must exist, and when | "Staging environment available from sprint day 2." |
| 3 | Test data | What data exists and who produces it | "Fixture generator covers all discount-code scenarios." |
| 4 | Dependency | Interfaces and teams outside the estimate | "Auth service API is stable; no interface churn expected." |
| 5 | Skill | Who is available and what they can already do | "One automation engineer with browser-automation experience on the team." |
| 6 | Risk rating | Why each risk weight was assigned | "Checkout rated risk-3 because it processes real payments." |

Two rules make the ledger load-bearing:

- **An estimate is a distribution, not a commitment.** State plainly, in the
  output, that the range describes uncertainty and is not a delivery promise.
  When someone converts `E` into a date, they have made a commitment the
  estimate does not support.
- **A violated assumption invalidates the estimate. It does not get padded.**
  If assumption 2 fails because staging slips to day 6, do not add hours. Change
  the input and recompute the affected rows. Padding hides which assumption
  broke and destroys the audit trail that the ledger existed to provide.

## Step 5 - Recommend the per-layer ownership split

Each (area, layer) row gets an owner. The default split below is a
**practitioner convention for a conventional team structure, not a standard**;
it is grounded in where the work naturally sits, not in a cited allocation rule.

| Layer | Default owner | Why |
|---|---|---|
| Unit | The developer writing the production code | Tests land in the same PR as the code; unit tests run fast, keeping the loop inside the edit cycle |
| Service | Automation engineer | API and integration tests need harness and environment work and run slower than stubbed unit tests |
| UI / E2E | Automation engineer, or a manual tester for the long tail | Automate happy paths only; end-to-end UI tests are brittle, expensive to write, and slow to run |
| Exploratory | Manual tester | A manual approach for the tester's freedom to spot issues a scripted row cannot cover |

Layer characteristics per [Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) and [Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html).

Three allocation rules:

1. **Every risk-2 and risk-3 area gets an exploratory row**, with its own three
   points, owned by a manual tester. Exploratory time that is not estimated does
   not happen.
2. **`data-heavy` areas get a dedicated data-checking row** in addition to their
   service row: schema and contract changes fail in ways a request-level test
   does not see.
3. **Risk-3 areas touching authentication, access control, or payment get a
   separate security-review row.** Do not fold that time into the service row,
   because it is usually done by a different person on a different schedule.

Ownership is a recommendation. If capacity figures were supplied, compare each
role's summed `E` against its available sprint hours and flag every role whose
estimate exceeds capacity, with a suggested redistribution. If the split implies
a large shift in the balance between layers (for example, an epic that adds 40
percent more UI-layer test work), say so explicitly so someone can review the
overall test mix before the work starts.

## Worked example

The full row-by-row PERT arithmetic for the "Promo codes at checkout" epic - six
(area, layer) rows, the variance-sum aggregation, and the independent vs
fully-correlated ranges - is in [references/worked-example.md](references/worked-example.md).

## Output format

Emit one Markdown document with these sections, in order:

1. **Header** - epic name and date, total expected effort, the independent-rows range, and the shared-dependency worst-case range.
2. **"Distribution, not a commitment" line** - state that the range is invalidated, not padded, if any assumption changes.
3. **Effort by area and layer** - per-row table: area, layer, risk, `a`/`m`/`b`, `E`, range, owner, assumption IDs.
4. **Assumptions ledger** - one row per assumption (ID, category, statement, rows affected), with all six mandatory categories present.
5. **Ownership summary** - per role: rows, summed expected hours, capacity, over/under flag.
6. **Capacity flags** - each over-allocated role with a suggested redistribution.
7. **Method** - the PERT formulas, the variance-sum aggregation, and the note that change shape was consumed, not derived.

Keep the "distribution, not a commitment" line and the Method section even when
they feel redundant; they are what stop a reader from turning `E` into a date.
The full filled template is in
[references/effort-estimate-output-template.md](references/effort-estimate-output-template.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Reporting a single number ("this will take 8 hours") | Hides uncertainty and anchors the team to false precision | Report `E - SD` to `E + SD` for every row ([Wikipedia, Three-point estimation](https://en.wikipedia.org/wiki/Three-point_estimation)) |
| Emitting the table with no assumptions ledger | The range means nothing without knowing what it assumes; nobody can later tell which assumption failed | Require at least one assumption ID per row and all six categories per epic ([IRS IRM 1.33.9.3](https://www.irs.gov/irm/part1/irm_01-033-009)) |
| Padding hours when an assumption breaks | Destroys the audit trail and makes the next estimate worse | Change the input and recompute the affected rows |
| Treating `E` as a delivery date | Converts a probability distribution into a promise the estimate does not support | State the invalidating assumptions explicitly next to the total |
| Adding row standard deviations to get the epic spread | Overstates the spread for independent rows | Sum variances and take the square root; report the summed-SD figure separately as the correlated worst case ([Brunel University](https://people.brunel.ac.uk/~mastjjb/jeb/or/netpert.html)) |
| Reweighting the PERT formula to "be more pessimistic" | The 1/6:4/6:1/6 weighting "is essentially fixed and cannot be altered" ([Brunel University](https://people.brunel.ac.uk/~mastjjb/jeb/or/netpert.html)) | Raise `b` instead |
| Rating every area risk-2 | Erases the signal that drives effort allocation and the exploratory rows | Force at least one risk-1 and one risk-3 per epic |
| Estimating without a layer for each row | Hours cannot be mapped to an owner, so the ownership split is unassignable | Attach a layer to every row before computing anything |
| Re-deriving change shapes inside the estimate | Two components then own the same taxonomy and drift apart | Consume the distribution from `code-change-shape-classifier` unchanged |
| Leaving exploratory work unestimated | Unestimated work is unbudgeted work and does not happen | Give every risk-2 and risk-3 area its own exploratory row with three points |
| Collecting three points in an open group meeting | The loudest or most senior estimate anchors everyone else | Use anonymous rounds ([Wikipedia, Wideband delphi](https://en.wikipedia.org/wiki/Wideband_delphi)) |

## Limitations

- **Three-point inputs are only as good as the estimator's domain knowledge.**
  When nobody has built the area before, even `b` is usually too low. Record
  "first-time implementation" as a skill-category assumption and widen `b`
  deliberately.
- **No historical velocity is used.** The estimate derives from area structure,
  risk weight, and change shape, not from past sprint actuals. A team with a
  points-to-hours baseline should apply that conversion after Step 3 and record
  the conversion factor in the ledger.
- **The PERT distribution assumption may not fit.** The formulas rest on the
  assumption "that a PERT distribution governs the data"
  ([Wikipedia, Three-point estimation](https://en.wikipedia.org/wiki/Three-point_estimation)),
  and a triangular distribution is a documented alternative for some
  applications (same source). Test work with a long tail of rare blockers is
  poorly described by any of them.
- **Row independence rarely holds exactly**, which is why the correlated bound
  is reported alongside. When one environment or one person gates most rows, the
  correlated bound is the honest number.
- **The 1 to 3 risk weight is a coarse effort modifier**, not a risk assessment.
  It cannot substitute for a structured risk-scoring method.
- **The ownership split assumes a conventional structure** with developers,
  automation engineers, and manual testers as distinct roles. A solo tester or a
  fully automated team collapses all rows onto fewer owners, which changes the
  capacity flags but not the hours.
- **Non-functional test effort is out of scope.** Load, security, and
  accessibility test work is scoped by their own methods; only the security
  review row above is reserved, and it is reserved rather than estimated.
- **Predicted change shapes are weaker than measured ones.** For an epic with no
  code yet, the distribution comes from story text. Record that in the ledger and
  recompute once code exists.

## References

- [Wikipedia, Three-point estimation](https://en.wikipedia.org/wiki/Three-point_estimation):
  definitions of `a`, `m`, `b`; `E = (a + 4m + b) / 6`; `SD = (b - a) / 6`; the
  PERT distribution assumption and the triangular-distribution alternative.
- [Brunel University, Network analysis: uncertain completion times](https://people.brunel.ac.uk/~mastjjb/jeb/or/netpert.html):
  the classical PERT expected time `(t1 + 4t2 + t3)/6` and standard deviation
  `(t3 - t1)/6`; use of the beta and normal distributions; the fixed
  1/6:4/6:1/6 weighting; all times possible with an associated probability;
  variances summed and square-rooted; the independence assumption and its
  inaccuracy warning.
- [Wikipedia, Wideband delphi](https://en.wikipedia.org/wiki/Wideband_delphi):
  Barry Boehm and John A. Farquhar originated the wideband variant in the 1970s;
  named for "greater interaction and more communication among those
  participating"; popularized through *Software Engineering Economics* (1981);
  the six-step anonymous-round sequence.
- [IRS Internal Revenue Manual 1.33.9, Cost Estimating Guidelines](https://www.irs.gov/irm/part1/irm_01-033-009):
  the four pillars of a reliable estimate; the well-documented pillar requiring
  rationales, assumptions, source data, and methodologies; documenting the
  rationale behind ground rules and assumptions; the credible pillar requiring
  documented limitations, risks, and uncertainty.
- [Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html): tests
  running end-to-end through the UI are "brittle, expensive to write, and time
  consuming to run".
- [Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html):
  unit tests "run very fast"; integration with filesystems and databases is
  "much slower"; end-to-end tests "require a lot of maintenance and run pretty
  slowly"; exploratory testing is "a manual testing approach that emphasises the
  tester's freedom and creativity to spot quality issues in a running system".
