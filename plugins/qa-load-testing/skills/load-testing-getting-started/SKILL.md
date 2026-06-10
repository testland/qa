---
name: load-testing-getting-started
description: "Orients an engineer who is new to performance and load testing through the qa-load-testing plugin: explains the core metrics (throughput, latency percentiles, error rate), selects the right tool via the load-test-tool-selector agent, walks the first k6 script through to a passing threshold, adds a perf-budget-gate CI step, and routes failing results to latency-percentile-analyzer or perf-incident-responder. Use when an engineer new to performance or load testing does not know where to start in this plugin."
rating: 23
d6: 2
keywords:
  - getting-started
  - load-testing
  - k6
  - performance
  - onboarding
---

# load-testing-getting-started
[running]: https://grafana.com/docs/k6/latest/get-started/running-k6/
[thresholds]: https://grafana.com/docs/k6/latest/using-k6/thresholds/

Load testing measures how a system behaves under concurrent traffic. The three
metrics that matter first are **throughput** (requests per second the system
handles), **latency percentiles** (p95 and p99 measure tail response time - the
experience of your slowest users, not the average), and **error rate** (the
fraction of requests that fail). A passing average can hide a broken p99; always
gate on all three. If you are unsure which tool to use for your stack, invoke the
[`load-test-tool-selector`](../../agents/load-test-tool-selector.md) agent with
your language, infrastructure, and load profile - it returns a reasoned
recommendation before you write a single line.

## Step 1 - Write your first k6 script

k6 is the recommended starting point for most HTTP services. Install it via your
package manager (brew, apt, choco, Docker - see
[k6 installation](https://grafana.com/docs/k6/latest/set-up/install-k6/)), then
create `script.js` (per [k6-running][running]):

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95th-percentile latency under 500ms
    http_req_failed:   ['rate<0.01'],  // error rate under 1%
  },
};

export default function () {
  const res = http.get('https://your-service.example.com/health');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

Run it (per [k6-running][running]):

```bash
k6 run script.js
```

k6 prints a live progress table and a summary at the end. A threshold failure
exits non-zero - the CI gate signal (per [k6-thresholds][thresholds]).

## Step 2 - Understand the threshold output

The end-of-run summary reports each threshold as `ok` or `failed`
(per [k6-thresholds][thresholds]):

```
http_req_duration..........: p(95)=432ms   ✓ p(95)<500
http_req_failed............: rate=0.4%     ✓ rate<0.01
```

If either threshold fails, `k6 run` exits with a non-zero code. Adjust the
numeric budgets to match your service-level objectives, not arbitrary defaults.
The [`k6-load-testing`](../k6-load-testing/SKILL.md) skill covers stages
(ramp-up / plateau / ramp-down), `abortOnFail`, and advanced threshold
expressions in full.

## Step 3 - Add a CI gate with perf-budget-gate

Once your k6 thresholds are stable locally, add a CI step that fails the build
on regressions. The [`perf-budget-gate`](../perf-budget-gate/SKILL.md) skill
aggregates verdicts from k6 (and other runners) into a single go/no-go decision
with a delta vs the main-branch baseline - use it when you need a unified gate
across multiple test suites or want per-PR delta comments.

For a k6-only project, the threshold exit code is sufficient as the initial gate;
`perf-budget-gate` pays off once you add Lighthouse or a second load runner.

## Step 4 - When results look bad

If a threshold fails or the system feels slow despite passing thresholds:

- **High or unexpected tail latency:** use
  [`latency-percentile-analyzer`](../latency-percentile-analyzer/SKILL.md) to
  detect bimodal distributions, compute the tail ratio (p99/p50), and check for
  coordinated omission effects that make naive p99 values optimistic.
- **Active production incident or post-deploy regression:** use
  [`perf-incident-responder`](../../agents/perf-incident-responder.md) to
  confirm with k6, flame-graph the hot path, and check slow queries in one
  orchestrated flow.

## References

- [k6-running][running] - first script, VU model, stages, ad-hoc flags.
- [k6-thresholds][thresholds] - threshold syntax, aggregation methods,
  exit-code CI signal.
- [`k6-load-testing`](../k6-load-testing/SKILL.md) - full k6 authoring
  reference (stages, abortOnFail, CI YAML, anti-patterns).
- [`perf-budget-gate`](../perf-budget-gate/SKILL.md) - multi-runner CI gate.
- [`latency-percentile-analyzer`](../latency-percentile-analyzer/SKILL.md) -
  tail-latency diagnosis when thresholds pass but perf is suspect.
- [`load-test-tool-selector`](../../agents/load-test-tool-selector.md) -
  tool recommendation for your specific stack.
- [`perf-incident-responder`](../../agents/perf-incident-responder.md) -
  on-call orchestrator for active perf incidents.
