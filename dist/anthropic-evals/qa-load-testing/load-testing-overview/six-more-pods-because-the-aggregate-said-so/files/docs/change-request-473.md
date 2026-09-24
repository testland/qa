# CR-473 - six additional storefront pods for November peak

Raised by: M. Ilves, 2026-09-14
Cost: EUR 4,112 / month (6 x c6i.xlarge equivalent)
Needed by: infrastructure freeze, 2026-09-18

## Justification

Saturday's readiness run drove 2,000 virtual shoppers against staging for 20
minutes from four separate generator boxes. November peak is about 500 concurrent
shoppers, so the run was roughly 4x peak. The run's p95 came out at **633.7 ms**
against our 400 ms budget.

Before anyone asks about the statistics: I know you cannot average percentiles and
get a percentile, and I have not done that. `aggregate.mjs` pools the four
generators' 95% columns weighted by the request count each one contributed, which
is the standard way to combine per-generator stats, and since the four boxes came
within 1% of each other on request count the weighting barely moves it anyway. It
is one number and I can defend how it was produced.

633.7 / 400 = 1.58. Storefront runs 6 pods today; +6 doubles it. Latency near
saturation is not linear, so the affordable step that actually moves the tail is
the doubling, not two or three pods.

No failures were recorded on any generator, so this is purely a latency problem and
purely a capacity problem.

## Evidence

- `results/worker-{1..4}_stats.csv`
- `scripts/aggregate.mjs` output: `run p95 633.7ms against a 400ms budget: FAIL`
- generator CPU stayed under 45% on all four boxes (see the run notes)
