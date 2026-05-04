---
name: postman-collections
description: Authors Postman collections (requests + tests + variables + environments), runs them headless via the Newman CLI, configures reporters (cli / json / junit / html) for CI artifact upload, and uses iteration data files (JSON / CSV) for data-driven runs. Use when the project ships HTTP API tests authored in Postman and the team needs CI execution alongside or instead of the Postman desktop runner.
rating: 26
d6: 4
archetype: S1
---

# postman-collections

## Overview

Postman is a popular GUI for HTTP API authoring; **Newman** is its
official CLI for running the same collections headlessly in CI
([newman-readme][readme]). The integration shape is two-step:

[readme]: https://github.com/postmanlabs/newman

1. Author the collection in the Postman desktop app or import an
   OpenAPI spec → save as `collection.json`.
2. Run via `newman run collection.json` in CI; emit JUnit / JSON for
   downstream gating.

This skill covers the headless Newman side. Authoring inside Postman
itself is a GUI workflow; the canonical reference is
[learning.postman.com](https://learning.postman.com/) and is out of
scope for an automated agent.

## When to use

- The repo contains `*.postman_collection.json` (or the team
  exports collections to `collections/`).
- API testing is the team's primary integration-testing layer and
  the team is already in the Postman ecosystem.
- A CI workflow needs `newman run` with structured reporter output
  for PR gating.

If the team uses TypeScript / JavaScript and prefers code-first
authoring, evaluate
[`tavern-testing`](../tavern-testing/SKILL.md) (YAML) or
[`karate-testing`](../karate-testing/SKILL.md) (Karate DSL) before
adopting Postman/Newman — those keep tests next to source code rather
than in a separate JSON artifact.

## Install

```bash
npm install -g newman
```

(Per [newman-readme][readme].)

For per-project install (preferred for CI determinism):

```bash
npm install --save-dev newman
```

For the HTML reporter (external, separate install):

```bash
npm install --save-dev newman-reporter-htmlextra
```

## Running

The canonical invocation ([newman-readme][readme]):

```bash
newman run <collection-file-source> [options]
```

`<collection-file-source>` can be:

- A local file path: `./collections/orders.postman_collection.json`.
- A Postman Cloud URL: `https://api.getpostman.com/collections/...`.
- A public-link URL exported from Postman.

### Key flags

Per [newman-readme][readme]:

| Flag                            | Purpose                                                  |
|---------------------------------|----------------------------------------------------------|
| `-e, --environment <source>`    | Postman environment file (path or URL).                  |
| `-d, --iteration-data <source>` | Data file for iterations: JSON or CSV.                   |
| `-r, --reporters <name>`        | Comma-separated list: `cli,json,junit,html` (htmlextra). |
| `--bail [folder\|failure]`      | Stop on first error; modifier scopes the bail trigger.   |
| `--reporter-junit-export <path>`| Where to write the JUnit XML (when `junit` reporter).    |
| `--reporter-json-export <path>` | Where to write the JSON summary.                          |
| `--timeout-request <ms>`        | Per-request timeout.                                     |
| `--insecure`                    | Disable TLS verification (use only against test servers).|
| `--delay-request <ms>`          | Delay between requests; helps when the server has rate limits. |

### Worked example

```bash
newman run examples/sample-collection.json \
  -e environment.json \
  -d data.csv \
  -r cli,json,junit \
  --timeout-request 5000 \
  --reporter-junit-export results.xml \
  --reporter-json-export results.json \
  --bail folder
```

(Adapted from [newman-readme][readme].)

## Reporters

The four built-in / canonical reporters per [newman-readme][readme]:

| Reporter | Purpose                                                          |
|----------|------------------------------------------------------------------|
| `cli`    | Terminal output; enabled by default.                              |
| `json`   | Full JSON summary of every request and assertion result.          |
| `junit`  | JUnit XML — consumable by GitHub Actions, GitLab, Jenkins.        |
| `html`   | Static HTML report; requires `newman-reporter-htmlextra`.         |

**JUnit is the canonical CI choice** — every major CI platform
ingests JUnit XML, surfaces test counts on the run summary, and lets
the team click through to per-assertion failures.

For richer per-test details (which assertion in which folder failed
with which response), pair `junit` with `json` and upload both as
build artifacts.

## Authoring tests inside the collection

Tests in Postman live in the **Tests** tab of each request and run
after the response is received. The runtime is a sandboxed JavaScript
environment with `pm.*` globals:

```javascript
pm.test('status is 200', () => {
  pm.response.to.have.status(200);
});

pm.test('body is JSON with .order_id', () => {
  const json = pm.response.json();
  pm.expect(json).to.have.property('order_id').that.is.a('number');
});

pm.test('saves order_id for next request', () => {
  pm.collectionVariables.set('order_id', pm.response.json().order_id);
});
```

Each `pm.test('...', () => {})` call becomes one entry in the JUnit
XML / JSON output — name them clearly so the CI run summary is
readable.

## CI integration

```yaml
# .github/workflows/api-tests.yml
name: api-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  newman:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Newman run
        env:
          API_BASE_URL: ${{ secrets.STAGING_BASE_URL }}
          API_TOKEN:    ${{ secrets.API_TOKEN }}
        run: |
          npx newman run collections/orders.postman_collection.json \
            -e environments/staging.postman_environment.json \
            -r cli,json,junit \
            --reporter-junit-export results.xml \
            --reporter-json-export results.json \
            --bail failure \
            --timeout-request 10000

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: newman-reports
          path: |
            results.xml
            results.json
          retention-days: 14

      - name: Surface JUnit results in summary
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: API tests
          path: results.xml
          reporter: java-junit
```

`if: always()` on both upload + reporter steps is critical — when a
collection fails, the reports are exactly when you need them.

## Anti-patterns

| Anti-pattern                                            | Why it fails                                              | Fix |
|---------------------------------------------------------|-----------------------------------------------------------|-----|
| Hard-coded environment URLs in the collection JSON       | Collection breaks across staging / prod / local.         | Move to `*.postman_environment.json` files; pass via `-e`. |
| Storing API tokens in the collection JSON                 | Tokens leak into git.                                     | Use environment files committed without secrets, or pull tokens from CI env vars referenced as `{{API_TOKEN}}`. |
| Running collections in PR CI against production           | Tests pollute prod data; rate limits trip; observability noise. | Always run against a staging or ephemeral env. |
| Sequential `pm.test` blocks that share state              | One failure cascades into N false positives.             | Each request's tests should be independent — use `pm.collectionVariables` to share derived data, not assertion state. |
| One giant collection with 200 requests                    | Newman runs serially; CI time grows linearly.            | Split into per-domain collections; parallelize at the CI matrix level. |
| Missing `--bail` in CI                                    | Newman runs all requests even after a failure; noisy logs. | Use `--bail failure` for fast feedback; `--bail folder` to scope the bail to a logical group. |

## Limitations

- **No code-first authoring.** Postman's authoring story is the GUI;
  the JSON file is the artifact. Teams that prefer code-first DSLs
  should evaluate [`karate-testing`](../karate-testing/SKILL.md) or
  [`tavern-testing`](../tavern-testing/SKILL.md).
- **Sandboxed JS only.** Tests can't import npm packages — the `pm.*`
  sandbox provides chai / lodash / cheerio pre-loaded; for richer
  logic, consider Karate or Tavern.
- **No native parallelism inside one Newman run.** Parallelize across
  CI matrix jobs, not within a single Newman process.

## References

- [newman-readme][readme] — install, `newman run` syntax, flags,
  reporters, example invocation.
- [`tavern-testing`](../tavern-testing/SKILL.md) — YAML alternative.
- [`karate-testing`](../karate-testing/SKILL.md) — DSL alternative.
- [`schemathesis-fuzzing`](../schemathesis-fuzzing/SKILL.md) —
  property-based fuzzing as a complement (not replacement) for
  example-based collections.
