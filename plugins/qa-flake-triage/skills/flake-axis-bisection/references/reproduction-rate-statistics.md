# Reproduction-rate statistics: sizing N, intervals, and comparisons

Deep reference for `flake-axis-bisection` SKILL.md. Consult for the lookup
tables and derivations behind choosing N (Step 2) and deciding whether two
counts differ by more than sampling noise (Step 5).

## Choosing N: the binomial arithmetic

If a test truly fails with probability `p` on each run, and runs are
independent, the chance that N runs produce zero failures is `(1 - p)^N`
(the binomial zero-event probability, the same starting point used to derive
the rule of three, [Rule of three
(statistics)](<https://en.wikipedia.org/wiki/Rule_of_three_(statistics)>)).
Solving `(1 - p)^N = 0.05` gives the N at which you have a 95% chance of
seeing at least one failure:

| True rate p | Chance of zero failures at N=20 | N for a 95% chance of at least one failure |
|---|---|---|
| 10% | `0.90^20` = 12% | 29 |
| 5% | `0.95^20` = 36% | 59 |
| 2% | `0.98^20` = 67% | 149 |
| 1% | `0.99^20` = 82% | 299 |

Read the middle column before committing to N=20. A test that really fails
5% of the time shows a clean 0/20 more than a third of the time. N=20 is a
*screening* depth, adequate to separate a roughly 40% flake from a roughly
5% flake, and not adequate to separate 5% from 10%: at N=20 those two rates
predict 1 and 2 failures respectively, and both are routinely observed as 0,
1, 2, or 3.

## Confidence interval on a measured rate (Wilson)

`k/N` is a point estimate of a proportion. Attach a confidence interval to
it. The Wilson interval, recommended "for virtually all combinations of n
and p", is the standard choice ([NIST/SEMATECH e-Handbook, Confidence
intervals for a
proportion](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm)).
Computed 95% Wilson intervals for the counts that come up most often:

| Observed | Point estimate | 95% Wilson interval |
|---|---|---|
| 0/20 | 0% | 0% to 16.1% |
| 1/20 | 5% | 0.9% to 23.6% |
| 2/20 | 10% | 2.8% to 30.1% |
| 4/20 | 20% | 8.1% to 41.6% |
| 10/20 | 50% | 29.9% to 70.1% |
| 0/50 | 0% | 0% to 7.1% |
| 2/50 | 4% | 1.1% to 13.5% |
| 10/50 | 20% | 11.2% to 33.0% |
| 0/100 | 0% | 0% to 3.7% |
| 2/100 | 2% | 0.6% to 7.0% |
| 10/100 | 10% | 5.5% to 17.4% |

The 1/20 and 2/20 rows are the whole warning in two lines. Their intervals
overlap across almost their entire width. A sweep that reports "5% baseline,
10% under randomized order" has measured nothing.

## Comparing two variations (two-proportion z)

For baseline `x1/n1` against a variation `x2/n2`, the two-proportion test
statistic with a pooled proportion is
`z = (p1 - p2) / sqrt(p(1-p)(1/n1 + 1/n2))` where `p = (x1+x2)/(n1+n2)`, and
a two-sided decision compares `|z|` against the normal table value
`z(1-alpha/2)` ([NIST/SEMATECH e-Handbook, Comparing two
proportions](https://www.itl.nist.gov/div898/handbook/prc/section3/prc33.htm)).
At alpha = 0.05 that threshold is 1.96. The handbook notes Fisher's exact
test as the alternative when samples are small.

Worked comparisons, all against a 3/20 baseline unless stated:

| Variation result | z | Verdict at 1.96 |
|---|---|---|
| 17/20 (network constrained) | 4.43 | Implicated. Strong. |
| 14/20 versus a 0/20 alone-run | 4.64 | Implicated. Strong. |
| 8/20 (4 workers), versus 2/20 at 1 worker | 2.19 | Implicated. Marginal: re-measure deeper. |
| 6/20 (narrow viewport) | 1.14 | Not distinguishable from noise. |
| 4/20 (animations enabled) | 0.42 | Noise. |
| 2/20 (network constrained) | -0.48 | Noise. |

Look hard at the 6/20 row. That is a doubling of the observed rate, 15% to
30%, and it does not clear the threshold at N=20. Any screening rule phrased
as "a relative change above 2x implicates the axis" is a practitioner
convention for deciding *which axis to re-measure*, not a finding. Treat a
2x screening hit as a shortlist entry, re-run that axis and the baseline at
higher N, and only then apply the z rule.
