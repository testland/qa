---
name: schemathesis-fuzzing
description: "Generates property-based API tests automatically from an OpenAPI 2/3.x or GraphQL schema using Schemathesis, runs them via the `schemathesis run` CLI or as a pytest decorator, configures the canonical checks (status_code_conformance, response_schema_conformance, content_type_conformance, response_headers_conformance, not_a_server_error), and gates CI on schema-conformance failures plus 5xx detection. Use when the project ships an OpenAPI or GraphQL schema and the team wants schema-driven coverage that scales as the API evolves."
rating: 25
d6: 4
archetype: S1
---

# schemathesis-fuzzing

## Overview

Schemathesis is a property-based API testing tool that "automatically
generates property-based tests from your OpenAPI or GraphQL schema
and exercises the edge cases that break your API"
([schemathesis-readme][readme]). The schema is the **single source of
truth** - every endpoint, parameter, and response shape becomes a
generator that produces hundreds of targeted variations per run.

[readme]: https://github.com/schemathesis/schemathesis

This is **complementary** to example-based API testing
([`postman-collections`](../postman-collections/SKILL.md),
[`tavern-testing`](../tavern-testing/SKILL.md),
[`restassured-testing`](../restassured-testing/SKILL.md),
[`karate-testing`](../karate-testing/SKILL.md)) - example-based tests
verify happy paths; Schemathesis attacks the boundaries the team
forgot.

## When to use

- The repo has an OpenAPI 2.0 / 3.0 / 3.1 / 3.2 spec or a GraphQL
  schema (June 2018+).
- The team wants automatic test coverage of new endpoints without
  authoring per-endpoint tests.
