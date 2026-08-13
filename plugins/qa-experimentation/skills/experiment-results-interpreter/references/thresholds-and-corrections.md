# Guardrail thresholds and multiple-comparison correction

Deep reference for [guardrails.md](guardrails.md). Consult when
setting per-metric alert/block levels and correcting alpha across the
OEC + N guardrails.

## Setting guardrail thresholds

A guardrail typically has two levels:

| Threshold | What |
|---|---|
| **Alert** | A statistically significant degradation; investigate before ship |
| **Block** | A degradation past a pre-declared limit; ship-decision flips to "no" |

Example for API latency p95:

| Level | Threshold |
|---|---|
| Alert | Any statistically significant increase |
| Block | > 10% increase OR > 50ms absolute increase, whichever is greater |

The "whichever is greater" handles fast endpoints where 10% is
trivially small in absolute terms.

## Multiple-comparison correction

With one OEC + N guardrails (typically 10-20), a fixed-alpha
significance test means you'll see N×0.05 false positives on
average. Per Kohavi et al., apply Bonferroni or Benjamini-
Hochberg correction:

| Method | When |
|---|---|
| Bonferroni | Strict; alpha / N. Use when missing a true regression is catastrophic |
| Benjamini-Hochberg (FDR) | Less strict false-discovery-rate control; use for general guardrail dashboards |

## Reference

- Kohavi, Tang, Xu. *Trustworthy Online Controlled Experiments*
  (Cambridge University Press, 2020). ISBN 978-1108724265.
