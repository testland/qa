# DORA software delivery metrics - verbatim definitions

Executives increasingly hear DORA terms from engineering leadership, so use them
precisely. As of current guidance, DORA defines five software delivery metrics, evolved
"from the original four keys to the current five-metric model", grouped as throughput and
instability (https://dora.dev/guides/dora-metrics-four-keys/, fetched 2026-06-10).

## Throughput

- **Change lead time**: "the amount of time it takes for a change to go from committed to version control to deployed in production".
- **Deployment frequency**: "the number of deployments over a given period or the time between deployments".
- **Failed deployment recovery time**: "the time it takes to recover from a deployment that fails and requires immediate intervention".

## Instability

- **Change fail rate**: "the ratio of deployments that require immediate intervention following a deployment".
- **Deployment rework rate**: "the ratio of deployments that are unplanned but happen as a result of an incident in production".

## Notes for the narrative

- The original set was "the four keys"; failed deployment recovery time is the renamed recovery metric. If leadership still says "the four keys", name the rename rather than silently mixing old and new labels.
- Deployment frequency and change fail rate travel best into an exec narrative: they need only deployment records and incident flags. Change lead time and failed deployment recovery time depend on commit and incident conventions, so mark them partial rather than guessing.
- Escape-defect rate is a defect-leakage metric, not a DORA metric. Keep it beside the DORA figures, never inside them, or one informed exec follow-up sinks the room's trust.