- Negative-scenario coverage ("what happens with a malformed
  request?") is missing or thin.
- A CI gate on **5xx responses** (any unexpected server error) is
  desired.

If the API has no schema, Schemathesis cannot help - generate a
schema first (FastAPI, Flask-Smorest, NestJS Swagger, dropwizard, or
hand-author a spec), then return.

## Install

```bash
pip install schemathesis
```

(Per [schemathesis-readme][readme].)

For the latest CLI without modifying the project's Python env:

```bash
uvx schemathesis run <schema-url>
```

(Adapted from [schemathesis-docs][docs] - `uvx` is the `uv` runner
for one-off tool execution.)

[docs]: https://schemathesis.readthedocs.io/en/stable/

## Running via CLI

Basic invocation per [schemathesis-readme][readme]:

```bash
schemathesis run <schema-url>
```

`<schema-url>` can be:

- Remote URL: `https://api.example.com/openapi.json`.
- Local file: `./openapi.yaml`.

### Key flags

Per [schemathesis-readme][readme]:

| Flag                              | Purpose                                                |
|-----------------------------------|--------------------------------------------------------|
| `--base-url <url>`                | Override the API base URL (test against staging vs prod). |
| `--checks <name>` (repeatable)    | Restrict to specific validations.                      |
| `--hypothesis-max-examples <N>`   | Number of generated cases per endpoint.                |
| `--workers <N>`                   | Parallel workers; speeds up large schemas.             |
| `--header 'X-API-KEY: ...'`       | Inject auth header on every generated request.         |
| `--auth user:pass`                | HTTP Basic Auth.                                        |
| `--cassette-har <path>`           | Record / replay using HAR files (debug aid).            |

### Worked example

```bash
schemathesis run https://api.example.com/openapi.json \
  --base-url https://staging.example.com \
  --checks status_code_conformance \
  --checks response_schema_conformance \
  --checks not_a_server_error \
  --hypothesis-max-examples 200 \
  --workers 4 \
  --header "Authorization: Bearer $API_TOKEN"
```

## Built-in checks

Per [schemathesis-readme][readme], the canonical checks:

| Check                               | What it verifies                                            |
|-------------------------------------|-------------------------------------------------------------|
| `status_code_conformance`           | Response status code is one of the codes documented in the schema for that endpoint. |
| `response_schema_conformance`       | Response body matches the documented schema (types, required fields, enum values). |
| `content_type_conformance`          | `Content-Type` header is one of the schema's documented media types. |
| `response_headers_conformance`      | Response headers conform to the schema's `headers` declaration. |
| `not_a_server_error`                | The response is **not** in the 5xx range; any 5xx is a hard fail. |

Run all checks (default), or restrict via repeated `--checks`:

```bash
# Strict: every check active
schemathesis run <schema>

# Only flag 5xx errors (cheap smoke test)
schemathesis run <schema> --checks not_a_server_error
```

A failing check produces a deterministic reproduction - Schemathesis
prints the exact `curl` command and Hypothesis seed to reproduce the
generated request.

## Pytest integration

For projects that want Schemathesis cases as first-class pytest
tests ([schemathesis-readme][readme]):

```python
# tests/api/test_schemathesis.py
import schemathesis

schema = schemathesis.openapi.from_url("https://your-api.com/openapi.json")

@schema.parametrize()
def test_api(case):
    case.call_and_validate()
```

`@schema.parametrize()` generates one pytest test per endpoint × method
combination. `case.call_and_validate()` issues the generated request
and runs every default check.

For finer-grained integration:

```python
@schema.parametrize()
@schemathesis.hook("before_call")
def add_auth(context, case):
    case.headers["Authorization"] = f"Bearer {os.environ['API_TOKEN']}"

def test_api_with_auth(case):
    case.call_and_validate()
```

Hooks let the team inject project-specific auth, header signatures,
or response post-processing without forking Schemathesis.

## CI integration

```yaml
# .github/workflows/api-fuzz.yml
name: api-fuzz

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'   # nightly broader run

jobs:
  schemathesis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - run: pip install schemathesis

      - name: Schemathesis run
        env:
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: |
          schemathesis run https://staging.example.com/openapi.json \
            --base-url https://staging.example.com \
            --hypothesis-max-examples 50 \
            --workers 4 \
            --header "Authorization: Bearer $API_TOKEN" \
            --junit-xml=results.xml

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: schemathesis-results
          path: results.xml
          retention-days: 14

      - name: Surface JUnit
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: API fuzz
          path: results.xml
          reporter: java-junit
```

The PR-trigger run uses lower `--hypothesis-max-examples` (e.g. 50)
for fast feedback; the nightly cron run uses higher values (200+)
for deeper coverage. This separation keeps PR CI under 10 minutes
without sacrificing nightly depth.

## Two complementary CI cadences

| Cadence  | Examples per endpoint | Purpose                                  |
|----------|-----------------------|------------------------------------------|
| Per-PR   | 50                    | Fast smoke; catch obvious schema-drift breaks. |
| Nightly  | 200-500               | Deep coverage; surface rarely-triggered edge cases. |
| Weekly   | 1000+                 | Pre-release deep validation.              |

Hypothesis (the underlying property-based engine) **shrinks** failures
to minimal reproducers automatically - a 200-example PR run is
plenty to surface most regressions; nightly depth catches the rare
ones.

## Anti-patterns

| Anti-pattern                                                    | Why it fails                                                | Fix |
|-----------------------------------------------------------------|-------------------------------------------------------------|-----|
| Running with `--checks not_a_server_error` only and calling it done | 5xx detection misses 4xx-with-wrong-content cases.         | Run all default checks; 5xx-only is a smoke check, not coverage. |
| `--hypothesis-max-examples 5` to keep CI fast                     | Coverage too thin; flaky-looking results.                  | 50+ on PR; if too slow, parallelize via `--workers`. |
| Targeting production URL                                          | Generated requests can mutate prod data; 5xx alerts trigger oncall. | Always `--base-url <staging>`; production should never see fuzz traffic. |
| Stale schema URL                                                  | Schemathesis fuzzes the schema's authoritative version, not what the deploy actually serves; false negatives mask bugs. | CI fetches the schema from the PR's deployed staging artifact, not from a checked-in copy. |
| Ignoring shrunk failures                                          | A `not_a_server_error` failure with a 5-byte input is a real bug, not noise. | Triage every failure; close as "won't fix" only with a documented schema-amendment plan. |

## Limitations

- **Authentication state.** Schemathesis can attach a token but
  doesn't model multi-step auth flows (login → token → use).
  Combine with [`tavern-testing`](../tavern-testing/SKILL.md) or
  [`restassured-testing`](../restassured-testing/SKILL.md) for the
  auth chain.
- **Stateful sequences.** Out of the box, every Schemathesis case is
  independent. For stateful API fuzzing (POST → GET created
  resource → DELETE), use
  [`restler-fuzzing`](../restler-fuzzing/SKILL.md), which is built
  for stateful sequences.
- **Schema drift.** If the schema doesn't match the implementation,
  every case fails for the wrong reason. Run a Schemathesis baseline
  pre-PR to catch schema drift early.
- **OpenAPI 2.0 limitations.** Some OpenAPI 2.0 features (e.g.
  `formData`) generate weaker variations than 3.x; consider migrating
  the schema to 3.x.

## References

- [schemathesis-readme][readme] - main repo: install, CLI flags,
  built-in checks, pytest integration with `@schema.parametrize()`.
- [schemathesis-docs][docs] - full docs (CLI reference, hooks,
  authentication strategies).
- [`restler-fuzzing`](../restler-fuzzing/SKILL.md) - stateful
  fuzzing complement.
- [`postman-collections`](../postman-collections/SKILL.md),
  [`tavern-testing`](../tavern-testing/SKILL.md),
  [`restassured-testing`](../restassured-testing/SKILL.md),
  [`karate-testing`](../karate-testing/SKILL.md) - example-based
  authoring; use alongside Schemathesis for happy-path coverage.
