---
name: mountebank-imposters
description: "Authors Mountebank imposters (multi-protocol mock servers - HTTP, HTTPS, TCP, SMTP, LDAP, gRPC, WebSockets, GraphQL, and more) by POSTing JSON definitions to the Mountebank control API on port 2525, configures stubs with predicates and responses, and uses record-playback proxy mode to capture upstream traffic. Use when the project needs a multi-protocol mock server beyond HTTP-only tools like WireMock or MSW."
rating: 23
d6: 3
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

If the team is HTTP-only on the JVM, [`wiremock-stubs`](../wiremock-stubs/SKILL.md)
is the lighter fit. For Node / browser HTTP-only, use
[`msw-handlers`](../msw-handlers/SKILL.md). Mountebank's strength
is multi-protocol breadth; pay the operational cost (a separate
process, port 2525) only when you need it.

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

Mountebank supports several predicate operators in addition to
`equals`:

| Operator            | Meaning                                              |
|---------------------|------------------------------------------------------|
| `equals`            | Exact match.                                          |
| `deepEquals`        | Deep equality on a nested object (e.g. JSON body).    |
| `contains`          | Substring / partial match.                            |
| `startsWith` / `endsWith` | Affix matchers.                                |
| `matches`           | Regex match.                                          |
| `exists`            | Whether a field is present.                           |
| `not`               | Negate a child predicate.                             |
| `or`                | Boolean OR.                                           |
| `and`               | Boolean AND.                                          |
| `inject`            | Custom JavaScript predicate.                          |

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

Set up an imposter as a **proxy** to a real upstream:

```json
{
  "port": 4545,
  "protocol": "http",
  "stubs": [{
    "predicates": [{ "matches": { "path": ".*" } }],
    "responses": [{
      "proxy": {
        "to": "https://real-upstream.example.com",
        "mode": "proxyOnce"
      }
    }]
  }]
}
```

| Mode             | Behavior                                                              |
|------------------|-----------------------------------------------------------------------|
| `proxyOnce`      | First request hits upstream; response is **stored as a stub**; subsequent identical requests replay. |
| `proxyAlways`    | Every request hits upstream; every response is stored.                |
| `proxyTransparent` | Pass-through; nothing recorded.                                     |

`proxyOnce` is the canonical record-playback workflow - run tests
once against a real upstream to populate the imposter, then run
forever offline.

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
- [`wiremock-stubs`](../wiremock-stubs/SKILL.md) - HTTP-only
  alternative on the JVM.
- [`msw-handlers`](../msw-handlers/SKILL.md) - HTTP-only
  alternative for browser + Node.
