---
name: contract-compatibility-gate
description: "Builds a unified deployment-readiness gate that aggregates verdicts from any combination of Pact `can-i-deploy`, oasdiff (OpenAPI), graphql-inspector (GraphQL), and `buf breaking` (Protobuf), applies severity-aware pass/fail thresholds, and emits a single go / no-go decision with per-finding rationale. Use when authoring a CI step that gates a deployment on cross-protocol contract compatibility."
---

# contract-compatibility-gate

## Overview

Modern services rarely speak just one protocol. A single deployment
might depend on Pact verifications (consumer/provider HTTP),
OpenAPI compatibility for an external REST surface, GraphQL schema
regressions for a public graph, and Protobuf breaking-change checks
for internal gRPC. Each tool has its own exit code, its own severity
levels, and its own concept of "breaking":

| Tool                          | Verdict surface                               |
|-------------------------------|-----------------------------------------------|
| Pact `can-i-deploy`           | Exit 0 = yes / 1 = no ([can-i-deploy][cid])   |
| oasdiff `breaking`            | Exit driven by `--fail-on ERR/WARN/INFO` ([oasdiff-breaking][oasdiff]) |
| graphql-inspector `diff`      | Non-zero on BREAKING; zero on DANGEROUS / NON_BREAKING ([gqi-diff][gqi]) |
| `buf breaking`                | Non-zero on any rule violation in active categories ([buf-breaking][buf]) |

[cid]: https://docs.pact.io/pact_broker/can_i_deploy
[oasdiff]: https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md
[gqi]: https://the-guild.dev/graphql/inspector/docs/essentials/diff
[buf]: https://buf.build/docs/breaking

This skill defines a **unified gate**: collect each tool's structured
output, normalize to one record shape, apply a single severity rule,
emit one verdict.

## When to use

- A deployment depends on more than one protocol (typical for a
  service exposing both gRPC + REST, or a frontend consuming both
  GraphQL and REST).
- The team wants the verdict in `$GITHUB_STEP_SUMMARY` (or equivalent)
  rather than four separate "❌ pact" / "❌ oasdiff" CI badges.
- Some checks should be advisory rather than blocking - e.g. block on
  oasdiff ERR but let WARN pass with a comment.
- The team wants per-tool ratchet behavior (existing failures
  grandfathered, new failures block).

If the project uses one protocol only, defer this gate - use the
matching per-tool SKILL.md's "CI integration" section directly.

## How to use

1. **Identify each protocol's source.** For every protocol the deployment
   consumes, run the matching per-tool skill and capture its output as a CI
   artifact (see Identify your sources below).
2. **Normalize findings.** Flatten every tool's per-finding output into the one
   record shape (see The unified record).
3. **Classify severity.** Map each tool's native severity onto
   `blocker` / `warn` / `info` (see Severity normalization).
4. **Apply the gate rule.** Any non-ratcheted `blocker` makes the verdict
   `no-go`; warnings report but do not block by default (see The gate decision
   rule).
5. **Emit one artifact and exit.** Write a single markdown + JSON summary; a
   `no-go` exits non-zero so CI halts. The full gate script, CI wiring, and
   artifact format live in
   [references/gate-implementation-and-ci.md](references/gate-implementation-and-ci.md).

## Identify your sources

For each protocol the deployment consumes, pick the tool from the
matching plugin skill and ensure its output is captured as a CI
artifact (always with `if: always()` on the upload):

| Tool         | Skill                                                                                        | Artifact                            |
|--------------|----------------------------------------------------------------------------------------------|-------------------------------------|
| Pact         | `pact-contract-testing`                                | `can-i-deploy` exit code + matrix   |
| oasdiff      | `openapi-contract-diff`                                | `--format json` array               |
| GraphQL      | `graphql-schema-regression`                        | grep-parsed text or JSON action     |
| Protobuf     | `protobuf-compat-checking`                          | `--error-format json` array         |

## The unified record

Flatten every tool's per-finding output into one shape:

```json
{
  "tool":     "oasdiff",
  "protocol": "openapi",
  "finding":  "response-success-status-removed",
  "severity": "blocker",
  "subject":  "GET /pets",
  "message":  "the success response status '200' was removed",
  "ratchet":  false,
  "owner":    "@api-platform"
}
```

