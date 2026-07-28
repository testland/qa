---
name: risk-matrix-calibration
description: "Checks an already-written risk matrix against what actually happened. Maps each row's likelihood rating to observed defect density, test failure rate and code churn, maps its impact rating to the severity mix and escape rate, then classifies each row as over-stated, under-stated, in-agreement, or not calibrated, using stated reporting thresholds so small differences are not treated as findings. Every proposed rating change carries the observation that produced it, and every proposal is handed to the matrix owner rather than applied. Also emits candidate new entries for areas that show up in defect data but have no row. Owns calibration only: choosing a scoring methodology, designing the matrix structure, picking risk categories, mapping risks to test types, FMEA scoring, review cadence and file storage are all out of scope. Use when a matrix has been driving test decisions for at least three releases and nobody has yet checked whether its ratings match the defects, escapes and incidents that followed."
---

# risk-matrix-calibration

## What calibration answers

A risk matrix records what a team believed, at authoring time, about how
likely each area is to fail and how bad that failure would be. Risk-based
testing is defined by ISTQB as "a test approach in which the management,
selection, prioritization, and use of test activities and resources are based
on corresponding risk types and risk levels"
(https://glossary.istqb.org/en_US/term/risk-based-testing), so those ratings
directly control where test effort goes. Lightweight risk assessment scores a
row on two factors, likelihood and impact
(https://en.wikipedia.org/wiki/Risk-based_testing).

Calibration asks one question: **over the window that has since elapsed, did
the things the matrix said were likely and severe actually turn out to be
likely and severe?** The output is a set of proposed rating changes, each
attached to the observation that produced it, for the matrix owner to accept
or reject.

## Scope boundary

This is the after-the-fact check, not the authoring pass. The axis is
**already-written ratings versus observed outcomes**.

| In scope here | Out of scope here |
|---|---|
| Choosing which observed signal corresponds to each matrix dimension | Choosing lightweight versus heavyweight methodology |
| Turning observations into a comparable rating on the matrix's own scale | Designing the matrix columns, heatmap or banding |
| Deciding whether a difference is large enough to report | Picking the risk category taxonomy |
| Wording a proposed change so the owner can audit it | Deciding which test types a risk maps to |
| Surfacing areas absent from the matrix that the defect data insists on | FMEA severity / occurrence / detectability scoring |
| Naming the evidence gaps that leave a row uncalibratable | Review cadence, file layout, version control |

If the matrix does not yet exist, or its rows have no consistent feature
column and no consistent score format, there is nothing here to calibrate
against. Author or restructure it first. A skill named `risk-matrix` covers
that authoring work.

Calibration is also not prediction. It reports what was observed in a closed
historical window. It does not forecast next quarter's defects, and it does
not fit a model. That restraint is deliberate: only 19.9% of teams surveyed in
the PractiTest State of Testing 2026 report use AI for risk identification,
against 70% for test case creation
(https://www.practitest.com/state-of-testing/), and unsourced predictive
scoring at the decision layer is exactly what that gap is made of.

## Before anything else: what defect data can and cannot tell you

**Observed defect data is a lagging and biased signal, and calibration is
only as good as that signal.** Read this section before running any of the
steps below, because it changes what the numbers are allowed to conclude.

You only see defects in code that was **tested** and **used**. A row with zero
defects in the window has at least three possible explanations:

1. The area is genuinely sound.
2. The area has no meaningful test coverage, so nothing was found.
3. The area is barely exercised in production, so nothing was reported.

**No amount of defect data distinguishes these three.** Absence of evidence in
a defect tracker is not evidence of low likelihood. The practical rule that
follows is in Step 3: a zero-defect row is never grounds for lowering a
likelihood rating on its own. It is grounds for asking which of the three
explanations applies, and reporting the answer.

Two further biases are worth naming explicitly:

- **The tracker under-counts by construction.** Escape rate is measured
  against defects you eventually found. ISTQB defines defect detection
  percentage as "the number of defects found by a test level, divided by the
  number found by that test level and any other means afterwards"
  (https://glossary.istqb.org/en_US/term/defect-detection-percentage). Defects
  never found by any means appear in neither the numerator nor the
  denominator, so a flattering escape rate can mean good testing or can mean a
  blind spot nobody has walked into yet.
- **Labelled bug-fix data is systematically skewed.** Only a fraction of bug
  fixes are labelled in version histories, and the resulting datasets carry
  "strong evidence of systematic bias" (Bird et al., ESEC/FSE 2009; full
  citation in [references/empirical-basis.md](references/empirical-basis.md)).
  If your team labels defects by component inconsistently, the calibration
  inherits that inconsistency.

State these limits in the report itself, not only here. A reader who does not
know the data is biased will read a proposed downgrade as a fact.

## Step 1 - Map each matrix dimension to observed signals

Each of the two rating dimensions gets its own set of observed signals. Use
more than one signal per dimension so that a single weak measurement cannot
move a rating on its own.

| Matrix dimension | Primary observed signal | Corroborating signals |
|---|---|---|
| **Likelihood** | Defect density for the row's source paths, meaning "the number of defects per unit size of a work product" (https://glossary.istqb.org/en_US/term/defect-density) | Failure rate of the tests that cover the row over the window; code churn for the same paths |
| **Impact** | Severity mix of the row's defects, typically the share at the team's top two severity levels | Escape rate, meaning the share of the row's defects that were "not detected by a test activity that is supposed to find it" (https://glossary.istqb.org/en_US/term/escaped-defect); incident or SLO-breach correlation where the team records it |

### Two rules on density and churn

- **Density, not raw count.** A raw count conflates "small busy area" with
  "large stable area". Normalise by size per the ISTQB definition above; where
  LOC is a poor proxy, normalise by number of changes and say which denominator
  you used.
- **Churn corroborates, never leads.** Only relative (size- and window-normalised)
  churn predicts defect density, and only as a correlation on one commercial
  system; cross-project transfer of any coefficient fails even within the same
  domain and process. Use churn only to corroborate a direction defect density
  already suggested, and import no published coefficient.

The published results behind both rules (Nagappan and Ball; Zimmermann et al.),
with their caveats, are in [references/empirical-basis.md](references/empirical-basis.md).

## Step 2 - Convert observations into an observed rating

Produce an **observed likelihood** and an **observed impact** on the same 1 to
5 scale the matrix already uses. Do not invent a new scale, and do not
normalise across teams: severity labels mean different things in different
trackers, so a calibration is valid only inside the conventions of the tracker
it read.

The team's own authoring rubric supplies the cut points. If the matrix says
likelihood 4 means "expected to fail in most releases", express the observed
density in those terms rather than in a generic band. Where the matrix has no
written rubric, say so in the report and mark every proposed change as
provisional, because without a rubric the comparison is between one person's
judgement and another's.

Record, for each row, all of:

- observed likelihood and the signals behind it,
- observed impact and the signals behind it,
- the denominator used for density,
- the count of defects the row is based on.

That last item is the honesty control. A row whose observed rating rests on
two defects is a rating with a wide error bar, and the report should show the
count so a reader can discount it.

## Step 3 - Decide whether a divergence is worth reporting

Most rows will differ from their observations by a little. Reporting those
differences buries the ones that matter and trains the owner to skim the
report.

### Reporting thresholds

These are **practitioner conventions, not standards.** No published standard
sets them. The reasoning for each cut is given so a team can move it with its
eyes open.

| Threshold | Convention | Why this cut |
|---|---|---|
| Per-dimension difference | Report at **2 or more points** on a 1 to 5 scale | One point is inside the spread two people produce scoring the same row independently, which is a known weakness of subjective scoring. Two points is the smallest gap that is unlikely to be scorer noise. |
| Combined score difference | Report at **4 or more points** of likelihood times impact | Under a common 5x5 banding (low 1-4, medium 5-8, high 9-14, critical 15 and up) the narrowest band is four points wide, so a smaller change cannot by itself move a row out of its band, and a change that does not move the band does not change any decision. |
| Minimum window | At least **3 releases, or one quarter, whichever is longer** | A single release usually yields a single-digit defect count per row, and single-digit counts move by 100% on one incident. Below this the observation has less authority than the authoring judgement it would overturn. |
| Minimum defect count per row | State the count; treat fewer than **5 defects** as directional only | Below roughly five events, a rating change is being driven by individual incidents rather than by a rate. |

Rows that clear a threshold fall into one of three classifications.

### 3.1 Over-stated

The matrix rates the row higher than the observations support.

Report it as over-stated only after ruling out the three explanations in the
biased-data section above. Specifically:

- If the row has near-zero defects **and** near-zero test executions covering
  it, that is a **coverage question**, not a low-risk finding. Report it under
  3.3 instead.
- If the row has near-zero defects **and** near-zero production usage, that is
  an **exposure question**. The risk may be entirely real and simply not yet
  triggered. Say so; do not propose a downgrade.
- If the row is covered, exercised, and still quiet, an over-stated finding is
  reasonable. Even then, propose it as a question: a high rating may be a
  deliberate precaution that is working, and lowering it can remove the very
  testing that kept the row quiet. That circularity cannot be resolved from
  the data and belongs in the report as an open point.

### 3.2 Under-stated

The matrix rates the row lower than the observations support. This is the
finding calibration exists to produce, and it is the one least vulnerable to
the absence-of-evidence problem: defects that happened, happened.

Strengthen it with corroboration. An under-stated finding is strongest when
defect density, test failure rate and escape rate all point the same way, and
weakest when only churn does.

### 3.3 Coverage gap

An area that the defect data keeps naming has **no row in the matrix at all**,
or has a row whose observations cannot be computed.

Two sub-cases, and they get different wording:

- **Missing row.** The area produces defects but is not represented. Handle it
  in Step 5 as a candidate new entry.
- **Unmeasurable row.** The row exists but its paths cannot be resolved, its
  defects are unlabelled, or no test covers it. Report the row as
  **not calibrated** and name the missing input. Do not silently score it as
  agreeing with the matrix, and do not score it as low risk. An unmeasurable
  row is a gap in the calibration, not a clean bill of health.

## Step 4 - Every proposed change cites its observation

**A rating change is a proposal for a human to accept, never an automatic
edit.** The matrix is a team artifact, usually version controlled and usually
owned by a named person. Calibration produces a diff for review, and stops
there.

The rule that makes review possible: **every dimension of every proposed
change names the observation behind it.** Not a summary of the observation, a
citation of it, precise enough that the owner can re-run the same query and
see the same number.

A citation is adequate when it carries all four of:

1. **The measured value**, with its units and denominator.
2. **The source it came from**, identified specifically enough to re-query
   (which export, which filter, which paths, which time range).
3. **The window** the value covers.
4. **The count of underlying events**, so the reader can judge the error bar.

A proposed change missing any of the four is not reportable. A reviewer who
cannot check the number is being asked to trust a black box, and a black box
that edits the team's risk ratings is worse than no calibration at all.

## Step 5 - Candidate new entries

Areas absent from the matrix that the defect data insists on are output as
**candidates**, listed with their supporting observations and a suggested
starting rating. They are never added automatically. The matrix owner decides
whether the area deserves its own row or belongs inside an existing one, and
that decision is about how the team models its own system, not about the
data.

Two entry conditions, both practitioner conventions and both self-calibrating
to the team's own data rather than to an absolute number:

- The area produced **more defects in the window than the median matrix row**,
  or
- the area produced **at least one escaped defect** that reached production.

Self-calibrating conditions are preferred here because an absolute cut (say,
"5 or more defects") means something different for a two-person project and a
two-hundred-person one.

For each candidate, propose a starting likelihood and impact, and say plainly
which half of the proposal is weaker. Impact is usually the weaker half:
defect data shows what broke, not what the breakage cost the user, and that
translation is a product judgement.

## Worked example

A full calibration report - summary, under-stated (R-12) and over-stated (R-03)
findings with every dimension citing value / source / window / event count,
not-calibrated rows, a candidate new entry, and the "what was not done" footer -
is in [references/worked-example.md](references/worked-example.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Treating "no defects in the window" as evidence for likelihood 1 | Could equally mean untested or unused. The data cannot distinguish the three. | Cross-check test executions and production usage first; if either is near zero, report a coverage or exposure gap instead (Step 3.1). |
| Ranking rows by raw defect count | Conflates a small busy area with a large stable one. | Normalise to defect density per the ISTQB definition (https://glossary.istqb.org/en_US/term/defect-density) and state the denominator. |
| Leading a rating change with churn | Churn is a correlate of where work happens, not a cause of defects, and only relative churn predicted anything in the published result. | Lead with defect density and severity mix; use churn to corroborate a direction only (Step 1). |
| Importing a published defect-prediction coefficient | Cross-project transfer fails even within the same domain and process (https://api.openalex.org/works/doi:10.1145/1595696.1595713). | Calibrate against the team's own history using the team's own rubric. |
| Reporting every difference | One-point differences are scorer noise; a full report of them buries the real findings. | Apply the Step 3 thresholds and say in the report that they are conventions. |
| Editing the matrix directly | The matrix is a team artifact with an owner; a silent edit destroys the record of who believed what and when. | Emit proposals; the owner applies them (Step 4). |
| A proposed change with a bare number and no source | The reviewer cannot re-derive it, so the ask is unauditable. | Every dimension carries value, source, window and event count (Step 4). |
| Auto-adding candidate entries | Whether an area deserves its own row is a modelling decision about the system, not a data question. | Surface candidates with observations and a suggested rating; the owner decides (Step 5). |
| Extending the report into a forecast | The window is closed history; projecting from it is a different technique with different error properties, and unsourced prediction is what erodes trust in the whole exercise. | Report observed divergence only. |
| Comparing severity across teams | Severity labels are local conventions; an S1 in one tracker is an S2 in another. | Calibrate within one tracker's conventions and say so. |

## Limitations

- **Defect-data quality is the ceiling.** Trackers without a component or
  module field, or without a found-in field distinguishing test from
  production, cannot support an observed impact rating at all. Those rows come
  out as "not calibrated" and that is the correct answer.
- **Path-to-row attribution is heuristic.** Rows are matched to source paths,
  and a refactor that moved code between modules mid-window silently
  misattributes both defects and churn. A code-ownership file or feature
  registry improves this but does not fix it.
- **The comparison is judgement against judgement.** The observed rating still
  depends on the team's severity taxonomy and its authoring rubric. Where the
  rubric is unwritten, calibration compares one person's scale to another's
  and should be labelled provisional.
- **Quiet rows are ambiguous by construction.** This is restated here because
  it is the single most common way a calibration goes wrong: the report can
  never conclude "this area is safe", only "this area produced no evidence".
- **Small windows produce unstable findings.** A row flagged in one quarter
  and not the next may have changed, or may have had two incidents land inside
  one window boundary. Findings that repeat across consecutive calibrations
  are worth far more than a single-window flag; track which rows repeat.
- **No causal claim is available.** Every relationship used here is
  correlational, measured on someone else's system, and confounded by team and
  domain (https://openalex.org/W25935857). Calibration surfaces disagreement
  between belief and record. It does not explain the disagreement.
