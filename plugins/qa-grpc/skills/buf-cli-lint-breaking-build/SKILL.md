---
name: buf-cli-lint-breaking-build
description: "Wraps the buf CLI for protobuf workflow gating: `buf build` (compile / validate .proto files), `buf lint` (STANDARD rule set: snake_case field names, Service-suffixed service names), `buf breaking --against <ref>` (detect breaking changes vs a git baseline or registry image), and `buf format`. Use as the proto-lint + breaking-change gate in CI for any gRPC service, to debug a buf breaking failure by rule ID (e.g. FIELD_NO_DELETE_UNLESS_NUMBER_RESERVED), and to select the FILE vs WIRE_JSON breaking ruleset for binary-only vs JSON consumers. Scoped to single-service schema lint + breaking-build, not cross-service contract testing."
---

# buf-cli-lint-breaking-build

## Overview

Per
[buf.build/docs/cli/quickstart/](https://buf.build/docs/cli/quickstart/),
"the Buf CLI requires version 1.32.0 or higher" and provides
five primary commands: `build`, `lint`, `breaking`, `generate`,
`format`. This skill wraps three of them - `build`, `lint`,
`breaking` - as the proto-PR gate. Pairs with
[`protobuf-versioning-strategy-reference`](../protobuf-versioning-strategy-reference/SKILL.md)
for the catalog of what counts as breaking and why.

## When to use

- Adding buf as the proto lint + breaking-change gate on a new
  repo.
- A PR changes `.proto` files - need to gate the merge.
- Investigating a `buf breaking` failure - what rule fired?
- Configuring buf for a monorepo with multiple proto modules.

## Authoring

### Install

Per buf docs, install via Homebrew, Go install, or release binary.
Verify:

```bash
buf --version
# 1.32.0 or higher
```

### Configure `buf.yaml`

The v2 format per
[buf.build/docs/cli/quickstart/](https://buf.build/docs/cli/quickstart/):

```yaml
version: v2
modules:
  - path: proto
lint:
  use:
    - STANDARD
breaking:
  use:
    - FILE          # default; choose per protobuf-versioning-strategy-reference
```

`STANDARD` is the recommended lint rule set; it enforces
conventions like "Field name should be lower_snake_case" and
"Service name should be suffixed with Service".

The choice of `breaking.use` (FILE / PACKAGE / WIRE_JSON / WIRE)
follows the per-deployment-model logic in
[`protobuf-versioning-strategy-reference`](../protobuf-versioning-strategy-reference/SKILL.md).

### Configure `buf.gen.yaml` (codegen)

```yaml
version: v2
managed:
  enabled: true
plugins:
  - remote: buf.build/protocolbuffers/go
    out: gen
    opt: paths=source_relative
```

`managed: enabled: true` automatically sets file options without
hand-coding (e.g., `go_package`).

## Running

### Local validation pipeline

```bash
buf build && buf lint && buf breaking --against ".git#branch=main"
```

Three gates in order: compile, lint, breaking. All three must
pass before merge.

### `buf build`

```bash
buf build
# Silent exit on success
```

Compiles every `.proto` in the workspace. Silent → success. Any
output → error. Equivalent to `protoc` compilation but reads
`buf.yaml` for paths.

### `buf lint`

```bash
buf lint
# Emits violations as: <file>:<line>:<col>:<msg>
```

Validates against the configured rule set. Common failures:

| Failure | Rule | Fix |
|---|---|---|
| `Field name "userId" should be lower_snake_case` | `FIELD_LOWER_SNAKE_CASE` | Rename to `user_id` |
| `Service "Users" should be suffixed with "Service"` | `SERVICE_SUFFIX` | Rename to `UsersService` |
| `Message "user_data" should be UpperCamelCase` | `MESSAGE_UPPER_CAMEL_CASE` | Rename to `UserData` |
| `Enum value should be SCREAMING_SNAKE_CASE` | `ENUM_VALUE_UPPER_SNAKE_CASE` | Rename |

### `buf breaking`

```bash
buf breaking --against ".git#branch=main"
# Compares working tree against main branch
```

Baselines (per [buf docs](https://buf.build/docs/cli/quickstart/)):

| Baseline | Use |
|---|---|
| `".git#branch=main"` | Compare against main branch (CI default) |
| `".git#tag=v1.0.0"` | Compare against a release tag |
| `".git#subdir=path/to/proto"` | Sub-directory baseline (monorepo) |
| `"path/to/image.bin"` | Pre-built `buf build` image file |
| `"buf.build/owner/module"` | Compare against published BSR image |

Output on violation:

```
proto/foo.proto:42:5: Field "old_name" with type "string" no longer exists (rule FIELD_NO_DELETE_UNLESS_NUMBER_RESERVED).
```

Per [buf breaking rules](https://buf.build/docs/breaking/rules):
each violation cites the rule that fired so you know which
category constraint was violated.

## Parsing results

### CLI output (text, default)

Each violation: `<file>:<line>:<col>: <message> (rule <RULE_ID>).`

Pipe to grep / awk for counts:

```bash
buf breaking --against ".git#branch=main" 2>&1 | tee buf-breaking.log
wc -l buf-breaking.log
```

### Machine-readable output

```bash
buf lint --error-format=json
# Emits: [{"path":"...","start_line":...,"start_col":...,"end_line":...,"type":"FIELD_LOWER_SNAKE_CASE","message":"..."}]

buf breaking --against ".git#branch=main" --error-format=json
```

For consumption by a unified reporter.

## CI integration

```yaml
# .github/workflows/proto-gate.yml
name: proto-gate
on:
  pull_request:
    paths:
      - "**/*.proto"
      - "buf.yaml"
      - "buf.gen.yaml"

jobs:
  buf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0   # Required for `--against ".git#branch=main"`
      - uses: bufbuild/buf-setup-action@v1
        with:
          buf_user: ${{ secrets.BUF_USER }}
          buf_api_token: ${{ secrets.BUF_API_TOKEN }}
      - run: buf build
      - run: buf lint
      - run: buf breaking --against ".git#branch=main"
```

Key: `fetch-depth: 0` so git has the baseline commit available.

The official `bufbuild/buf-setup-action` and
`bufbuild/buf-breaking-action` are convenient but the raw CLI
calls above work without them.

### Per-PR comment

```yaml
      - if: failure()
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: proto-gate
          message: |
            ❌ `buf breaking` failed. See log:
            ```
            ${{ steps.breaking.outputs.stdout }}
            ```
            Consult
            [protobuf-versioning-strategy-reference](../protobuf-versioning-strategy-reference/SKILL.md)
            for whether this change is genuinely required and how
            to do it safely (reserve, add new, deprecate old).
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skipping `buf breaking` on PR | Subtle wire breakage merges; consumers crash at deploy time | Always gate; never `--ignore` blanket |
| Comparing against the PR's own merge base | Self-baseline; no detection | Use `".git#branch=main"` |
| `fetch-depth: 1` in CI | git can't reach baseline → buf errors | `fetch-depth: 0` |
| `breaking.use: WIRE` for codegen consumers | Generated code break (rename) passes; consumer build fails | Use `FILE` or `PACKAGE` per protobuf-versioning-strategy-reference |
| Adding `--ignore` to suppress a real violation | Silent regression | Use proper reserved + deprecation instead |
| Lint set `MINIMAL` for new projects | Misses snake_case + service-suffix conventions early | Use `STANDARD` from day 1 |
| One `buf.yaml` per proto file | Doesn't compose; lint runs N times | One `buf.yaml` at module root |
| Inconsistent baselines (main vs tag) | Different reviewers see different verdicts | Pick one CI baseline; document |

## Limitations

- **Semantic vs wire breakage.** Per
  [`protobuf-versioning-strategy-reference`](../protobuf-versioning-strategy-reference/SKILL.md),
  buf detects binary/codegen breakage. Semantic meaning changes
  ("field now means net price, not gross") are undetectable.
- **No cross-service compatibility.** This is single-service
  schema lint. For service-to-service contract testing see
  `protobuf-compat-checking`.
- **BSR features require auth.** Remote plugins, registry pushes,
  and `buf.build/...` baselines need a BSR account.
- **JSON-name detection** is in WIRE_JSON only. Services that
  use only binary won't see JSON name changes detected.
- **Doesn't generate code automatically.** `buf generate` is a
  separate step; this skill scopes to gating.

## References

- buf CLI quickstart:
  [buf.build/docs/cli/quickstart/](https://buf.build/docs/cli/quickstart/).
- buf breaking rules:
  [buf.build/docs/breaking/rules](https://buf.build/docs/breaking/rules).
- Companion catalog:
  [`protobuf-versioning-strategy-reference`](../protobuf-versioning-strategy-reference/SKILL.md).
- Status code vocabulary:
  [`grpc-status-code-mapping-reference`](../grpc-status-code-mapping-reference/SKILL.md).
- Sibling tools:
  [`ghz-load`](../ghz-load/SKILL.md),
  [`grpcurl-cli`](../grpcurl-cli/SKILL.md),
  [`grpc-mock`](../grpc-mock/SKILL.md).
- Cross-service contract testing:
  `protobuf-compat-checking`.
