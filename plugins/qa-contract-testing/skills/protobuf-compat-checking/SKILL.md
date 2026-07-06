---
name: protobuf-compat-checking
description: "Wraps `buf breaking` to compare a Protobuf schema against a past version, classifies breaking changes by category (FILE / PACKAGE / WIRE_JSON / WIRE), configures buf.yaml rule selection plus per-path exemptions, and gates CI on the exit code. Use when reviewing `.proto` changes in a PR for gRPC services, BSR modules, or schema-versioned message bus payloads."
---

# protobuf-compat-checking

## Overview

`buf breaking` is the canonical Protobuf compatibility checker from
the Buf project ([buf-breaking][breaking]). It compares the current
schema against a **past version** (BSR module, Git ref, tarball, or
buf image) and reports changes that would break clients, servers, or
generated code.

[breaking]: https://buf.build/docs/breaking
[buf-yaml]: https://buf.build/docs/configuration/v2/buf-yaml

This is the Protobuf-specific counterpart to
[`openapi-contract-diff`](../openapi-contract-diff/SKILL.md) (REST) and
[`graphql-schema-regression`](../graphql-schema-regression/SKILL.md)
(GraphQL).

## When to use

- The repo has `.proto` files (gRPC service definitions, message-bus
  schemas, internal data contracts).
- The team uses Buf Schema Registry (BSR) or git-versioned Protobuf
  modules.
- A CI gate is needed on schema regressions before pushing a new
  version of generated client / server code.
- The team needs **per-category** strictness - e.g. FILE-level checks
  during early development, downgrade to WIRE for stable v1+ APIs
  where source-level changes are acceptable but wire-format breakage
  is not.

## Breaking categories

`buf breaking` rules ship in four nested categories - **stricter
subsumes looser** ([buf-breaking][breaking]):

| Category    | Detects                                                 |
|-------------|---------------------------------------------------------|
| `FILE`      | Source-code breakage per-file. **Default**; strictest.  |
| `PACKAGE`   | Source-code breakage per-package.                       |
| `WIRE_JSON` | Wire-format **or** JSON-encoding breakage.              |
| `WIRE`      | Wire-format breakage only. Loosest.                     |

Choose `FILE` for new internal services where source compatibility
matters; choose `WIRE_JSON` for stable APIs where source rearrangement
(e.g. moving a message between files) is acceptable but JSON-mapping
breakage is not; choose `WIRE` only when JSON encoding is
out-of-scope.

## Configuration

`buf.yaml` v2 form ([buf-yaml][buf-yaml]):

```yaml
version: v2
modules:
  - path: proto
    name: buf.build/acme/foo
breaking:
  use:
    - FILE
  except:
    - FILE_NO_DELETE          # allow file deletions despite using FILE
  ignore:
    - foo/legacy/             # exclude entire path from all breaking rules
  ignore_only:
    FILE_NO_DELETE:
      - foo/bar.proto         # exclude specific path from a specific rule
  ignore_unstable_packages: true   # ignore v1alpha1 / v1beta1 / *test* packages
```

`version: v2` is required for the structure above; legacy `v1` and
`v1beta1` files use a different shape ([buf-yaml][buf-yaml]). When
migrating, run `buf migrate v1tov2` to convert.

`ignore_unstable_packages: true` is the canonical pattern - Protobuf
convention is that `v1alpha1`, `v1beta1`, and `*test*` packages are
unstable and explicitly NOT covered by compatibility guarantees.

## Running

### Against a Git reference

```bash
buf breaking --against '.git#branch=main'
buf breaking --against '.git#tag=v1.2.0'
buf breaking --against '.git#ref=HEAD~1'
```

(Per [buf-breaking][breaking].)

The `.git#...` syntax tells buf to checkout the referenced ref into a
temp directory and use it as the baseline. This is the most common CI
pattern: compare PR against `main`.

### Against a BSR module

```bash
buf breaking --against buf.build/acme/foo
buf breaking --against buf.build/acme/foo:<commit-sha>
```

Use the BSR baseline when the team treats BSR as the source of truth
and a release labeled `v1` is what production is consuming.

### Against a tarball or buf image

```bash
buf breaking --against archive.tar.gz
buf breaking --against image.bin       # buf-image-format binary
```

Useful for hermetic builds where the baseline is published as an
artifact rather than a git ref.

## Reading the report

`buf breaking` exits non-zero on detected breaking changes. The
default output prints one line per finding with the offending file,
line, column, rule ID, and message:

```
proto/orders/v1/order.proto:42:3:Field "1" with name "amount" on message
"Order" has the same number as deleted field with name "total".
[ENUM_VALUE_NO_DELETE_RESERVED]
```

For machine consumption, supply `--error-format json`:

```bash
buf breaking --against '.git#branch=main' --error-format json
```

```json
{
  "path": "proto/orders/v1/order.proto",
  "start_line": 42,
  "start_column": 3,
  "type": "ENUM_VALUE_NO_DELETE_RESERVED",
  "message": "Field 1 ..."
}
```

Pipe to `jq` for triage:

```bash
buf breaking --against '.git#branch=main' --error-format json | \
  jq -r '"\(.type) \(.path):\(.start_line) — \(.message)"'
```

## CI integration

### GitHub Actions

The Buf project ships an official Action (`bufbuild/buf-action`) that
runs lint + breaking + push against BSR in one job. For self-hosted
breaking-only:

```yaml
# .github/workflows/buf-breaking.yml
name: buf-breaking

on:
  pull_request:
    paths:
      - '**/*.proto'
      - 'buf.yaml'
      - 'buf.lock'

jobs:
  breaking:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0   # need history for `.git#branch=main` baseline

      - uses: bufbuild/buf-setup-action@v1

      - name: buf breaking
        run: buf breaking --against '.git#branch=main,subdir=.'
```

`fetch-depth: 0` is required so the `.git#branch=main` ref resolves - 
the default shallow clone doesn't have it.

For stricter pipelines, also gate on `buf lint`:

```yaml
- name: buf lint
  run: buf lint
- name: buf breaking
  run: buf breaking --against '.git#branch=main,subdir=.'
```

### Tag-based releases

For projects using git tags as release boundaries:

```bash
# Compare PR vs the latest released tag
LATEST_TAG=$(git describe --tags --abbrev=0)
buf breaking --against ".git#tag=${LATEST_TAG}"
```

This catches breaking changes vs production, not just vs the trunk
HEAD - useful when `main` itself contains in-progress un-released work.

## References

- [buf-breaking][breaking] - `buf breaking` semantics, categories,
  baseline reference formats.
- [buf-yaml][buf-yaml] - v2 `buf.yaml` configuration; `breaking.use`,
  `except`, `ignore`, `ignore_only`, `ignore_unstable_packages`.
- [`openapi-contract-diff`](../openapi-contract-diff/SKILL.md) - REST
  counterpart.
- [`graphql-schema-regression`](../graphql-schema-regression/SKILL.md) - GraphQL counterpart.
- [`contract-compatibility-gate`](../contract-compatibility-gate/SKILL.md) - gate skill aggregating breaking-change verdicts across protocols.
