---
name: ab-test-validity-checklist
description: "Use when launching, auditing or governing an A/B test or online experiment design. Builds a per-experiment checklist and sign-off: pre-registered metric, power and guardrails, randomization unit and sample ratio mismatch checks, assignment, telemetry, peeking rules and novelty effects."
---

# ab-test-validity-checklist

## Overview

Produces the pre-flight and post-flight validity checklist for one A/B
test. Each step is a gate: a failed gate stops the ship discussion
until it is fixed or explicitly waived in writing. Output:
`experiments/<id>/checklist.md` from
[references/checklist-template.md](references/checklist-template.md),
signed by the owner (pre-registration) and a different reviewer
(post-experiment).

## When to use

- Launching a new experiment, or reviewing a PR that changes its config.
- Auditing an experiment whose result looks too good or too strange.
- Setting up experiment peer review for a team.

## Step 1 - Pre-register before launch

Commit `experiments/<id>/proposal.yml` with:

| Item | What |
|---|---|
| OEC | The one metric (or weighted combination) to improve |
| Power | Effect size (MDE), sample size, alpha, beta |
| Guardrails | Each metric with alert and block thresholds; pick from the guardrail catalog in `experiment-results-interpreter` (its guardrails and thresholds references). Always include one quality guardrail (latency or error rate) and use `max(%, absolute)` thresholds on fast endpoints |
| Randomization unit | User / session / device / cookie / tenant |
| Allocation | Percent per arm; ramp-up rules |
| Look schedule and method | Fixed horizon, Pocock, O'Brien-Fleming, or always-valid (see the peeking reference in `experiment-results-interpreter`) |
| Stop-early rules | Which signals stop the test |

**Checkpoint:** the reviewer confirms every row has a value and the
power calculation's N is reachable in the planned duration. After
launch, any change to this file needs a recorded team approval.

## Step 2 - Check Sample Ratio Mismatch (SRM)

An SRM means the observed split differs from the configured one, and
the results cannot be trusted until the cause is found. About 6% of
Microsoft's A/B tests have one; Microsoft ExP flags SRM at
**p < 0.0005**, a conservative threshold that limits false alarms
([ExP SRM article][srm]). Run it daily during the test and again before
the ship decision:

```python
# srm_check.py - usage: python srm_check.py 503000 497000 --split 50 50
import argparse
from scipy.stats import chisquare

p = argparse.ArgumentParser()
p.add_argument("observed", type=int, nargs="+")
p.add_argument("--split", type=float, nargs="+", required=True)
a = p.parse_args()
total = sum(a.observed)
expected = [total * s / sum(a.split) for s in a.split]
stat, pvalue = chisquare(a.observed, f_exp=expected)
print(f"chi2={stat:.1f} p={pvalue:.2e}")
raise SystemExit(1 if pvalue < 0.0005 else 0)
```

For 503,000 / 497,000 at 50/50: chi2 = 36.0, p ≈ 2e-9, so SRM.
`scipy.stats.chisquare` takes observed and expected counts and returns
the statistic and p-value ([SciPy][chisq]).

**If SRM is detected,** stop analysis and work through the causes ExP
groups by stage ([ExP SRM article][srm]), checking each against data:

1. **Assignment:** bucketing bugs, bad user IDs, carry-over from an
   earlier experiment on the same users.
2. **Execution:** a redirect or extra step in one arm only; a variant
   that changes how often users come back and get logged.
3. **Log processing:** joins or bot filters that drop rows unevenly.
4. **Analysis:** a segment condition that the treatment itself changes.
5. **Ramp-up:** arms ramped unevenly, or users able to self-assign.

Fix the cause, then either restart the experiment or exclude the
affected period, re-run `srm_check.py`, and continue only on exit
code 0. Never analyse the OEC on data with an unexplained SRM.

## Step 3 - Assignment integrity

| Test | Pass |
|---|---|
| Determinism | Same (unit, experiment) gives the same arm on every call |
| Stickiness | A unit changes arm only when the experiment is reconfigured |
| Independence | Arm in experiment A does not predict arm in experiment B |
| Bot exclusion | Bots are filtered before assignment, identically for all arms |

These run in the per-vendor harnesses of `experiment-sdk-testing`. A
failing test here blocks launch.

## Step 4 - Telemetry

- Conversion events fire once per eligible conversion.
- Exposure is logged for every unit that could see the variant, not
  only those who did.
- Every guardrail is queryable by arm (variant ID joined to the event
  stream).

**Checkpoint:** run one A/A day or a staging pass and confirm event
counts per arm match assignment counts within SRM tolerance (Step 2
script on the exposure counts).

## Step 5 - Peeking discipline

| Declared method | Gate |
|---|---|
| Sequential / always-valid | The dashboard p-value uses that method's math |
| Fixed horizon | No ship decision before the planned N |
| Pocock / O'Brien-Fleming | Looks happen only on the declared days |

## Step 6 - Novelty and primacy

Novelty inflates the early effect and primacy depresses it, so compare
week 1 with week 2+ and new vs returning users. A test shorter than two
full weeks cannot pass this gate; mark it "not assessed" rather than
"pass".

## Step 7 - Post-experiment gates

| Gate | Pass |
|---|---|
| Pre-registration honoured | `proposal.yml` unchanged since launch, or changes approved |
| SRM clean | `srm_check.py` exit 0 on final counts |
| OEC significant | Under the declared method |
| Guardrails | Each below its block threshold |
| Multiple comparisons | Bonferroni or Benjamini-Hochberg applied when many metrics are read |
| Novelty | Effect persists in week 2+ |
| Segments | Same direction in major segments (no Simpson's paradox) |

Record each with its number in `experiments/<id>/result.md`, then fill
the post-experiment section of the checklist template. Any failed gate
means "no-ship" or "extend", never "ship with a note".

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Changing the OEC after launch | p-hacking | Pre-register (Step 1) |
| Reading results before the SRM check | Biased arms look like real effects | Step 2 first, every time |
| Owner signs off their own experiment | No second check | Different reviewer |
| Ticking boxes without numbers | The checklist becomes paperwork | Evidence next to each item |
| Percent-only latency guardrail | 10% of 10 ms hides real regressions | `max(%, absolute)` |

## Limitations

- Necessary, not sufficient: it cannot catch a metric that measures
  the wrong thing.
- Multiple-comparison corrections are conservative and can reject real
  wins.
- Does not cover interactions between concurrent experiments; see
  `experiment-results-interpreter`.

## References

- [Microsoft ExP - Diagnosing Sample Ratio Mismatch in A/B Testing][srm] - SRM definition, p < 0.0005 threshold, 6% prevalence, root-cause taxonomy.
- [SciPy `chisquare`][chisq] - goodness-of-fit test used in `srm_check.py`.
- Kohavi, Tang, Xu. *Trustworthy Online Controlled Experiments* (Cambridge University Press, 2020), ISBN 978-1108724265 - OEC, guardrails, novelty and primacy.
- Fabijan et al. "Diagnosing Sample Ratio Mismatch in Online Controlled Experiments", KDD 2019 - the paper behind the ExP article.
- [references/checklist-template.md](references/checklist-template.md) - the checklist and sign-off form.
- Sibling skills: `experiment-results-interpreter` (reading a valid result; guardrail and peeking methodology), `experiment-sdk-testing` (Statsig / Optimizely / Split.io / Amplitude / VWO harnesses).

[srm]: https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/
[chisq]: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chisquare.html
