---
name: failure-injection-test-author
description: "Build-an-X workflow that combines WireMock fault stubs (HTTP-level fault: 500s, malformed JSON, slow responses) with Toxiproxy (TCP-level: latency, packet loss, reset) into one orchestrated test scenario - the test starts both, applies fault per scenario, runs the SUT against the impaired endpoints, verifies the SUT''''s resilience patterns. Use when neither pure HTTP fault stubs nor pure TCP chaos covers the actual production failure modes - most real failures span both layers."
---

# failure-injection-test-author

## Overview

Real production failures span layers:

- **HTTP layer:** Stripe returns 500; webhook payload malformed;
  third-party times out.
- **TCP layer:** Connection reset; high latency; packet loss.

A test using **only** WireMock (HTTP fault stubs) misses TCP-level
chaos. A test using **only** Toxiproxy misses payload-level
faults. Production failures combine both.

This skill builds a workflow that **chains WireMock + Toxiproxy**
into one orchestrated test scenario - closer to production
reality.

## When to use

- A resilience test must verify behavior under both HTTP and TCP
  faults.
- An incident postmortem identified a "TCP reset followed by
  malformed retry response" failure mode that single-tool tests
  can't reproduce.
- A team running combined integration + chaos testing wants a
  single test pattern.

For pure HTTP fault stubs, see
[`wiremock-stubs`](../../../qa-test-data/skills/wiremock-stubs/SKILL.md).
For pure TCP chaos, see [`toxiproxy-chaos`](../toxiproxy-chaos/SKILL.md).

## Step 1 - Topology

```
[ SUT (App) ] → [ Toxiproxy ] → [ WireMock ] → (returns canned response or 500)
       ↓                ↓                ↓
   resilience       network chaos    HTTP fault stub
   patterns         (latency, etc)   (500, malformed JSON, etc)
```

The SUT connects to Toxiproxy; Toxiproxy forwards to WireMock;
WireMock returns the configured response. The combined chain
exercises both layers.

## Step 2 - docker-compose setup

```yaml
# docker-compose.test.yml
services:
  wiremock:
    image: wiremock/wiremock:3
    ports: ["8081:8080"]
    volumes:
      - ./wiremock-mappings:/home/wiremock/mappings

  toxiproxy:
    image: ghcr.io/shopify/toxiproxy:latest
    ports:
      - "8474:8474"
      - "8080:8080"     # what the SUT connects to

  app:
    build: .
    environment:
      EXTERNAL_API_URL: http://toxiproxy:8080
```

The SUT's `EXTERNAL_API_URL` points at Toxiproxy:8080; Toxiproxy
forwards to wiremock:8080.

## Step 3 - Configure the proxy

Once both containers are up:

```bash
# Tell Toxiproxy where to forward
curl -d '{"name":"external-api","listen":"0.0.0.0:8080","upstream":"wiremock:8080"}' \
  http://toxiproxy:8474/proxies
```

## Step 4 - Per-scenario test setup

```typescript
// tests/resilience.spec.ts
import { Toxiproxy } from 'toxiproxy-node-client';
import axios from 'axios';

const toxiproxy = new Toxiproxy('http://toxiproxy:8474');
const wiremockBase = 'http://wiremock:8080';

beforeEach(async () => {
  // Reset both
  await axios.delete(`${wiremockBase}/__admin/mappings`);
  const proxy = await toxiproxy.get('external-api');
  for (const toxic of await proxy.toxics()) {
    await proxy.removeToxic(toxic.name);
  }
});

test('SUT retries on TCP reset followed by 500 then succeeds', async () => {
  // 1. Stub WireMock: first call returns 500, second returns 200
  await axios.post(`${wiremockBase}/__admin/mappings`, {
    request: { method: 'GET', url: '/api/orders/1' },
    response: { status: 500 },
    priority: 1,
    scenarioName: 'retry-test',
    requiredScenarioState: 'Started',
    newScenarioState: 'after-first',
  });
  await axios.post(`${wiremockBase}/__admin/mappings`, {
    request: { method: 'GET', url: '/api/orders/1' },
    response: { status: 200, jsonBody: { id: 1, status: 'fulfilled' } },
    priority: 2,
    scenarioName: 'retry-test',
    requiredScenarioState: 'after-first',
  });

  // 2. Configure Toxiproxy: reset_peer toxic
  const proxy = await toxiproxy.get('external-api');
  await proxy.addToxic({
    name: 'reset-on-first-byte',
    type: 'reset_peer',
    attributes: { timeout: 0 },
  });

  // 3. Trigger SUT
  const result = await sut.fetchOrder(1);

  // 4. Assert: SUT recovered after retry
  expect(result).toEqual({ id: 1, status: 'fulfilled' });

  // 5. Verify the WireMock log shows 2 attempts
  const requests = await axios.get(`${wiremockBase}/__admin/requests`);
  expect(requests.data.requests).toHaveLength(2);
});
```

