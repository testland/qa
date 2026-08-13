# qa-load-testing

Load and performance testing: k6 and JMeter runners (Gatling and Locust deep dives inside the overview umbrella); Lighthouse CI for Web Vitals with budget authoring; deep INP interaction budgets; perf budget gate; flame-graph analyzer; DB slow-query detector; SLO-derived load-test planning.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [load-testing-overview](skills/load-testing-overview/SKILL.md) | Entry point: tool-selection table, the six load profiles, open vs closed workload models, a first k6 run + threshold, the performance-incident triage workflow, and Gatling / Locust deep dives in references. |
| Skill | [k6-load-testing](skills/k6-load-testing/SKILL.md) | Author k6 JavaScript load tests with stages + thresholds; CI gate via `k6 run` exit code; latency-percentile interpretation (tail ratio, coordinated omission) in references. |
| Skill | [jmeter-load-testing](skills/jmeter-load-testing/SKILL.md) | Run `.jmx` test plans via `jmeter -n -t` CLI; HTML dashboard via `-e -o`; JTL parsing for CI gates. |
| Skill | [lighthouse-perf](skills/lighthouse-perf/SKILL.md) | Lighthouse CI for Web Vitals (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1) at 75th percentile; per-PR assertions + reports; per-route budget authoring in references. |
| Skill | [web-vitals-inp-deep](skills/web-vitals-inp-deep/SKILL.md) | Deep INP testing: decompose input delay / processing / presentation via web-vitals attribution; per-interaction INP budgets in Playwright; long-task detection. |
| Skill | [perf-budget-gate](skills/perf-budget-gate/SKILL.md) | Aggregate k6 / JMeter / Gatling / Locust / Lighthouse verdicts into a unified go/no-go gate with delta vs baseline. |
| Skill | [flame-graph-analyzer](skills/flame-graph-analyzer/SKILL.md) | Read py-spy / async-profiler / pprof / clinic.js folded stacks; classify CPU-bound / GC / lock-contention; propose remediation. |
| Skill | [db-query-plan-analyzer](skills/db-query-plan-analyzer/SKILL.md) | Read `EXPLAIN ANALYZE`; identify dominant cost (seq-scan / sort spill / nested loop); propose specific index or rewrite. |
| Skill | [slo-load-test-plan](skills/slo-load-test-plan/SKILL.md) | Turns SLOs and an endpoint traffic mix into a named scenario matrix: a load profile and injection model per scenario, SLO-derived threshold expressions, and an error-budget-sized soak allowance. |

Perf regressions are bisected by the `regression-bisector` agent (qa-flake-triage) in its perf-measurement mode.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-load-testing@testland-qa
```
