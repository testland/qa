# DORA software delivery metrics - verbatim definitions

DORA measures software delivery performance. Its current guidance documents five metrics,
described as having evolved "from the original four keys to the current five-metric model",
grouped as throughput and instability (https://dora.dev/guides/dora-metrics-four-keys/,
verified 2026-07-19).

## Throughput

- **Change lead time** (originally "lead time for changes"): "The amount of time it takes for a change to go from committed to version control to deployed in production."
- **Deployment frequency**: "The number of deployments over a given period or the time between deployments."
- **Failed deployment recovery time**: "The time it takes to recover from a deployment that fails and requires immediate intervention."

## Instability

- **Change fail rate** (originally "change failure rate"): "The ratio of deployments that require immediate intervention following a deployment."
- **Deployment rework rate**: "The ratio of deployments that are unplanned but happen as a result of an incident in production."

## Which figures the digest can compute

- **Deployment frequency** and **change fail rate** are usually computable from the same CI data the digest already reads; include them as delivery context in their own section and carry them into the portfolio roll-up. They also survive cross-team comparison best, needing only deployment records and incident flags.
- **Change lead time** and **failed deployment recovery time** need commit timestamps and incident records, so mark them partial rather than guessing, and never report an estimate as computed.
- Escape-defect rate, pass rate, and flake debt are **not** DORA metrics; they measure defect leakage and suite health, not delivery. Keep them beside the DORA figures, never inside them: a single informed reader will catch the conflation.
