# Sources and verbatim citations

Full source attributions for the interpretation steps in `SKILL.md`.
Each inline `[sources](references/sources.md)` link points here.

## Practical vs statistical significance (Step 1)

Nielsen Norman Group, A/B testing guide: results "may be statistically
significant but not practically significant" - a test can show reliable
differences that lack meaningful business value.
[nngroup.com/articles/ab-testing/](https://www.nngroup.com/articles/ab-testing/)

## Confidence intervals (Step 2)

Statsig confidence-interval docs: "A 95% confidence interval should
contain the true effect 95% of the time"; it is "an intuitive way to
quantify the uncertainty" that gives "both directionality and magnitude
of effects simultaneously."
[docs.statsig.com/experiments/statistical-methods/confidence-intervals](https://docs.statsig.com/experiments/statistical-methods/confidence-intervals)

Microsoft ExP variance-reduction research: CUPED and similar techniques
produce "narrower confidence intervals, with values that are closer to
the estimated effect" without sacrificing the false-positive rate.
[microsoft.com/en-us/research/group/experimentation-platform-exp/articles/deep-dive-into-variance-reduction/](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/deep-dive-into-variance-reduction/)

## Novelty and primacy effects (Step 3)

Kohavi, Tang, Xu, *Trustworthy Online Controlled Experiments* (Cambridge
Univ. Press, 2020, ISBN 9781108724265): "novelty and primacy effects are
significant causes of treatment effects changing over time but are not
the sole causes."

Microsoft ExP external-validity research: "14-day surprises" - the second
week's estimate falling outside the first week's 3-sigma confidence
interval - occurred at roughly 4% of experiments, far more than the
theoretical rate.
[microsoft.com/en-us/research/group/experimentation-platform-exp/articles/external-validity-of-online-experiments-can-we-predict-the-future/](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/external-validity-of-online-experiments-can-we-predict-the-future/)

Wikipedia, novelty effect: a temporary boost from "introducing new
elements on some activity or behavior" rather than underlying improvement.
[en.wikipedia.org/wiki/Novelty_effect](https://en.wikipedia.org/wiki/Novelty_effect)

## Interaction effects (Step 4)

Microsoft ExP, "A/B Interactions: A Call to Relax": addresses A/B
interactions in concurrent experiment design alongside the pitfalls of
even tiny SRMs.
[microsoft.com/en-us/research/group/experimentation-platform-exp/articles/](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/)

Kohavi et al. (ISBN 9781108724265) categorise treatment spillover as a
stable unit treatment value assumption (SUTVA) violation.

## Simpson's paradox (Step 5)

Wikipedia, Simpson's paradox: "a trend appears in several groups of data
but disappears or reverses when the groups are combined." Canonical
Berkeley admissions example: men were admitted at higher aggregate rates
(44% vs 35%) while women had better odds in most individual departments,
because women applied to more competitive departments.
[en.wikipedia.org/wiki/Simpson%27s_paradox](https://en.wikipedia.org/wiki/Simpson%27s_paradox)

## Guardrails (Step 6)

Nielsen Norman Group: "if you measure only one metric to determine
whether your test is successful, you might disregard important
information."
[nngroup.com/articles/ab-testing/](https://www.nngroup.com/articles/ab-testing/)

## Companion catalogs

`ab-test-validity-checklist`; sibling references
[peeking.md](peeking.md) and [guardrails.md](guardrails.md).