| Field        | Source                                                                                                              |
|--------------|---------------------------------------------------------------------------------------------------------------------|
| `tool`       | `pact` / `oasdiff` / `graphql-inspector` / `buf`.                                                                   |
| `protocol`   | `pact` / `openapi` / `graphql` / `protobuf`.                                                                        |
| `finding`    | tool-specific rule ID (oasdiff `id`, graphql-inspector change type, buf rule like `FIELD_NO_DELETE`).                |
| `severity`   | normalized - `blocker` / `warn` / `info`.                                                                            |
| `subject`    | endpoint / type / message + field that's affected.                                                                  |
| `message`    | human-readable rationale (tool's own message).                                                                       |
| `ratchet`    | optional - `true` if grandfathered; `false` blocks if severity is `blocker`.                                         |
| `owner`      | optional - team/handle responsible for the surface.                                                                 |

### Severity normalization

| Tool                | Tool severity                  | Normalized |
|---------------------|--------------------------------|-----------:|
| Pact                | `can-i-deploy` exit `1`        | `blocker`  |
| oasdiff             | `ERR`                          | `blocker`  |
| oasdiff             | `WARN`                         | `warn`     |
| oasdiff             | `INFO`                         | `info`     |
| graphql-inspector   | `Breaking`                     | `blocker`  |
| graphql-inspector   | `Dangerous`                    | `warn`     |
| graphql-inspector   | `Non-breaking`                 | `info`     |
| buf breaking        | any rule under active category | `blocker`  |

`buf breaking` doesn't classify by severity - every violation is
treated as a blocker. To downgrade, exclude rules in `buf.yaml` rather
than at the gate level (see
`protobuf-compat-checking`).

## The gate decision rule

Pseudocode:

```python
def gate_decision(records, *, allow_warn=True):
    blockers = [
        r for r in records
        if r["severity"] == "blocker" and not r.get("ratchet", False)
    ]
    warnings = [r for r in records if r["severity"] == "warn"]
    return {
        "verdict": "no-go" if blockers else "go",
        "blocker_count": len(blockers),
        "warning_count": len(warnings),
        "blockers": blockers,
        "warnings": warnings,
    }
```

Default behavior is **strict-but-warn-tolerant**: any non-ratcheted
blocker fails the gate; warnings show up in the report but don't
block. For stricter projects, set `allow_warn=False`.

## Worked example

Run the gate on one provider PR end to end. The `pets-api` provider opens a
release PR that (a) removes the `200` response from `GET /pets` in its OpenAPI
spec and (b) deletes `Order.amount` from `orders/v1.proto`. The `web-app`
consumer already has a Pact contract verified against production.

1. **Each protocol step runs and writes its artifact** (each with `|| true`, so a
   failing tool still emits its file):
   - `pact-broker can-i-deploy` for `web-app -> production` exits `0` - the
     consumer never read the deleted field.
   - `oasdiff breaking --format json` records `response-success-status-removed`
     on `GET /pets` at level `ERR`.
   - `buf breaking --error-format json` records `FIELD_NO_DELETE` on
     `orders/v1.Order.amount`.
   - `graphql-inspector diff` records a `Dangerous` change on `Pet.legacyTag`.
2. **The gate script normalizes each finding and classifies severity** per the
   Severity normalization table:

```json
[
  {"tool": "pact", "protocol": "pact", "finding": "can-i-deploy-yes", "severity": "info", "subject": "web-app -> production"},
  {"tool": "oasdiff", "protocol": "openapi", "finding": "response-success-status-removed", "severity": "blocker", "subject": "GET /pets"},
  {"tool": "buf", "protocol": "protobuf", "finding": "FIELD_NO_DELETE", "severity": "blocker", "subject": "orders/v1.Order.amount"},
  {"tool": "graphql-inspector", "protocol": "graphql", "finding": "Dangerous", "severity": "warn", "subject": "Pet.legacyTag"}
]
```

3. **`gate_decision` finds two non-ratcheted blockers**, so the verdict is
   `no-go` (`blocker_count: 2`, `warning_count: 1`).
4. **The gate emits its summary** to `$GITHUB_STEP_SUMMARY` and exits non-zero:

```
# Contract Compatibility Gate - verdict: NO-GO
Blockers: 2
- oasdiff :: GET /pets :: response-success-status-removed
- buf :: orders/v1.Order.amount :: FIELD_NO_DELETE
Warnings: 1
- graphql-inspector :: Pet.legacyTag :: Dangerous
```

The deployment halts on one verdict even though `can-i-deploy` alone would have
passed. To ship, the provider restores the removed response and field, or marks
each finding `ratchet: true` with a documented migration plan. The full gate
script, CI wiring, and artifact format are in
[references/gate-implementation-and-ci.md](references/gate-implementation-and-ci.md).

## References

- `pact-contract-testing`
- `openapi-contract-diff`
- `graphql-schema-regression`
- `protobuf-compat-checking`
- [can-i-deploy][cid] - Pact deployment gate exit codes.
- [oasdiff-breaking][oasdiff] - oasdiff severity tiers.
- [gqi-diff][gqi] - GraphQL Inspector breaking classification.
- [buf-breaking][buf] - buf breaking-change category model.
- Gate script, CI wiring, and artifact format:
  [references/gate-implementation-and-ci.md](references/gate-implementation-and-ci.md).
- `data-quality-gate` and `visual-baseline-gate` - sibling gate skills with the same artifact shape.
