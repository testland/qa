# qa-load-testing

Load and performance testing: k6, JMeter, Gatling, Locust runners; Lighthouse CI for Web Vitals; perf budget gate; flame-graph analyzer; DB slow-query detector; perf regression bisector.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [k6-load-testing](skills/k6-load-testing/SKILL.md) | S1 | Author k6 JavaScript load tests with stages + thresholds; CI gate via `k6 run` exit code. |
| skill | [jmeter-load-testing](skills/jmeter-load-testing/SKILL.md) | S1 | Run `.jmx` test plans via `jmeter -n -t` CLI; HTML dashboard via `-e -o`; JTL parsing for CI gates. |
| skill | [gatling-load-testing](skills/gatling-load-testing/SKILL.md) | S1 | Author Gatling Simulation classes (Java/Kotlin/Scala/JS); `injectOpen` vs `injectClosed`; setUp().assertions() as the CI gate. |
| skill | [locust-load-testing](skills/locust-load-testing/SKILL.md) | S1 | Author Python locustfile.py with HttpUser + @task; run headless with `--users` / `--spawn-rate`; CSV / HTML reports for CI gates. |

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
