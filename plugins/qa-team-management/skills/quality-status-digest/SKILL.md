---
name: quality-status-digest
description: "Computes a recurring quality status digest from metrics that already exist: CI pass rate with an explicit denominator rule, escape-defect count, and a flake-debt score, assigns red / amber / green per area against stated thresholds, then rolls the same per-team rows into a portfolio view with a severity-by-blast-radius heatmap, STABLE / WATCH / INVEST tags, and a capacity flag. Keeps DORA delivery metrics separate from defect-leakage and flake measures instead of blending them under one label. Produces the status artifact only: it does not instrument anything, does not define SLOs or targets, and does not decide what gets fixed first. Use when a weekly quality review, sprint check-in, or quarterly portfolio review is due and the CI history, defect tracker, and quarantine list already hold the numbers but nobody has assembled them into one page."
---

# quality-status-digest

## Overview

A quality status digest is a backward-looking, one-page answer to "where does
quality stand right now". It is assembled from numbers the team already
produces: how many CI runs finished and how, how many defects reached
production, how many tests are sitting in quarantine. The work is not
measurement. The work is the denominator rules, the thresholds, and the
discipline to keep unlike metrics in unlike buckets.

This skill has two altitudes that share one method. **Part 1** computes a
per-team digest. **Part 2** rolls several per-team digests into a portfolio
view. The roll-up is not a second calculation: it reads the values Part 1
already emitted (that is what the summary row in Part 1's output template is
for) and never re-derives them from raw run data. Re-deriving is how two
documents in the same meeting end up disagreeing about the same team.

## What this skill owns, and what it does not

**Owns:** turning metrics that already exist into the recurring status
artifact - the denominators, the score formulas, the red / amber / green cut
points, the tagging scheme, and the two output templates.

**Does not own:**

- **Instrumenting anything.** If pass rate is not computable because CI does
  not record run conclusions, or escapes are not countable because production
  defects are untagged, this skill reports the gap under Open items. It does
  not add tracking.
- **Defining SLOs, targets, or OKRs.** Thresholds here classify what already
  happened. A commitment about what quality *should* be next quarter is a
  different artifact with a different author.
- **Deciding priorities.** The digest ranks risk and flags where the trend is
  bad. Choosing what the team works on next is a planning decision made with
  the digest as one input, not a line the digest writes.
- **Root-cause work.** The digest counts escapes and flakes. Classifying an
  escape as a test gap versus a process gap, or bisecting a flake to its
  triggering condition, is downstream investigation.

## Inputs the computation assumes

You need these values for the reporting window (default seven calendar days
per team; a quarter for the portfolio view). How you obtain them is out of
scope: any CI API, tracker export, or manifest works.

| Value | Definition applied |
|---|---|
| Run outcomes | Every CI run that finished inside the window, with its terminal conclusion (success, failure, cancelled, skipped) |
| Prior-window pass rate | The same figure from the previous digest, for the trend arrow |
| Escapes | Defects created in the window that reached production before the fix shipped |
| Deployments | Count of deployments in the window, under a definition you state (production release, staging push, and feature-flag flip are three different numbers) |
| Quarantine entries | Currently quarantined tests with the date each was quarantined |
| Threshold basis | Either "defaults" (the tables below) or the team's own calibrated file |

For the portfolio view, add per team: the emitted per-team summary row, an
estimate of blast radius (users or revenue exposed), current headcount, and
open roles.

# Part 1 - The per-team digest

## Step 1 - Pass rate, with the denominator rule

```
pass_rate = successful_runs / (successful_runs + failed_runs)
```

Cancelled and skipped runs are excluded from the denominator. They carry no
information about whether the software works: a cancelled run reports on a
human pressing a button or a newer commit superseding an older one. Leaving
them in makes pass rate move whenever CI hygiene changes, which is the single
most common way this number becomes uninterpretable.

Compute the same figure for the prior window. The delta, expressed in
percentage points, is the trend. Report both: a 78% pass rate that rose 9 pp
and a 78% that fell 9 pp are opposite situations with the same headline.

## Step 2 - Escape defects (and why this is not a DORA metric)

An escape defect is one that reached production despite the existing test
suite. Count the escapes created in the window. Where deployment count is
known:

```
escape_rate = escapes_in_window / deployments_in_window
```

If deployment count is unavailable, report the raw count and say the
denominator is unknown, in the digest itself. Do not silently switch
denominators between windows; the trend becomes meaningless.

