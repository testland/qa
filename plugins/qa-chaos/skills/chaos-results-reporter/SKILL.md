---
name: chaos-results-reporter
description: "Aggregates chaos drill verdicts over time into a resilience trend report - per-experiment hypothesis-held / blast-radius / time-to-detect / time-to-recover, degradation trends across runs, action items, and a stakeholder summary. Use when a team has completed one or more chaos drills and needs a structured trend report showing whether resilience is improving, degrading, or stable across iterations."
metadata:
  keywords: "chaos, resilience, trend, reporting, post-drill, blast-radius"
---

# chaos-results-reporter

## Overview

Per [principlesofchaos.org][cp]:

> "**Chaos Engineering** is the discipline of experimenting on a system
> in order to build confidence in the system's capability to withstand
> turbulent conditions in production."

A single drill verdict tells you whether the system held on a specific day.
A trend report answers the harder question: is the system getting more
resilient over time, or are the same blast-radius categories failing on
every run?

This skill walks the workflow for aggregating drill results - from a completed
chaos drill, or from `chaos-experiment-author`
Step 7 - into a structured trend report with per-experiment metrics, cross-run
trend lines, action items, and a stakeholder summary.

**Differentiation axis vs. `chaos-experiment-author` Step 7:** that step
produces a single-drill verdict. This skill aggregates multiple verdicts over
time, computes trend direction, and produces a stakeholder-facing document.
**Differentiation axis vs. running a drill live:** a real-time drill run
produces reports as it executes. This skill runs post-hoc, after one or more
drills have already completed and their reports exist on disk.

## Hard-reject rule

If the input set contains zero completed drill reports (no `hypothesis`,
`verdict`, timestamps, or observed metrics), halt immediately:

```
HALT: No drill results found. Provide at least one completed drill report
before running chaos-results-reporter.
```

Do not fabricate metrics or assume a prior run exists.

## How to use

1. Gather every completed drill report for the target service into one place
   (a directory or an explicit file list). If none exist, halt per the
   hard-reject rule.
2. Parse each report into the field-extraction map, flagging any report that is
   missing a required field as `INCOMPLETE` (Step 1).
3. Build the per-experiment summary table, one row per run, sorted by date
   ascending (Step 2).
4. For each experiment type with 2+ runs, compute the hypothesis-held rate,
   blast-radius trend, and TTR trend, then label each direction (Step 3).
5. Scan for degradation signals and turn each HIGH or MEDIUM finding into a
   concrete action item with evidence (Steps 4-5).
6. Write the plain-language stakeholder summary (Step 6).
7. Assemble the four-section report and write it to
   `results/chaos/trend-report-<YYYY-MM-DD>.md` (Output format).

## Step 1 - Collect drill reports

Locate completed drill reports. Supported input forms:

- Markdown files in the `## Chaos drill report - <experiment-id>` format
  (as emitted by a completed chaos drill).
- YAML verdict files emitted by `chaos-experiment-author` Step 7.
- A directory glob passed by the user (e.g., `results/chaos/*.md`).

For each report, extract the fields in the field-extraction map in
[references/drill-fields-and-signals.md](references/drill-fields-and-signals.md).
If any required field is missing from a report, flag that report as
`INCOMPLETE` in the aggregate table and skip it from trend calculations.
Do not guess or interpolate missing values.

## Step 2 - Build the per-experiment summary table

Emit one row per drill run, sorted by date ascending:

```markdown
| Date       | Experiment                     | Verdict  | Hypothesis held | Blast radius (peak err) | TTD    | TTR    |
|------------|-------------------------------|----------|-----------------|------------------------|--------|--------|
| 2026-01-10 | checkout-network-latency       | PASSED   | Yes             | 1.2% (bound 5%)        | n/a    | 42 s   |
| 2026-02-07 | checkout-network-latency       | ABORTED  | No              | 6.1% (bound 5%)        | 78 s   | 3 m 2 s |
| 2026-03-01 | checkout-network-latency       | PASSED   | Yes             | 0.9% (bound 5%)        | n/a    | 31 s   |
```

