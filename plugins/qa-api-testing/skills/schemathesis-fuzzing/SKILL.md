---
name: schemathesis-fuzzing
description: "Use for any request to generate API tests from an OpenAPI or GraphQL schema, or to find inputs that make an API return 500 that hand-written tests miss: Schemathesis fuzzes every endpoint for 5xx errors and schema violations from the CLI or pytest, picks the conformance checks and gates CI as the API evolves."
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
(`postman-collections`,
`tavern-testing`,
`restassured-testing`,
`karate-testing`) - example-based tests
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

## How to use

1. Confirm the API ships an OpenAPI 2/3.x or GraphQL schema (see When to use).
2. Install the CLI (`pip install schemathesis`, or `uvx` for a one-off run).
3. Run `schemathesis run <schema>` against **staging** with the default checks; reproduce any failure from the printed `curl` command + Hypothesis seed.
4. Promote it to a first-class pytest test (`@schema.parametrize()`) and gate CI on schema-conformance + 5xx detection - deep CI wiring and advanced auth hooks live in [references/ci-and-pytest-integration.md](references/ci-and-pytest-integration.md).

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
[cli]: https://schemathesis.readthedocs.io/en/stable/reference/cli/

## Running via CLI

Basic invocation per [schemathesis-readme][readme]:

```bash
schemathesis run <schema-url>
```

`<schema-url>` can be:

- Remote URL: `https://api.example.com/openapi.json`.
- Local file: `./openapi.yaml`.

### Key flags

Per the [CLI reference][cli] (Schemathesis 4):

| Flag                              | Purpose                                                |
|-----------------------------------|--------------------------------------------------------|
| `-u, --url <url>`                 | API base URL (test against staging vs prod); required for a file-based schema. |
| `-c, --checks <a,b>`              | Comma-separated checks to run; the default is all checks. |
| `-n, --max-examples <N>`          | Number of generated cases per operation.               |
| `-w, --workers <N\|auto>`         | Parallel workers (1-64 or `auto`); speeds up large schemas. |
| `-H, --header 'X-API-KEY: ...'`   | Inject a header on every generated request (repeatable). |
| `-a, --auth user:pass`            | HTTP Basic Auth.                                        |
| `--report junit,har,vcr`          | Write reports (default directory `schemathesis-report`); paths via `--report-junit-path`, `--report-har-path`, `--report-vcr-path`. |

The 3.x flags `--base-url`, `--hypothesis-max-examples`, `--junit-xml`
and `--cassette-path` are not in the current CLI ([cli][cli]); old
blog posts and CI files still use them.

### Worked example

```bash
schemathesis run https://api.example.com/openapi.json \
  --url https://staging.example.com \
  --max-examples 200 \
  --workers 4 \
  --header "Authorization: Bearer $API_TOKEN"
```

## Built-in checks

Per [schemathesis-readme][readme] and the [checks reference][checks], the
main checks ("All checks are enabled by default unless explicitly
disabled"; only `max_response_time` is off until you set
`--max-response-time`):

| Check                               | What it verifies                                            |
|-------------------------------------|-------------------------------------------------------------|
| `status_code_conformance`           | Response status code is one of the codes documented in the schema for that endpoint. |
| `response_schema_conformance`       | Response body matches the documented schema (types, required fields, enum values). |
| `content_type_conformance`          | `Content-Type` header is one of the schema's documented media types. |
| `response_headers_conformance`      | Response headers conform to the schema's `headers` declaration. |
| `not_a_server_error`                | The response is **not** in the 5xx range; any 5xx is a hard fail. |
| `negative_data_rejection`           | Invalid input (outside the schema) is rejected; needs `--mode negative` or `all` (the default). |
| `positive_data_acceptance`          | Valid input is accepted; needs `--mode positive` or `all`. |
| `ignored_auth`                      | Authentication is enforced: a request without valid auth gets 401/403. |
| `use_after_free`                    | A deleted resource is no longer reachable; stateful, needs links. |
| `ensure_resource_availability`      | A created resource is reachable right away; stateful, needs links. |

Run all checks (default), or restrict with a comma-separated `--checks` list:

```bash
# Strict: every check active
schemathesis run <schema>

# Only flag 5xx errors (cheap smoke test)
schemathesis run <schema> --checks not_a_server_error
```

A failing check produces a deterministic reproduction - Schemathesis
prints the exact `curl` command and Hypothesis seed to reproduce the
generated request.

## Three setups that keep a run green while it misses bugs

### 1. Auth that outlives the token

A token pasted into `--header` expires mid-run, and from then on every
request is a 401, which hides everything else. Let Schemathesis fetch
and refresh the token ([auth][auth]). In `schemathesis.toml`:

```toml
[auth.dynamic.openapi.BearerAuth]          # name of the security scheme in the spec
path = "/oauth/token"
payload = { grant_type = "client_credentials", client_id = "${FUZZ_CLIENT_ID}", client_secret = "${FUZZ_CLIENT_SECRET}" }
payload_content_type = "application/x-www-form-urlencoded"
extract_selector = "/access_token"
```

Or as a Python hook, loaded with `SCHEMATHESIS_HOOKS=<module>` or
`hooks = "<module>"` in `schemathesis.toml`:

```python
import os, requests, schemathesis

@schemathesis.auth(refresh_interval=240)       # default cache is 300 s; refresh before expiry
class ClientCredentials:
    def get(self, case, ctx):
        r = requests.post(f"{os.environ['API_URL']}/oauth/token", data={
            "grant_type": "client_credentials",
            "client_id": os.environ["FUZZ_CLIENT_ID"],
            "client_secret": os.environ["FUZZ_CLIENT_SECRET"]})
        r.raise_for_status()
        return r.json()["access_token"]

    def set(self, case, data, ctx):
        case.headers = case.headers or {}
        case.headers["Authorization"] = f"Bearer {data}"
```

