# Mountebank - multi-protocol mock servers

Reference detail for [wiremock-stubs](../SKILL.md). WireMock and MSW are
HTTP-only; Mountebank covers the multi-protocol long tail. Author imposters
(mock servers) by POSTing JSON definitions to the control API on port 2525.

[readme]: https://github.com/bbyars/mountebank

Per [mountebank-readme][readme], supported protocols include:
HTTP / HTTPS, TCP (text and binary), SMTP, LDAP, gRPC, WebSockets,
GraphQL, SNMP, Telnet / SSH, and NETCONF.

> **Docs-domain note (verified 2026-05-04):** the canonical
> `mbtest.org` domain was hijacked (redirects to an unrelated site),
> so this reference cites the GitHub repo [bbyars/mountebank][readme];
> `mbtest.dev` is the project's alternate docs domain. Verify both
> URLs before linking from authored content.

## When to use

- The project mocks **non-HTTP** protocols (TCP, SMTP, LDAP, gRPC).
- The team wants **record-playback proxying** - Mountebank can
  proxy to a real upstream during recording, then replay the
  captured responses in subsequent test runs.
- The team needs **JavaScript injection** for dynamic response
  computation per request.

If the team is HTTP-only on the JVM, WireMock (the parent skill) is
the lighter fit. For Node / browser HTTP-only, use `msw-handlers`.
Mountebank's strength is multi-protocol breadth; pay the operational
cost (a separate process, port 2525) only when you need it.

## How to use

1. Start Mountebank (`mb start` or the Docker image); the control API listens on port 2525.
2. POST a JSON imposter to `/imposters` with a `port`, a `protocol`, and one or more `stubs`.
3. Give each stub `predicates` (path / method / header / body matchers) and `responses` (the reply to send).
4. Verify: `GET http://localhost:2525/imposters/<port>` and assert HTTP 200 with your stubs listed before pointing tests at it. If it 404s or the stub is missing, the POST body was malformed - fix the JSON and re-POST.
5. Point the system under test at the imposter's port and run the tests.
6. For an unrecorded upstream, use a `proxyOnce` proxy response to capture real traffic, then replay offline.
7. `DELETE /imposters/<port>` in teardown (or restart Mountebank) so stale stubs don't leak between runs.

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

| Operator            | Meaning                                              |
|---------------------|------------------------------------------------------|
| `equals`            | Exact match.                                          |
| `deepEquals`        | Deep equality on a nested object (e.g. JSON body).    |
| `contains`          | Substring / partial match.                            |
| `startsWith` / `endsWith` | Affix matchers.                                |
| `matches`           | Regex match.                                          |
| `exists`            | Whether a field is present.                           |
| `not` / `or` / `and` | Boolean combinators.                                 |
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
forever offline. Each distinct request hits the upstream and
Mountebank stores the response as a stub; on every later run the
stored stubs answer and the real API is never called.

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
- **Documentation domain reliability.** See the docs-domain note at
  the top: cite the GitHub README and `mbtest.dev`.

## References

- [mountebank-readme][readme] - main repo: install, supported
  protocols, key features.
- mbtest.dev - alternate documentation domain (verify before linking).
- `msw-handlers` - HTTP-only alternative for browser + Node.