**TTD** (time-to-detect): how long from injection start until the blast-radius
monitor triggered an abort or the team observed a signal. Per
[chaos-principles][cp] principle "Minimize Blast Radius": reducing TTD is a
leading indicator of maturing blast-radius containment.

**TTR** (time-to-recover): how long from experiment end until steady state
returned. Maps to the ISTQB concept of recoverability under
[ISO/IEC 25010:2023][iso25010] Quality Characteristic: Reliability >
Recoverability (the ability of software to recover data directly affected
in the case of an interruption or failure and re-establish the desired state
of the system).

## Step 3 - Compute per-experiment trend

For each unique `experiment_type` with two or more runs, compute:

**Hypothesis-held rate** across runs:

```
held_rate = (count of PASSED runs) / (total runs for this experiment type)
```

Flag the trend direction:

- `IMPROVING` if the last 3 runs held and the held_rate is higher than the
  first half of the run history.
- `DEGRADING` if the held_rate dropped between the first half and the second
  half of the run history, or if the last 2 runs both failed/aborted.
- `STABLE` if held_rate is consistent (within 10 percentage points) across
  the full run history.
- `INSUFFICIENT DATA` if fewer than 2 runs exist for this experiment type.

**Blast-radius trend**: compare peak observed error rate run over run. Flag
`WIDENING` if the most recent peak is more than 20% above the earliest
recorded peak for the same experiment type; `NARROWING` if it is more than
20% below; `STABLE` otherwise.

**TTR trend**: compare recovery time run over run. Flag `IMPROVING` if the
median TTR in the second half of runs is shorter than in the first half;
`DEGRADING` if longer; `STABLE` if within 20%.

## Step 4 - Identify degradation signals

Scan all experiments for the degradation signals catalogued in
[references/drill-fields-and-signals.md](references/drill-fields-and-signals.md).
Emit each match as a named finding.

Per [chaos-principles][cp] principle "Automate Experiments to Run
Continuously": a `DEGRADING` trend on an automated experiment is a signal
that the system has drifted since the experiment was written. Do not treat
a single passing run as permanent confidence.

## Step 5 - Compile action items

For each HIGH or MEDIUM finding, emit a concrete action item with:

- **Finding:** the named signal from Step 4.
- **Experiment:** which experiment type triggered it.
- **Evidence:** the specific run dates and metric values.
- **Recommended action:** one of:
  - Investigate the blast-radius breach root cause (link to the drill's
    `Abort reason` field).
  - Tighten abort conditions in the experiment YAML (lower the error-rate
    threshold, shorten the TTL).
  - Re-run the experiment after the fix and verify TTR improves.
  - Shrink blast-radius scope (fewer replicas, shorter duration) per
    [chaos-principles][cp] principle "Minimize Blast Radius".
  - Author a new experiment targeting the newly discovered failure mode via
    `chaos-experiment-author`.

## Step 6 - Emit the stakeholder summary

The stakeholder summary is a short (8-15 line) non-technical section for
engineering leads and product owners. It must:

- State the reporting period (date range of included drills).
- State the number of experiments run, passed, aborted, and failed.
- State the overall resilience posture in plain language: "The checkout
  service held its steady-state hypothesis in 4 of 5 runs this quarter."
- Name any HIGH-severity findings in one sentence each, without jargon.
- List the top 1-3 action items in plain language.
- Not reproduce raw metric tables (those belong in the per-experiment
  section).

Example:

```markdown
## Resilience trend summary - Q1 2026

**Period:** 2026-01-10 to 2026-03-01 | **Drills run:** 5 | **Passed:** 3 |
**Aborted:** 2 | **Failed:** 0

The checkout service maintained its target error rate in 3 of 5 runs. Two
network-latency drills in February were aborted when the error rate exceeded
the 5% budget, with the peak reaching 6.1%. Recovery time improved from
3 minutes in February to 31 seconds in March after the retry backoff was
tuned.

**Top action items:**
1. Confirm the February blast-radius breach root cause before the next
   scheduled drill (checkout-network-latency).
2. Expand the pod-kill experiment blast radius from 1% to 5% of replicas
   now that the network-latency experiment is stable.
```

## Output format (full report)

The full report consists of four sections in order:

