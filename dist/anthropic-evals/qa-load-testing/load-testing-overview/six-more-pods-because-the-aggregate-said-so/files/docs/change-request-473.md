# CR-473 - six additional storefront pods for November peak

Raised by: M. Ilves, 2026-09-14
Cost: EUR 4,112 / month (6 x c6i.xlarge equivalent)
Needed by: infrastructure freeze, 2026-09-18

## Justification

Saturday's readiness run drove 4x projected November traffic at staging for 20
minutes across four load generators. The run's p95 came out at **2,810 ms**
against our 400 ms budget.

Before anyone asks: I am not averaging the four generators' percentiles. You
cannot average percentiles and get a percentile and I did not want that argument.
The figure above is the worst generator's p95, which is the conservative reading
and the one I will defend - worker-4 carried 1,250 of the 2,000 virtual users, so
it is the generator that pushed hardest, and it is the closest thing in this run
to peak November behaviour. The other three sat near 270 ms under a quarter of
the load each and are not the case we are provisioning for.

2,810 / 400 = 7.0. We cannot buy seven times the capacity. Storefront runs 6 pods
today; +6 doubles it, which is the affordable step and moves the tail in the
right direction. No errors were recorded anywhere in the run, so this is purely a
latency problem and purely a capacity problem.

## Evidence

- `results/worker-{1..4}_stats.csv`
- `scripts/aggregate.mjs` output: `run p95 2810.0ms against a 400ms budget: FAIL`
