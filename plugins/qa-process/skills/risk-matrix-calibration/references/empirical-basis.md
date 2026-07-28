# Empirical basis for the signals

Deep reference for the `risk-matrix-calibration` SKILL.md, Step 1. The published results behind the "churn corroborates only" and "no imported coefficient" rules, with the caveats that keep each result honest. The spine states the rules declaratively; this file carries the evidence.

## Why density and not raw count

A raw defect count conflates "small area, few defects" with "stable area, few defects". Normalising by size, per the [ISTQB defect-density definition](https://glossary.istqb.org/en_US/term/defect-density), makes rows comparable to each other. Where lines of code are a poor size proxy (heavy generated code, config-driven modules), normalise by number of changes to the same paths instead, and say in the report which denominator you used.

## How much weight churn deserves

Churn is a corroborating signal, never the primary evidence for a rating change. The published relationship is real but narrow: Nagappan and Ball showed that "while absolute measures of code churn are poor predictors of defect density, our set of relative measures of code churn is highly predictive of defect density", with a metric suite that discriminated fault-prone from non-fault-prone binaries "with an accuracy of 89.0 percent" (ICSE 2005, https://www.microsoft.com/en-us/research/publication/use-of-relative-code-churn-measures-to-predict-system-defect-density/, record at https://openalex.org/W2100945416). Three limits on that result matter:

- It is a **correlation**, not a causal claim. Churn is a proxy for where work is happening, and work happens in areas that are being fixed, extended and reworked. High churn does not make code defective.
- The **relative** measures carried the result. Absolute churn, meaning a raw count of changed lines or commits, was explicitly reported as a poor predictor. Normalise churn by component size and by the length of the window before using it at all.
- The result is a **case study on one commercial system** (Windows Server 2003). Defect-prediction models built on one project transfer badly to another: Zimmermann et al. ran 622 cross-project predictions across 12 real-world applications and concluded that "simply using models from projects in the same domain or with the same process does not lead to accurate predictions" (ESEC/FSE 2009, DOI 10.1145/1595696.1595713, abstract at https://api.openalex.org/works/doi:10.1145/1595696.1595713, record at https://openalex.org/W25935857). Team and domain are confounds, so no published coefficient can be imported into your matrix. Use churn only to corroborate a direction that defect density already suggested.

## Why labelled bug-fix data is biased

Bird et al., examining bug-fix datasets across several projects, found that only a fraction of bug fixes are labelled in version histories and reported "strong evidence of systematic bias" in the resulting datasets, which threatens both prediction models built on them and hypotheses tested with them (ESEC/FSE 2009, https://www.cs.ucdavis.edu/~filkov/papers/biasbusters.pdf, record at https://www.microsoft.com/en-us/research/publication/fair-and-balanced-bias-in-bug-fix-datasets/). If your team labels defects by component inconsistently, the calibration inherits that inconsistency.
