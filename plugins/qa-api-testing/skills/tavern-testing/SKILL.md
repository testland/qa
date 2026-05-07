---
name: tavern-testing
description: "Authors Tavern API tests as YAML files (`test_*.tavern.yaml`) with `test_name` + `stages` + `request` + `response` blocks, runs them through the Tavern pytest plugin (which auto-discovers the YAML files), and gates CI on the resulting JUnit XML. Covers RESTful, MQTT, and gRPC variants. Use when the project uses pytest as its test runner and the team prefers YAML over Python-DSL or Java-DSL for API authoring."
rating: 25
d6: 4
archetype: S1
---

# tavern-testing

## Overview

Tavern is "a pytest plugin, command-line tool, and Python library
for automated testing of APIs, with a simple, concise, and flexible
YAML-based syntax" ([tavern-docs][docs]). Tests live in
`test_*.tavern.yaml` files and are picked up automatically by pytest's
discovery mechanism.

[docs]: https://tavern.readthedocs.io/en/latest/

The integration shape: write YAML, run `pytest`, read JUnit XML.
Tavern adds zero Python code to the test surface — the YAML IS the
test. This is the closest thing to "code-less" API testing in the
Python ecosystem.

## When to use

- The project's primary test runner is **pytest** (Python) and the
  team wants API tests in the same harness as unit tests.
- The team prefers YAML over a fluent DSL — tests are reviewed by
  non-engineers (PMs, support engineers).
- The API surface includes **non-HTTP** protocols (MQTT, gRPC) — Tavern
  has first-party support for both.
- A pytest project already has fixtures (database setup, auth tokens)
  that the API tests should reuse.

If the team is already deep in REST Assured or Karate, switching to
Tavern is rarely worthwhile. If the team is on Node, use
[`postman-collections`](../postman-collections/SKILL.md) instead.

## Install

```bash
pip install tavern[pytest]
```

(Per [tavern-docs][docs].)

For richer matchers, the optional extras include `tavern[mqtt]`,
`tavern[grpc]`, and `tavern[mocking]`. Install only what the project
needs.

## File shape

`tests/api/test_orders.tavern.yaml`:

```yaml
---
test_name: Get an order returns the expected fields

stages:
  - name: Authenticate
    request:
      url: https://staging.example.com/auth/login
      method: POST
      json:
        username: !env STAGING_USER
        password: !env STAGING_PASS
    response:
      status_code: 200
      save:
        json:
          access_token: access_token

  - name: Fetch order 42
    request:
      url: https://staging.example.com/orders/42
      method: GET
      headers:
        Authorization: 'Bearer {access_token}'
    response:
      status_code: 200
      json:
        order_id: 42
        status: !anything
        items:
          - sku: !anystr
            qty: !anyint
```

(Adapted from [tavern-docs][docs].)

Per [tavern-docs][docs]:

- File name pattern: `test_*.tavern.yaml`. Pytest auto-discovers.
- Each YAML doc (`---` separated) is one test.
- `test_name` is the visible test title in pytest output.
- `stages:` is an ordered list; each stage is one HTTP request +
  response check.

## Request block

Each stage's `request:` accepts:

| Field        | Purpose                                                                    |
|--------------|----------------------------------------------------------------------------|
| `url`        | Full URL or path (combine with a `tavern-global-config.yaml` for base URL). |
| `method`     | `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.                                   |
| `headers`    | Map of request headers; values can interpolate from saved variables.       |
| `params`     | Query parameters (auto-encoded).                                            |
| `json`       | JSON body (preferred over `data` when the API expects JSON).                |
| `data`       | Form-encoded body or raw string body.                                       |
| `files`      | Multipart upload.                                                           |
| `auth`       | Tuple form for HTTP Basic; OAuth via custom strategies.                     |

Variable interpolation uses Python's `str.format` style: `'{access_token}'`.

## Response block

Each stage's `response:` accepts:

| Field         | Purpose                                                          |
|---------------|------------------------------------------------------------------|
| `status_code` | Integer or list of acceptable codes (`[200, 201]`).              |
| `headers`     | Map of expected header values; supports regex with `!re_match`.  |
| `json`        | Map of expected body shape; supports built-in matchers.          |
| `save`        | Map declaring values to capture for use in later stages.         |
| `verify_response_with` | List of custom validator function dotted paths.        |
| `redirect_query_params` | For redirect-flow tests.                                |

### Built-in matchers

Per [tavern-docs][docs]:

| Matcher        | Meaning                                                |
|----------------|--------------------------------------------------------|
| `!anything`    | Any value (presence-only check).                       |
| `!anystr`      | Any string.                                            |
| `!anyint`      | Any integer.                                           |
| `!anyfloat`    | Any float.                                             |
| `!anybool`     | Any boolean.                                           |
| `!anylist`     | Any list.                                              |
| `!anydict`     | Any dict.                                              |
| `!re_match`    | Regex match: `!re_match '^[A-Z]{3}-\\d+$'`.            |
| `!re_search`   | Regex search anywhere in the string.                   |
| `!re_fullmatch`| Regex full match.                                       |

### Variable saving

The `save:` block captures values for later stages. Two common forms:

```yaml
response:
  status_code: 200
  save:
    json:
      # Save response.json()['access_token'] as variable `access_token`
      access_token: access_token
    headers:
      # Save the Location header as variable `created_url`
      created_url: location