1. `## Resilience trend summary - <period>` (stakeholder summary, Step 6)
2. `## Per-experiment drill results` (table from Step 2)
3. `## Trend analysis` (per-experiment trend verdicts from Step 3)
4. `## Action items` (findings + recommendations from Steps 4-5)

Write the report to `results/chaos/trend-report-<YYYY-MM-DD>.md` (where the
date is today's date) unless the user specifies a different output path.

## Worked example

Three completed drill reports for `checkout-network-latency` sit in
`results/chaos/`:

- 2026-01-10 - PASSED, peak error 1.2% (bound 5%), TTR 42 s.
- 2026-02-07 - ABORTED, peak error 6.1% (bound 5%), TTD 78 s, TTR 3 m 2 s.
- 2026-03-01 - PASSED, peak error 0.9% (bound 5%), TTR 31 s.

**Steps 1-2:** All three parse cleanly (no `INCOMPLETE` reports), yielding the
per-experiment summary table sorted by date.

**Step 3:** Held rate is 2 of 3. Peak error moved from 1.2% (Jan) to 0.9% (Mar),
more than 20% below the earliest peak, so the blast-radius trend is NARROWING.
TTR fell from the 3 m 2 s February peak to 31 s in March, so the TTR trend is
IMPROVING. Because the series is not yet 3 consecutive PASSED runs, the March
pass is treated as regression toward the mean, not confirmed recovery (see
Anti-patterns).

**Step 4:** No HIGH or MEDIUM signal fires for this experiment type: the abort
was isolated to one run (no repeated blast-radius breach), TTR improved after
the run (no "No TTR improvement after fix"), and the blast-radius trend is
narrowing rather than widening.

**Steps 5-6:** With no HIGH or MEDIUM finding, Steps 4-5 add no action items for
this experiment type. The stakeholder summary reads: "The checkout service
maintained its target error rate in 2 of 3 network-latency runs; recovery time
improved from 3 minutes in February to 31 seconds in March after the retry
backoff was tuned."

The four-section report is written to `results/chaos/trend-report-<YYYY-MM-DD>.md`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Reporting on a single drill run | One data point can't show a trend | Collect at least 2 runs per experiment type before computing trend direction |
| Interpolating missing fields | Fabricated metrics corrupt the trend | Flag the report as `INCOMPLETE` and exclude it from calculations |
| Marking a DEGRADING trend as acceptable because the most recent run passed | One passing run after a degraded series is regression toward the mean, not confirmed recovery | Require 3 consecutive PASSED runs before reclassifying to STABLE or IMPROVING |
| Mixing experiment types in a single trend line | Network-latency and pod-kill have different blast-radius profiles | Keep trends per experiment type (Step 3) |
| Copying raw metric tables into the stakeholder summary | Non-technical readers lose the signal in the noise | Keep the summary prose-only; tables stay in the per-experiment section |

## Limitations

- **No live metric pull.** This skill aggregates drill reports already on
  disk. It does not pull from Datadog, Prometheus, or any observability
  platform directly. For live metric correlation, pair with a
  dedicated observability skill after running the drill.
- **TTD requires abort-logged drills.** If a drill completed without an
  abort, TTD is `n/a` - the experiment never breached its bound. A
  consistent `n/a` TTD column is a signal that experiments may need tighter
  bounds, not that the system has infinite resilience.
- **Trend direction needs at least 2 runs.** Single-run experiments are
  flagged `INSUFFICIENT DATA` and excluded from trend calculations. Schedule
  recurring drills per [chaos-principles][cp] principle "Automate Experiments
  to Run Continuously" to build a trend-worthy dataset.

## References

- [cp][cp] - principlesofchaos.org: core definition, five advanced principles
  (steady-state, real-world events, production, automation, blast radius).
  Inline citations at each principle invocation above.
- [iso25010] - ISO/IEC 25010:2023 Quality Model: Reliability > Recoverability.
  Cited at TTR definition in Step 2.
- `chaos-experiment-author` - authors
  the per-experiment YAML and single-drill verdict (Step 7) that this skill
  aggregates.

[cp]: https://principlesofchaos.org/
[iso25010]: https://www.iso.org/standard/78176.html