The test verifies: SUT made 2 calls (per WireMock log) and the
second succeeded - the retry pattern works under TCP-reset +
HTTP-500 combined fault.

## Step 5 - Scenario catalog

Common scenarios:

| Scenario name             | TCP toxic           | HTTP fault             | Verifies                         |
|---------------------------|---------------------|------------------------|----------------------------------|
| Slow + 500                 | latency 2000ms      | 500 status             | Retry honors timeout + retry-on-5xx |
| Reset + retry success      | reset_peer (1 hit)  | 200 (next call)        | Retry handles connection reset    |
| Slow body                  | bandwidth 1KB/s    | 200 with large payload | Read timeout fires                |
| Malformed JSON              | (none)              | 200 + invalid JSON     | Parser handles gracefully         |
| Cascade: timeout + 503     | timeout 5000ms     | 503                    | Circuit breaker opens after N timeouts |
| Network partition           | timeout (forever)   | (n/a)                  | Fallback to cached / null         |

## Step 6 - Verdict

Each scenario produces a per-resilience-pattern verdict:

```markdown
## Failure injection results - `<sha>`

| Scenario              | SUT behavior                            | Verdict |
|-----------------------|-----------------------------------------|---------|
| Slow + 500             | Retried 3 times; succeeded on 3rd        |   ✅    |
| Reset + retry success  | Retried; succeeded                       |   ✅    |
| Slow body              | Read timeout at 5s; aborted               |   ✅    |
| Malformed JSON          | ParseError thrown; defaulted to empty    |   ✅    |
| Cascade: timeout + 503 | Circuit breaker opened after 3 timeouts  |   ✅    |
| Network partition       | Fell back to cached value                 |   ⚠ partial - fallback returned stale > 1h |
```

## Step 7 - CI integration

```yaml
- run: docker compose -f docker-compose.test.yml up --wait --wait-timeout 120
- run: npx jest tests/resilience.spec.ts
- run: docker compose -f docker-compose.test.yml down --volumes
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Mocking the HTTP client instead of using WireMock                      | Mock can't simulate TCP-level faults.                                     | Real Toxiproxy + WireMock chain (Step 1). |
| Forgetting to reset toxics + stubs between tests                       | Cross-test contamination.                                                 | `beforeEach` reset (Step 4). |
| Single-scenario tests (just 500, no TCP)                               | Real failures combine layers; single-layer tests miss them.              | Author scenarios spanning both layers (Step 5). |
| Per-test docker-compose up / down                                       | Slow; per-test setup overhead.                                            | Per-suite docker-compose up (Step 7). |
| Not verifying the WireMock request log                                  | Test passes even if SUT didn't actually retry (just got lucky).          | Assert on `__admin/requests` count (Step 4 example). |

## Limitations

- **Setup complexity.** Two containers + control APIs + scenario
  state. Not lightweight.
- **TCP-only chaos via Toxiproxy.** UDP / QUIC / DNS-level
  failures need different tools.
- **HTTP fault realism via WireMock.** Some payload-level faults
  (binary protocol corruption) need custom tooling.
- **Doesn't replace production chaos.** This is integration-test
  chaos; production chaos engineering is separate (per
  [`chaos-experiment-author`](../chaos-experiment-author/SKILL.md)).

## References

- [`wiremock-stubs`](../../../qa-test-data/skills/wiremock-stubs/SKILL.md) - HTTP fault stub primitive this skill orchestrates.
- [`toxiproxy-chaos`](../toxiproxy-chaos/SKILL.md) - TCP-level
  fault primitive this skill orchestrates.
- [`api-chaos-runner`](../../../qa-api-testing/skills/api-chaos-runner/SKILL.md) - sister: pure Toxiproxy + test-suite matrix.
- [`chaos-experiment-author`](../chaos-experiment-author/SKILL.md) - methodology for the chaos-experiment shape.
