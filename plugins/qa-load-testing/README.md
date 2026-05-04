# qa-load-testing

Load and performance testing: k6, JMeter, Gatling, Locust runners; Lighthouse CI for Web Vitals; perf budget gate; flame-graph analyzer; DB slow-query detector; perf regression bisector.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [k6-load-testing](skills/k6-load-testing/SKILL.md) | S1 | Author k6 JavaScript load tests with stages + thresholds; CI gate via `k6 run` exit code. |
| skill | [jmeter-load-testing](skills/jmeter-load-testing/SKILL.md) | S1 | Run `.jmx` test plans via `jmeter -n -t` CLI; HTML dashboard via `-e -o`; JTL parsing for CI gates. |
| skill | [gatling-load-testing](skills/gatling-load-testing/SKILL.md) | S1 | Author Gatling Simulation classes (Java/Kotlin/Scala/JS); `injectOpen` vs `injectClosed`; setUp().assertions() as the CI gate. |
| skill | [locust-load-testing](skills/locust-load-testing/SKILL.md) | S1 | Author Python locustfile.py with HttpUser + @task; run headless with `--users` / `--spawn-rate`; CSV / HTML reports for CI gates. |
| skill | [lighthouse-perf](skills/lighthouse-perf/SKILL.md) | S1 | Lighthouse CI for Web Vitals (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1) at 75th percentile; per-PR assertions + reports. |
| skill | [perf-budget-gate](skills/perf-budget-gate/SKILL.md) | S3 | Aggregate k6 / JMeter / Gatling / Locust / Lighthouse verdicts into a unified go/no-go gate with delta vs baseline. |
| skill | [lighthouse-budget-author](skills/lighthouse-budget-author/SKILL.md) | S3 | Draft `.lighthouserc.js` per-route LCP/INP/CLS thresholds + `budget.json` resource-size caps at design time. |
| skill | [flame-graph-analyzer](skills/flame-graph-analyzer/SKILL.md) | S3 | Read py-spy / async-profiler / pprof / clinic.js folded stacks; classify CPU-bound / GC / lock-contention; propose remediation. |
| skill | [db-slow-query-detector](skills/db-slow-query-detector/SKILL.md) | S3 | Read `EXPLAIN ANALYZE`; identify dominant cost (seq-scan / sort spill / nested loop); propose specific index or rewrite. |
| agent | [perf-regression-bisector](agents/perf-regression-bisector.md) | A1 | `git bisect run` against a per-commit perf measurement (k6 / Lighthouse); hand off culprit to flame-graph or db-slow-query analysis. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-load-testing@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
