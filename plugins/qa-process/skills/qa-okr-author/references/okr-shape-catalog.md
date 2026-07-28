# QA-OKR shape catalog

Deep reference for the `qa-okr-author` SKILL.md, Step 2. Five canonical QA Objective shapes (catalog, not prescription). Each maps to a measurable KR family with its baseline source. The manager picks 1 - 3; the skill drafts the KRs. Other Objective shapes are valid; these are the most-cited in QA-manager-facing literature.

## Shape 1 - Strengthen the test pyramid

Anchored on `test-pyramid-balancer`. Used when the suite is E2E-heavy and shifting weight downward improves cycle time + maintainability.

| KR axis | Example KR | Baseline source |
|---|---|---|
| Layer ratio | unit:integration:E2E reaches 70:20:10 | current ratio per `test-pyramid-balancer` |
| Cycle time | regression suite duration < 45 min per shard | current per `test-run-summary-author` |
| E2E suite budget | E2E test count ≤ 200, growth rate ≤ 5/quarter | `e2e-suite-budget` |

## Shape 2 - Reduce escape-defect rate

Anchored on the defect-trend baseline. Used when production defects are above the team's tolerance.

| KR axis | Example KR | Baseline source |
|---|---|---|
| Volume | P1 escapes < 2/quarter; P2 escapes < 10/quarter | current per the defect-trend quarterly report |
| Time-to-detect | MTTD on P1 < 4 hours | per `mttr-mtbf-tracker` |
| Category-specific | regression-class escapes -50% WoW | per defect clustering + the defect-trend report |

## Shape 3 - Cut regression cycle time

Anchored on `test-run-summary-author`. Used when CI is the bottleneck.

| KR axis | Example KR | Baseline source |
|---|---|---|
| Wall-clock | regression suite < 60 min per shard, 4× parallel | `test-run-summary-author` |
| Parallelisation | sharding factor ≥ 8 with no shard >90 min | CI config + `test-run-summary-author` |
| CI cost | per-PR CI cost -30% via TIA | `regression-suite-selector` |

## Shape 4 - Reduce flake-budget consumption

Anchored on flake-detection + `flaky-test-quarantine`. Used when flake rate is above the team's tolerance (below 5% flake rate is aspirational, under 10% a reasonable committed bar; [Google Testing Blog](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)).

| KR axis | Example KR | Baseline source |
|---|---|---|
| Quarantine ceiling | quarantine list ≤ 5 at any point | current per `flaky-test-quarantine` |
| Flake rate | flake rate < 3% of CI runs (vs 8% current baseline) | per the flake-detection weekly history |
| Repair velocity | mean time-to-repair on quarantined test < 5 days | per `flaky-test-quarantine` |

## Shape 5 - Close compliance evidence gaps

Anchored on compliance-readiness review. Used in regulated industries (healthcare, finance, automotive).

| KR axis | Example KR | Baseline source |
|---|---|---|
| Per-control coverage | SOC 2 Trust Service Criteria coverage ≥ 95% | the compliance-readiness review |
| Evidence freshness | every control's evidence ≤ 90 days old | `soc2-evidence-collector` |
| Audit pass-rate | external audit findings ≤ 3, no high-severity | prior audit history |