**Escape-defect rate is not a DORA metric.** Neither is pass rate, nor flake
debt. DORA measures software *delivery* performance. Its guidance now
documents five metrics, described as having evolved "from the original four
keys to the current five-metric model", grouped as throughput and instability
([dora.dev/guides/dora-metrics-four-keys/](https://dora.dev/guides/dora-metrics-four-keys/),
verified 2026-07-19):

- **Change lead time** (originally "lead time for changes"): "The amount of
  time it takes for a change to go from committed to version control to
  deployed in production."
- **Deployment frequency**: "The number of deployments over a given period or
  the time between deployments."
- **Failed deployment recovery time**: "The time it takes to recover from a
  deployment that fails and requires immediate intervention."
- **Change fail rate** (originally "change failure rate"): "The ratio of
  deployments that require immediate intervention following a deployment."
- **Deployment rework rate**: "The ratio of deployments that are unplanned but
  happen as a result of an incident in production."

Deployment frequency and change fail rate are usually computable from the same
CI data the digest already reads, so include them as delivery context in their
own section. Change lead time and failed deployment recovery time need commit
timestamps and incident records, so mark them partial rather than guessing.
Escape rate belongs beside these figures, never inside them: defect leakage
and delivery performance answer different questions and a single informed
reader will catch the conflation.

## Step 3 - Flake debt

```
flake_debt_score = (stale_quarantine_count * 2) + new_flakes_in_window
```

Count an entry as stale when it has been quarantined more than 14 days. Both
numbers in this formula are **practitioner conventions, not standards**:

- **14 days** approximates one two-week sprint. An entry that survives a full
  planning cycle has outlived the "we will fix it next sprint" promise that
  justified quarantining it, which is exactly the population you want counted
  separately. On a one-week cadence, set it to 7.
- **The weight of 2** encodes a judgement: a long-lived quarantine entry is
  coverage that is already gone and keeps widening, whereas a new flake is
  usually still fresh in someone's memory and cheap to fix. Weighting stale
  entries double makes a queue of old entries outrank a burst of new ones. If
  your team fixes old entries as readily as new ones, the weight is 1.

State the weight and the staleness cut-off in the digest, so a reader who
disagrees can recompute rather than dismiss.

## Step 4 - Red / amber / green per area

The cut points below are **conventions, and a starting point only**. They are
not benchmarks and no standard sets them. Calibrate against your own baseline
and record which basis you used.

| Area | Green | Amber | Red | Why the cut sits there |
|---|---|---|---|---|
| Pass rate (window) | 90% or above | 75% to 89% | Below 75% | Below roughly 90%, a failing build stops being a signal and engineers start re-running by reflex. A team whose historical median is 97% should set green at its own median instead. |
| Pass rate trend | 0 pp or better | -5 to -1 pp | Worse than -5 pp | In a 50-run window one bad day moves the rate about 2 pp, so a 5 pp fall is outside ordinary week-to-week noise at that sample size. Recalibrate if your window is much smaller. |
| Escapes (window) | 0 | 1 | 2 or more | Escapes are rare and individually investigable, so counts work where ratios do not: weekly deployment counts are too small to make a stable rate. |
| Stale quarantine entries | 0 | 1 to 3 | 4 or more | Four entries is roughly where a quarantine list stops being a short exception list somebody remembers and becomes a backlog nobody reads. |
| New flakes (window) | 0 | 1 to 2 | 3 or more | Three arrivals per window exceeds the one-per-sprint repair rate most teams sustain, so the queue grows even if every fix lands. |

The headline status for the team is the worst area, not an average. Averaging
a red flake-debt score against a green pass rate hides the only line that
needed a decision.

## Step 5 - Emit the per-team digest

Write one file per window, for example `quality-digest/<YYYY-MM-DD>.md`. The
final fenced summary row is what the portfolio roll-up consumes, so emit it
even when only one team is reporting.

````markdown
# Quality digest - 2026-07-12 - checkout

**Window:** 2026-07-06 to 2026-07-12  |  **Threshold basis:** defaults
**Deployment definition:** production release  |  **Flake weight:** 2, stale at 14 days

## Summary

| Area | Status | Metric | Trend |
|---|---|---|---|
| CI pass rate | GREEN | 94% | +2 pp vs prior window |
| Escape defects | AMBER | 1 escape | flat |
| Flake debt | RED | 5 stale + 2 new | +3 entries |

**Headline: RED** (worst area: flake debt)

## CI pass rate
- This window: 94% (47 of 50 terminal runs; 3 cancelled runs excluded)
- Prior window: 92%, so the trend is +2 pp
- Failed runs: 8841, 8907, 8955

## Escape defects
- Escapes this window: 1 (BUG-4412, discount code applied twice at checkout)
- Escape rate: 1 / 12 production deployments = 0.08
- Root-cause classification is not done here; this is a count

## Flake debt
- Stale quarantine (over 14 days): 5 entries (oldest quarantined 2026-05-30)
- New flakes this window: 2
- Flake debt score: (5 x 2) + 2 = 12

## Delivery context (DORA, partial)
- Deployment frequency: 12 deployments in window
- Change fail rate: 8% of deployments required immediate intervention
- Change lead time and failed deployment recovery time: not computed, no commit
  timestamp or incident feed available. Definitions per dora.dev.
- Escape rate above is a defect-leakage measure and is deliberately not listed here

## Top risks
1. Flake debt is growing faster than it is repaired - area: E2E suite
2. Checkout discount path has no regression test - area: payments

## Open items
- Deployment count covers production releases only; staging pushes not counted
- 3 defects closed this window carried no environment label, so escape
  attribution for them is unverified

```text
digest-row: team=checkout window=2026-07-06..2026-07-12 pass_rate=0.94 delta_pp=+2 escapes=1 deployments=12 flake_debt=12 rag=RED basis=defaults
```
````

# Part 2 - The portfolio roll-up

Run this when several teams have each produced a Part 1 digest for comparable
windows. It consumes their summary rows.

## Step 6 - Build the cross-team table from the emitted rows

Parse one `digest-row` per team and place each value in a row unchanged. Do
not recompute pass rate, escapes, or flake debt from raw CI at this altitude:
the per-team digest already stated its window, its deployment definition, and
its threshold basis, and re-deriving without those settings produces numbers
that contradict the documents leadership already received.

Carry the threshold basis into the portfolio table. Two teams both showing
GREEN under different calibrations are not equivalent, and the reader needs to
see that.

Portfolio headline: RED if any team is RED. This is a convention, chosen
because a portfolio view exists to surface the worst case; averaging four
teams into AMBER describes no team that exists and hides the one needing a
decision.

Add the two portable DORA figures per team, deployment frequency and change
fail rate ("the ratio of deployments that require immediate intervention
following a deployment",
[dora.dev/guides/dora-metrics-four-keys/](https://dora.dev/guides/dora-metrics-four-keys/),
verified 2026-07-19). These two survive cross-team comparison best because
they need only deployment records and incident flags, while lead time and
recovery time depend on per-team commit and incident conventions that rarely
match.

## Step 7 - Risk heatmap

Score each team on two axes and place it on a 3 x 3 grid:

- **Signal severity**: the team's worst digest area, taken straight from its
  headline (GREEN / AMBER / RED).
- **Blast radius**: users or revenue exposed if that area fails, in three
  bands (low / medium / high) defined once for the whole portfolio and stated
  in the document.

If nobody supplied user or revenue figures, write `[DATA NOT SUPPLIED]` in the
cell rather than estimating. An invented blast radius gets quoted back as a
fact in the next meeting, and it never carries the caveat with it.

High severity plus high blast radius is the investment candidate quadrant. The
grid exists so that a RED team serving an internal admin tool does not outrank
an AMBER team on the checkout path.

## Step 8 - Capacity flag

Per team, record QE headcount, open roles, automation ratio, and whether
testers are embedded in product squads or sit in a separate function.

Flag capacity risk when open roles exceed 20% of headcount. This is a
**convention with no standard behind it**. The reasoning: at one vacancy in
five, the remaining engineers absorb both the vacant scope and the interview
loops that fill it, so delivery slips for reasons no quality metric explains.
Below that ratio, hiring load is usually noise. On teams of three or four,
drop the percentage and use an absolute count, because 20% of three rounds to
nothing meaningful.

Two industry figures are useful context when the flag prompts a staffing
conversation, from the 2026 State of Testing Report (13th edition): 56.4% of
respondents' teams are measured on test coverage, against 8.6% measured on
business impact, and testers in cross-functional squads report roughly 27%
higher pay than those in siloed QA departments
([practitest.com/state-of-testing/](https://www.practitest.com/state-of-testing/),
verified 2026-07-19). Treat these as survey context on how the field measures
and structures QA work, not as a target for your own org.

## Step 9 - Tag each team STABLE, WATCH, or INVEST

Compare this period's per-team digest values against the previous period's for
the same three areas: pass rate, escapes, flake debt.

| Tag | Rule | Reasoning |
|---|---|---|
| `STABLE` | All three areas flat or improving, none RED | Nothing here needs portfolio attention; leave the team alone |
| `WATCH` | Exactly one area regressing, none RED | One regressing area is inside normal variation; name it so the next review can tell drift from noise |
| `INVEST` | Two or more areas regressing, or any area RED | Two regressions rarely have independent causes, and a RED area is a present failure rather than a trajectory, so it forces the tag regardless of direction |

This three-tier scheme is a **convention**. The three-way split falls out of
having exactly three digest areas, which gives a natural 0 / 1 / 2-or-more
boundary. If your digest tracks four areas, move the INVEST boundary rather
than keeping "two" out of habit.

For each `INVEST` team, check whether an existing commitment covers the
regressing area. A team tagged `INVEST` with no commitment touching the
regression has no funded recovery path, and surfacing that gap is the point of
the tag. The digest names the gap. It does not decide the remedy or its
priority.

## Step 10 - Emit the portfolio review

```markdown
# Portfolio quality review - 2026-Q3 - 4 teams

**Headline: RED** (checkout)  |  **Prior quarter headline:** AMBER

## Per-team roll-up

| Team | Pass rate | Trend | Escapes | Flake debt | Deploy freq | Change fail rate | RAG | Basis | Tag |
|---|---|---|---|---|---|---|---|---|---|
| checkout | 94% | +2 pp | 1 | 12 | 12 | 8% | RED | defaults | INVEST |
| search | 97% | +1 pp | 0 | 2 | 31 | 3% | GREEN | own | STABLE |
| identity | 88% | -6 pp | 2 | 7 | 9 | 11% | RED | defaults | INVEST |
| billing | 93% | 0 pp | 1 | 4 | 14 | 5% | AMBER | defaults | WATCH |

Values copied from each team's digest-row; not recomputed.

## Risk heatmap (severity x blast radius)

|  | Blast low | Blast medium | Blast high |
|---|---|---|---|
| **RED** | - | identity | checkout |
| **AMBER** | - | billing | - |
| **GREEN** | search | - | - |

Blast bands: high = revenue path, medium = login or account path, low = internal.

## Capacity

| Team | QE headcount | Open roles | Open / headcount | Automation ratio | Structure | Capacity flag |
|---|---|---|---|---|---|---|
| checkout | 4 | 2 | 50% | 60% | embedded | FLAGGED |
| search | 5 | 0 | 0% | 85% | embedded | - |
| identity | 3 | 1 | 33% | 40% | siloed | FLAGGED (small team: 1 of 3) |
| billing | 4 | 0 | 0% | 55% | embedded | - |

## INVEST teams

- **checkout** - RED on flake debt (12, up from 5), 2 of 4 QE roles open. No
  existing commitment references flake reduction: no funded recovery path.
- **identity** - RED on pass rate (88%, -6 pp) and 2 escapes. An existing
  commitment covers escape reduction; nothing covers pass rate.

## What this review did not consider

Individual contributor performance, vendor and tooling contracts, roadmap-level
risk, and anything outside the four teams' own digests.
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Counting cancelled runs in the pass-rate denominator | The number then tracks CI hygiene, not software quality, and moves for reasons nobody can explain in the meeting | Step 1 denominator rule |
| Filing escape rate, pass rate, or flake debt under a DORA heading | DORA measures delivery performance ([dora.dev](https://dora.dev/guides/dora-metrics-four-keys/)); mislabelling defect leakage as a delivery metric costs the whole document its credibility on the first informed question | Step 2: separate sections, explicit note |
| Presenting the threshold table as an industry benchmark | Every cut point here is a convention; asserting it as a standard invites a target nobody derived from their own data | State the threshold basis in the header, every time |
| Recomputing per-team metrics at the portfolio layer | Two documents in one meeting disagreeing about the same team destroys trust in both | Step 6: consume the emitted summary row |
| Averaging areas or teams into one status | An averaged AMBER describes no real team and hides the one that needed the decision | Worst area wins per team; worst team sets the portfolio headline |
| Estimating a blast radius nobody supplied | The estimate outlives its caveat and becomes quoted fact | `[DATA NOT SUPPLIED]` |
| Softening amber or red before the review | The digest is a management input, not a report card; suppressed signals surface later at higher cost | Report the computed status; add context in prose, not in the status cell |
| Reporting a number without its source | An uncited figure discredits the cited ones next to it | Every metric names the artifact it came from |

## Limitations

- **Tracker data quality bounds the escape count.** If production defects are
  inconsistently labelled, or escapes are mixed with feature requests, the
  escape count understates reality. Record the labelling gap under Open items
  rather than presenting the count as complete.
- **"Deployment" is not a portable word.** It may mean a production release, a
  staging push, or a feature-flag flip. Escape rate and deployment frequency
  are only comparable across teams that share the definition, which is why the
  digest header states it.
- **Flake debt is a proxy.** Quarantine age and new-flake count are observable
  stand-ins for instability. They cannot see flakes that were never
  quarantined, so a team with no quarantine process can score 0 while being
  the least stable in the portfolio.
- **DORA context is partial from CI data alone.** Change lead time and failed
  deployment recovery time need commit timestamps and incident records
  ([dora.dev](https://dora.dev/guides/dora-metrics-four-keys/)); reporting them
  as computed when they were estimated is worse than omitting them.
- **Trend tags need a comparable prior period.** A first portfolio review has
  no STABLE / WATCH / INVEST tags to give, only a baseline. Say so instead of
  tagging everything STABLE by default.