```

Saved variables are interpolated in subsequent stages with
`'{access_token}'`.

## Authentication

For OAuth2 / token-based auth, the canonical pattern is a two-stage
test where the first stage authenticates and `save:`s the token, the
second stage uses it (see the worked example above).

For HTTP Basic Auth:

```yaml
request:
  url: ...
  method: GET
  auth:
    - !env API_USER
    - !env API_PASS
```

For API key in header:

```yaml
request:
  url: ...
  headers:
    X-API-KEY: !env API_KEY
```

`!env VAR` resolves the env var at run time; never put secrets in
the YAML directly.

## Global config

For shared base URLs, default headers, or strict-checking flags,
create `tavern-global-config.yaml`:

```yaml
variables:
  base_url: https://staging.example.com
  default_timeout: 5
strict:
  - json:on
```

Reference variables in any YAML test file: `url: '{base_url}/orders/42'`.

## Running

```bash
# Run every Tavern YAML file
pytest tests/api/

# Run a specific YAML file
pytest tests/api/test_orders.tavern.yaml

# Run with verbose output (helpful for debugging stage failures)
pytest -v tests/api/

# Generate JUnit XML for CI ingestion
pytest tests/api/ --junitxml=results.xml
```

(Per [tavern-docs][docs].)

## CI integration

```yaml
# .github/workflows/api-tests.yml
name: api-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  tavern:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install
        run: pip install -r requirements-test.txt   # contains 'tavern[pytest]'

      - name: Run Tavern suite
        env:
          STAGING_USER: ${{ secrets.STAGING_USER }}
          STAGING_PASS: ${{ secrets.STAGING_PASS }}
          API_KEY:      ${{ secrets.API_KEY }}
        run: |
          pytest tests/api/ \
            --junitxml=results.xml \
            --tavern-global-cfg=tavern-global-config.yaml

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: tavern-reports
          path: results.xml
          retention-days: 14

      - name: Surface JUnit results
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: Tavern API tests
          path: results.xml
          reporter: java-junit
```

## Anti-patterns

| Anti-pattern                                                 | Why it fails                                                          | Fix |
|--------------------------------------------------------------|-----------------------------------------------------------------------|-----|
| Embedding tokens / secrets in the YAML                        | Leaks into git; rotation pain.                                        | Use `!env VAR` for everything secret. |
| Hard-coded base URLs in every test                            | Tests bind to one environment.                                        | Use `tavern-global-config.yaml` `variables.base_url`. |
| One mega-stage list (15+ stages per test)                      | Failure mid-list halts everything; no per-stage isolation.           | Split into multiple `test_name` blocks; each test owns its own auth → action → assert chain. |
| Using `!anything` everywhere instead of typed matchers        | `!anything` accepts `null` / wrong type — defeats the assertion.     | Use `!anystr`, `!anyint`, `!re_match` to constrain. |
| Skipping `--tavern-global-cfg` in CI                          | Variable interpolation fails silently; tests hit the wrong env.       | Always pass `--tavern-global-cfg=<file>` so the project's defaults apply. |
| Mixing Tavern YAML with Python pytest cases without separation | Failure attribution is confusing; output volume mixes formats.        | Keep Tavern YAML under `tests/api/` and pure Python tests under `tests/unit/`. |

## Limitations

- **Pytest-only.** No standalone runner; the YAML files don't run
  outside pytest's discovery.
- **Limited dynamic logic.** Tavern is intentionally declarative;
  for branching, retries, or computed expectations, drop into a
  pytest fixture or a custom validator referenced via
  `verify_response_with`.
- **Schema validation needs an extra dependency.** For JSON Schema
  enforcement, install a separate matcher; built-in matchers cover
  shape but not full schema constraints.
- **Variable interpolation can mask null bugs.** A typo in
  `'{accest_token}'` (missing `s`) won't error — the literal string
  goes through. Watch for these in code review.

## References

- [tavern-docs][docs] — canonical reference: install, file shape,
  request / response / save / matchers, pytest integration, global
  config.
- [`postman-collections`](../postman-collections/SKILL.md) —
  Node-stack alternative.
- [`restassured-testing`](../restassured-testing/SKILL.md) — Java
  fluent-DSL alternative.
- [`schemathesis-fuzzing`](../schemathesis-fuzzing/SKILL.md) —
  Python-stack property-based fuzzing complement to Tavern's
  example-based tests.
