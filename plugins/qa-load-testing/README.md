# qa-load-testing

Load and performance testing: k6, JMeter, Gatling, Locust runners; Lighthouse CI for Web Vitals; perf budget gate; flame-graph analyzer; DB slow-query detector; perf regression bisector.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [k6-load-testing](skills/k6-load-testing/SKILL.md) | Author k6 JavaScript load tests with stages + thresholds; CI gate via `k6 run` exit code. |
| Skill | [jmeter-load-testing](skills/jmeter-load-testing/SKILL.md) | Run `.jmx` test plans via `jmeter -n -t` CLI; HTML dashboard via `-e -o`; JTL parsing for CI gates. |
| Skill | [gatling-load-testing](skills/gatling-load-testing/SKILL.md) | Author Gatling Simulation classes (Java/Kotlin/Scala/JS); `injectOpen` vs `injectClosed`; setUp().assertions() as the CI gate. |
| Skill | [locust-load-testing](skills/locust-load-testing/SKILL.md) | Author Python locustfile.py with HttpUser + @task; run headless with `--users` / `--spawn-rate`; CSV / HTML reports for CI gates. |
| Skill | [lighthouse-perf](skills/lighthouse-perf/SKILL.md) | Lighthouse CI for Web Vitals (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1) at 75th percentile; per-PR assertions + reports. |
| Skill | [perf-budget-gate](skills/perf-budget-gate/SKILL.md) | Aggregate k6 / JMeter / Gatling / Locust / Lighthouse verdicts into a unified go/no-go gate with delta vs baseline. |
| Skill | [lighthouse-budget-author](skills/lighthouse-budget-author/SKILL.md) | Draft `.lighthouserc.js` per-route LCP/INP/CLS thresholds + `budget.json` resource-size caps at design time. |
| Skill | [flame-graph-analyzer](skills/flame-graph-analyzer/SKILL.md) | Read py-spy / async-profiler / pprof / clinic.js folded stacks; classify CPU-bound / GC / lock-contention; propose remediation. |
| Skill | [db-slow-query-detector](skills/db-slow-query-detector/SKILL.md) | Read `EXPLAIN ANALYZE`; identify dominant cost (seq-scan / sort spill / nested loop); propose specific index or rewrite. |
| Agent | [perf-regression-bisector](agents/perf-regression-bisector.md) | `git bisect run` against a per-commit perf measurement (k6 / Lighthouse); hand off culprit to flame-graph or db-slow-query analysis. |
| Agent | [load-test-tool-selector](agents/load-test-tool-selector.md) | Reads project stack + load-testing goal (RPS profile, soak duration, browser-side metrics, CI gating) and recommends one tool from k6 / JMeter / Gatling / Locust / Lighthouse. Refuses when goal lacks a concrete load profile. Sibling of qa-mutation-testing/mutation-tool-selector. |
| Agent | [perf-incident-responder](agents/perf-incident-responder.md) | On-call perf-incident orchestrator: confirm with k6, flame-graph the hot path, check slow queries, localize the cause. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-load-testing@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
