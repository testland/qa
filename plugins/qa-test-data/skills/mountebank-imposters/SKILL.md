---
name: mountebank-imposters
description: "Authors Mountebank imposters (multi-protocol mock servers - HTTP, HTTPS, TCP, SMTP, LDAP, gRPC, WebSockets, GraphQL, and more) by POSTing JSON definitions to the Mountebank control API on port 2525, configures stubs with predicates and responses, and uses record-playback proxy mode to capture upstream traffic. Use when the project needs a multi-protocol mock server beyond HTTP-only tools like WireMock or MSW."
---

# mountebank-imposters

## Overview

Mountebank is a multi-protocol service-virtualization tool - 
"the only open source service virtualization tool that competes
with the commercial offerings in terms of protocol diversity,
capability, and performance" ([mountebank-readme][readme]).

[readme]: https://github.com/bbyars/mountebank

Per [mountebank-readme][readme], supported protocols include:

- HTTP / HTTPS
- TCP (text and binary)
- SMTP
- LDAP
- gRPC
- WebSockets
- GraphQL
- SNMP
- Telnet / SSH
- NETCONF

> **Source-fetch note (2026-05-04):** the canonical Mountebank
> documentation domain `mbtest.org` was hijacked / redirects to an
> unrelated football-club site (`farsleyceltic.com`) as of
> verification on this date. This skill cites the GitHub repository
> [bbyars/mountebank][readme] as the authoritative source instead;
> `mbtest.dev` is the project's current alternate documentation
> domain per the upstream organization. Verify both URLs before
> linking from authored content.

## When to use

- The project mocks **non-HTTP** protocols (TCP, SMTP, LDAP, gRPC).
  WireMock and MSW are HTTP-only; Mountebank covers the long tail.
- The team wants **record-playback proxying** - Mountebank can
  proxy to a real upstream during recording, then replay the
  captured responses in subsequent test runs.
- The team needs **JavaScript injection** for dynamic response
  computation per request.

If the team is HTTP-only on the JVM, `wiremock-stubs`
is the lighter fit. For Node / browser HTTP-only, use
`msw-handlers`. Mountebank's strength
is multi-protocol breadth; pay the operational cost (a separate
process, port 2525) only when you need it.

## How to use

1. Start Mountebank (`mb start` or the Docker image); the control API listens on port 2525.
2. POST a JSON imposter to `/imposters` with a `port`, a `protocol`, and one or more `stubs`.
3. Give each stub `predicates` (path / method / header / body matchers) and `responses` (the reply to send).
4. Point the system under test at the imposter's port and run the tests.
5. For an unrecorded upstream, use a `proxyOnce` proxy response to capture real traffic, then replay offline.
6. `DELETE /imposters/<port>` in teardown (or restart Mountebank) so stale stubs don't leak between runs.

## Install

```bash
npm install -g @mbtest/mountebank
```

(Per [mountebank-readme][readme].)

For Docker-based CI (preferred for runner cleanliness):

```bash
docker run --rm -p 2525:2525 -p 4545:4545 bbyars/mountebank:latest start
```

The control API listens on **port 2525**; imposter ports (`4545`
in the example) are configured per imposter.

## Authoring imposters

Mountebank's data model uses these layers:

| Layer       | Purpose                                                                            |
|-------------|------------------------------------------------------------------------------------|
| **Imposter** | One mock server bound to a port and protocol.                                     |
| **Stub**     | A request matcher attached to an imposter - the response triggered when matched.  |
| **Predicate**| A condition on the incoming request (path, method, header, body, JSON path).      |
| **Response** | The reply Mountebank sends when a stub's predicates match.                        |

### Create an HTTP imposter

POST to the control API:

```bash
curl -X POST http://localhost:2525/imposters \
  -H 'Content-Type: application/json' \
  -d '{
    "port": 4545,
    "protocol": "http",
    "stubs": [{
      "predicates": [{
        "and": [
          { "equals": { "method": "GET", "path": "/orders/42" } }
        ]
      }],
      "responses": [{
        "is": {
          "statusCode": 200,
          "headers": { "Content-Type": "application/json" },
          "body": "{\"order_id\": 42, \"status\": \"shipped\"}"
        }
      }]
    }]
  }'
```

After this POST, `GET http://localhost:4545/orders/42` returns the
stubbed response.

### Predicate operators