Keep `refresh_interval` below the token lifetime, and pass the client
credentials from CI secrets (`${{ secrets.FUZZ_CLIENT_ID }}`), never a
token copied by hand.

### 2. Invalid input the API accepts

`negative_data_rejection` sends data that violates the schema and fails
when the API answers 2xx. It can only flag what the schema forbids: if
`amount` is `type: integer` with no `minimum`, `-5` is valid input and
the bug is invisible. Add the real constraints (`minimum`, `maxLength`,
`pattern`, `enum`) to the spec, keep `--mode all` (the default), and do
not narrow `--checks` to `not_a_server_error`, which turns off this
check and the conformance and auth checks with it.

### 3. Stateful bugs need links

Without links, every path ID (`/invoices/{invoiceId}`) is generated at
random, so GET and DELETE mostly hit IDs that do not exist and return
404. Bugs such as "a deleted invoice is still readable" need a real
create, then delete, then get. Add OpenAPI links under the status code
the API returns ([stateful][stateful]):

```yaml
paths:
  /invoices:
    post:
      operationId: createInvoice
      responses:
        '201':
          description: Created
          links:
            GetInvoice:
              operationId: getInvoice
              parameters: { invoiceId: '$response.body#/id' }
            DeleteInvoice:
              operationId: deleteInvoice
              parameters: { invoiceId: '$response.body#/id' }
```

"The stateful phase runs by default after examples, coverage, and
fuzzing" (`--phases stateful` runs only it), and the CLI reports
`Missing Open API links` when there are none ([stateful][stateful]).
`use_after_free` and `ensure_resource_availability` "only trigger when
links between operations are available" and never from a single
`case.call_and_validate()` ([checks][checks]). In pytest:

```python
schema = schemathesis.openapi.from_url(f"{BASE_URL}/openapi.json")

class InvoiceWorkflow(schema.as_state_machine()):
    pass

TestInvoices = InvoiceWorkflow.TestCase
```

[auth]: https://schemathesis.readthedocs.io/en/stable/guides/auth/
[checks]: https://schemathesis.readthedocs.io/en/stable/reference/checks/
[stateful]: https://schemathesis.readthedocs.io/en/stable/guides/stateful-testing/

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

For project-specific auth injection, header signatures, or response
post-processing, use `before_call` hooks - see
[references/ci-and-pytest-integration.md](references/ci-and-pytest-integration.md).

## Operating in CI

Gate PRs on Schemathesis with a shallow per-PR run
(`--max-examples 50`) and a deeper nightly cron (200+), always
against staging via `--url`. Hypothesis shrinks any failure to a
minimal reproducer, so a 50-example PR run catches most regressions while
the nightly depth surfaces the rare ones. The full GitHub Actions workflow
(JUnit reporting, artifact upload) and the per-PR / nightly / weekly cadence
table live in [references/ci-and-pytest-integration.md](references/ci-and-pytest-integration.md).

## Anti-patterns

| Anti-pattern                                                    | Why it fails                                                | Fix |
|-----------------------------------------------------------------|-------------------------------------------------------------|-----|
| Running with `--checks not_a_server_error` only and calling it done | 5xx detection misses 4xx-with-wrong-content cases.         | Run all default checks; 5xx-only is a smoke check, not coverage. |
| `--max-examples 5` to keep CI fast                                | Coverage too thin; flaky-looking results.                  | 50+ on PR; if too slow, parallelize via `--workers`. |
| Targeting production URL                                          | Generated requests can mutate prod data; 5xx alerts trigger oncall. | Always `--url <staging>`; production should never see fuzz traffic. |
| Bearer token passed with `--header` on a long run                 | Token expires; the rest of the run is 401s.                 | Dynamic auth with `refresh_interval` below the token lifetime (Setup 1). |
| No `minimum` / `maxLength` / `enum` in the spec                   | Invalid values count as valid; negative testing cannot flag them. | Put the real constraints in the spec (Setup 2). |
| No OpenAPI links                                                 | IDs are random, deletes and reads hit 404; stateful checks never run. | Links on create responses (Setup 3). |
| Stale schema URL                                                  | Schemathesis fuzzes the schema's authoritative version, not what the deploy actually serves; false negatives mask bugs. | CI fetches the schema from the PR's deployed staging artifact, not from a checked-in copy. |
| Ignoring shrunk failures                                          | A `not_a_server_error` failure with a 5-byte input is a real bug, not noise. | Triage every failure; close as "won't fix" only with a documented schema-amendment plan. |

## Limitations

- **Authentication flows.** Dynamic auth covers fetching and
  refreshing a token (Setup 1); flows with interactive steps (MFA,
  browser login) still need a pre-issued test credential.
- **Stateful sequences need links.** The stateful phase only chains
  operations that OpenAPI links (or `Location` headers seen earlier)
  connect (Setup 3). For grammar-based stateful fuzzing without links,
  see `restler-fuzzing`.
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
- [auth][auth] - dynamic auth, `refresh_interval`, `schemathesis.toml`.
- [checks][checks] - default checks, modes, stateful checks.
- [stateful][stateful] - OpenAPI links, stateful phase,
  `as_state_machine()`.
- `restler-fuzzing` - stateful
  fuzzing complement.
- `postman-collections`,
  `tavern-testing`,
  `restassured-testing`,
  `karate-testing` - example-based
  authoring; use alongside Schemathesis for happy-path coverage.
