---
name: openapi-contract-diff
description: "Diffs two OpenAPI versions for breaking changes (removed endpoints, deleted schemas, narrowed enums, response shape changes) using `oasdiff breaking`, severity-classifies the findings (ERR / WARN / INFO), and gates CI with `--fail-on`. Use when reviewing an OpenAPI spec change in a PR or on a release tag."
---

# openapi-contract-diff

## Overview

`oasdiff` is the canonical CLI for comparing two OpenAPI specifications
and reporting **breaking changes** ([oasdiff-readme][readme]). It runs
over 250 checks against the diff and classifies each finding into one
of three severity tiers ([oasdiff-breaking][breaking]):

| Severity | Meaning                                                        |
|----------|----------------------------------------------------------------|
| `ERR`    | Definite breaking change - should be avoided.                 |
| `WARN`   | Potential breaking change - developers should be aware.        |
| `INFO`   | Non-breaking change.                                           |

[readme]: https://github.com/oasdiff/oasdiff
[breaking]: https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md

This is the schema-driven counterpart to
[`pact-contract-testing`](../pact-contract-testing/SKILL.md): use
oasdiff when **you don't control the consumers** (public APIs, third-
party integrations) and need to gate breaking-change shipment based on
the spec alone.

## When to use

- The repo defines an OpenAPI 3 spec (`openapi.yaml`, `openapi.json`,
  or split-file equivalent).
- The team wants a CI gate that fails the build on breaking spec
  changes between the PR and the deployed version.
- The API has external consumers (no Pact possible) or the team isn't
  ready to invest in consumer-driven contracts yet.
- You need a one-shot review tool for "is this PR going to break
  consumers?"

## Authoring (no authoring - the spec is the contract)

Unlike Pact, oasdiff doesn't add tests to the repo. Instead it consumes
two OpenAPI specs and emits a diff. Authoring effort goes into
**keeping the spec authoritative** - i.e. ensuring the OpenAPI file in
the repo accurately describes the implementation. Tools that close the
spec-vs-implementation gap (Schemathesis, Spectral lint) pair well with
this skill but are out of scope.

## Install

```bash
# Go install (preferred for native CLI)
go install github.com/oasdiff/oasdiff@latest

# Docker (CI-friendly, no Go toolchain required)
docker pull tufin/oasdiff
```

(Per [oasdiff-readme][readme].)

## Running

### Local diff

```bash
oasdiff breaking openapi-old.yaml openapi-new.yaml
```

(Per [oasdiff-breaking][breaking].)

By default oasdiff prints colorized text. For machine consumption, use
`--format`:

```bash
oasdiff breaking --format json openapi-old.yaml openapi-new.yaml > breaking.json
oasdiff breaking --format yaml openapi-old.yaml openapi-new.yaml
oasdiff breaking --format markdown openapi-old.yaml openapi-new.yaml
oasdiff breaking --format html openapi-old.yaml openapi-new.yaml > breaking.html
```

Available formats: text (default), JSON, YAML, markdown, HTML, plus
single-line ([oasdiff-breaking][breaking]).

### Comparing remote specs

The CLI accepts URLs directly:

```bash
oasdiff breaking \
  https://raw.githubusercontent.com/.../openapi-test1.yaml \
  https://raw.githubusercontent.com/.../openapi-test3.yaml
```

(Adapted from [oasdiff-readme][readme].)

### Docker variant

```bash
docker run --rm -t -v "$PWD:/specs" tufin/oasdiff breaking \
  /specs/openapi-old.yaml /specs/openapi-new.yaml
```

### `--fail-on` for CI gating

The exit code is the gate signal ([oasdiff-breaking][breaking]):

```bash
oasdiff breaking --fail-on ERR  ...   # exit 1 on ERR; default behavior most teams want
oasdiff breaking --fail-on WARN ...   # exit 1 on ERR or WARN; stricter
oasdiff breaking --fail-on INFO ...   # exit 1 on any reported change
```

Default for production gates: `--fail-on ERR`. Use `--fail-on WARN` for
stricter projects (financial APIs, public SDKs) where even potentially-
breaking changes need explicit acceptance.

## What counts as breaking

oasdiff ships 250+ checks. The headline breaking patterns
([oasdiff-breaking][breaking]):

- **Endpoint deletion** - removing a path or HTTP method.
- **Removed success response** - e.g. dropping the 200 from a `responses` block.
- **Deleted schemas from `components.schemas`** - even if no longer referenced.
- **Enum value removal** - removing a value from an `enum` array.
  Mark the enum `x-extensible-enum: true` to treat removals as
  non-breaking (clients should ignore unknown values).
- **Response shape narrowing** - changing a property type from `string`
  to `integer`, removing a `required` array entry, etc.
- **Request shape widening into `required`** - making a previously-
  optional request field required.

For the full list, run `oasdiff checks` to dump the active rule set.

## Reading the report

Text output (default) example:

```
1 changes: 1 error, 0 warning, 0 info
error	[response-success-status-removed] at openapi-new.yaml
	in API GET /pets
	the success response status '200' was removed
```

JSON output (for downstream parsing):

```json
[
  {
    "id": "response-success-status-removed",
    "level": 3,
    "operation": "GET",
    "operationId": "listPets",
    "path": "/pets",
    "source": "openapi-new.yaml",
    "section": "paths",
    "text": "the success response status '200' was removed"
  }
]
```

`level: 3` is `ERR`, `2` is `WARN`, `1` is `INFO` per the standard
oasdiff convention. Pipe to `jq` for triage:

```bash
jq -r '.[] | select(.level==3) | "ERR " + .operation + " " + .path + " :: " + .text' breaking.json
```

## CI integration

GitHub Actions example using the Docker image and the `--fail-on ERR`
default:

```yaml
# .github/workflows/openapi-diff.yml
name: openapi-diff

on:
  pull_request:

jobs:
  oasdiff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0   # need merge-base SHA for `git show <base>:openapi.yaml`

      - name: Extract base spec
        run: |
          BASE_SHA=$(git merge-base origin/main HEAD)
          git show $BASE_SHA:openapi.yaml > /tmp/openapi-base.yaml

      - name: Run oasdiff
        run: |
          docker run --rm -v "$PWD:/specs" -v /tmp:/tmp tufin/oasdiff breaking \
            --fail-on ERR \
            --format text \
            /tmp/openapi-base.yaml \
            /specs/openapi.yaml | tee oasdiff-report.txt

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: openapi-breaking-report
          path: oasdiff-report.txt
          retention-days: 14
```

`fetch-depth: 0` is required so the merge-base of the PR resolves; the
shallow clone GitHub uses by default doesn't include the merge-base
commit.

For a PR comment workflow, generate `--format markdown` and post via
`actions/github-script@v7` - the markdown table format includes a
clickable per-finding rationale.

## References

- [oasdiff-readme][readme] - install (Go + Docker), output formats, key
  flags.
- [oasdiff-breaking][breaking] - `breaking` subcommand, severity tiers,
  `--fail-on` semantics, breaking-change categories.
- [`pact-contract-testing`](../pact-contract-testing/SKILL.md) - the
  consumer-driven counterpart for cases where you control consumers.
- [`contract-compatibility-gate`](../contract-compatibility-gate/SKILL.md) - the gate skill that aggregates oasdiff output with Pact and
  Protobuf verdicts.