Beyond `equals`, Mountebank offers `deepEquals`, `contains`,
`startsWith` / `endsWith`, `matches` (regex), `exists`, the boolean
`not` / `or` / `and`, and `inject` for a custom JavaScript predicate.
Full operator table:
[references/predicates-and-proxying.md](references/predicates-and-proxying.md).

### Multi-stub responses (cycle through)

If a stub has multiple responses, Mountebank cycles through them in
order on subsequent matching requests:

```json
{
  "stubs": [{
    "predicates": [{ "equals": { "method": "GET", "path": "/poll" } }],
    "responses": [
      { "is": { "statusCode": 202 } },
      { "is": { "statusCode": 202 } },
      { "is": { "statusCode": 200, "body": "DONE" } }
    ]
  }]
}
```

Three calls: 202, 202, 200, then it cycles back. Useful for
modeling polling endpoints.

### Proxying for record-playback

Point an imposter's response at a real upstream with a `proxy` block.
`proxyOnce` records the first response as a stub then replays it,
`proxyAlways` records every call, and `proxyTransparent` passes
through without recording. The record-playback config and the full
mode table are in
[references/predicates-and-proxying.md](references/predicates-and-proxying.md).

## Test framework integration

For Node.js test suites, use the `mountebank` npm package
programmatically:

```javascript
import mb from 'mountebank';

const mbServer = await mb.create({ port: 2525, allowInjection: true });

// POST imposter via fetch / axios / the mb client lib
await fetch('http://localhost:2525/imposters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ port: 4545, protocol: 'http', stubs: [...] }),
});

// Run tests against http://localhost:4545

// Tear down
await fetch('http://localhost:2525/imposters/4545', { method: 'DELETE' });
await mbServer.close();
```

## CI integration

```yaml
# .github/workflows/integration.yml
- name: Start Mountebank
  run: |
    npx -p @mbtest/mountebank mb start &
    npx wait-on http://localhost:2525

- name: Seed imposters
  run: bash scripts/seed-mountebank.sh

- run: npm test

- name: Stop Mountebank
  if: always()
  run: pkill -f 'mountebank' || true
```

For a more robust pattern, run Mountebank in Docker as a sidecar
service rather than a background process - kills + cleanup are
cleaner.

## Worked example

A test suite depends on a flaky third-party payments API. Record it
once, then run offline. Create a proxy imposter that forwards every
path to the real upstream in `proxyOnce` mode:

```json
{
  "port": 4545,
  "protocol": "http",
  "stubs": [{
    "predicates": [{ "matches": { "path": ".*" } }],
    "responses": [{ "proxy": {
      "to": "https://payments.example.com",
      "mode": "proxyOnce"
    }}]
  }]
}
```

Run the suite once with the real upstream reachable: each distinct
request hits `payments.example.com` and Mountebank stores the response
as a stub. On every later run the stored stubs answer and the real API
is never called - the suite is deterministic and offline.

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Hard-coded imposter ports across many tests                  | Port collisions under parallel CI execution.                       | Use dynamic ports; capture them from the control API's response. |
| Predicates with regex that match unintended paths            | Test passes because the wrong stub responded.                      | Anchor regexes (`^`/`$`); prefer `equals` over `matches` when possible. |
| `allowInjection: true` in production-adjacent envs           | JS injection is powerful; allows arbitrary code execution.         | Only enable for local / CI; never on a shared mock server. |
| Forgetting to delete imposters between test runs             | Stale imposters persist across runs; tests interfere.              | `DELETE /imposters/<port>` in test teardown OR restart Mountebank. |
| Recording in `proxyAlways` mode and committing the captures   | Captures may include real PII / tokens.                             | Use `proxyOnce`; review captured stubs before committing; scrub PII via JSON Schema or jq pre-commit. |

## Limitations

- **Operational overhead.** A separate process / container per CI
  run; harder to set up than in-process WireMock or MSW.
- **JSON-heavy authoring.** Imposter definitions are JSON-by-API;
  there's no fluent DSL like WireMock's `stubFor`.
- **Documentation domain reliability.** As noted above, the
  canonical `mbtest.org` URL has been hijacked; rely on the GitHub
  README ([mountebank-readme][readme]) and `mbtest.dev` until /
  unless `mbtest.org` is restored.

## References

- [mountebank-readme][readme] - main repo: install, supported
  protocols, key features.
- mbtest.dev - alternate documentation domain (verify before
  linking; project's stewardship situation evolved during 2025-2026).
- `wiremock-stubs` - HTTP-only
  alternative on the JVM.
- `msw-handlers` - HTTP-only
  alternative for browser + Node.
