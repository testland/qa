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

## Step 1 - Identify your sources

For each protocol the deployment consumes, pick the tool from the
matching plugin skill and ensure its output is captured as a CI
artifact (always with `if: always()` on the upload):

| Tool         | Skill                                                                                        | Artifact                            |
|--------------|----------------------------------------------------------------------------------------------|-------------------------------------|
| Pact         | [`pact-contract-testing`](../pact-contract-testing/SKILL.md)                                | `can-i-deploy` exit code + matrix   |
| oasdiff      | [`openapi-contract-diff`](../openapi-contract-diff/SKILL.md)                                | `--format json` array               |
| GraphQL      | [`graphql-schema-regression`](../graphql-schema-regression/SKILL.md)                        | grep-parsed text or JSON action     |
| Protobuf     | [`protobuf-compat-checking`](../protobuf-compat-checking/SKILL.md)                          | `--error-format json` array         |

## Step 2 - Define the unified record

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
[`protobuf-compat-checking`](../protobuf-compat-checking/SKILL.md)).

## Step 3 - Apply the gate decision rule

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

## Step 4 - Emit the artifact

Markdown summary suitable for `$GITHUB_STEP_SUMMARY`:

```markdown
# Contract Compatibility Gate — verdict: NO-GO

**Blockers: 2**

| Tool      | Protocol | Finding                          | Subject                | Message                                       |
|-----------|----------|----------------------------------|------------------------|-----------------------------------------------|
| oasdiff   | openapi  | response-success-status-removed  | GET /pets              | success response status '200' was removed     |
| buf       | protobuf | FIELD_NO_DELETE                  | orders/v1.Order.amount | Field "amount" was deleted (active in v1).    |

**Warnings: 1**

| Tool              | Protocol | Finding              | Subject               | Message                              |
|-------------------|----------|----------------------|-----------------------|--------------------------------------|
| graphql-inspector | graphql  | Dangerous            | Pet.legacyTag (added union member) | adding a union member could break enums |
```

Plus a JSON sibling for downstream consumers:

```json
{
  "verdict": "no-go",
  "blocker_count": 2,
  "warning_count": 1,
  "blockers": [...],
  "warnings": [...]
}
```

A no-go verdict exits non-zero so CI halts.

## Worked example: minimal Python implementation

```python
# scripts/run_contract_gate.py
import json, subprocess, sys
from pathlib import Path

records = []

# 1. Pact: trust can-i-deploy's exit code
pact_proc = subprocess.run(
    ["pact-broker", "can-i-deploy",
     "--pacticipant", "web-app",
     "--version", os.environ["GITHUB_SHA"],
     "--to-environment", "production"],
    capture_output=True, text=True,
)
if pact_proc.returncode != 0:
    records.append({
        "tool": "pact", "protocol": "pact",
        "finding": "can-i-deploy-no",
        "severity": "blocker",
        "subject": "web-app -> production",
        "message": pact_proc.stdout.strip().splitlines()[-1] if pact_proc.stdout else "no",
    })

# 2. oasdiff
if Path("oasdiff.json").exists():
    for f in json.loads(Path("oasdiff.json").read_text()):
        sev_map = {3: "blocker", 2: "warn", 1: "info"}
        records.append({
            "tool": "oasdiff", "protocol": "openapi",
            "finding": f["id"],
            "severity": sev_map.get(f["level"], "info"),
            "subject": f"{f['operation']} {f['path']}",
            "message": f["text"],
        })

# 3. graphql-inspector  (parsed from text or JSON action)
# 4. buf breaking      (--error-format json)
# ... (omitted for brevity; same shape)

# Apply gate
blockers = [r for r in records if r["severity"] == "blocker"]
verdict = "no-go" if blockers else "go"

print(f"# Contract Compatibility Gate — verdict: {verdict.upper()}")
for r in blockers:
    print(f"- {r['tool']} :: {r['subject']} :: {r['finding']} ({r['message']})")

sys.exit(0 if verdict == "go" else 1)
```

Wire into CI **after** every protocol step has produced its artifact:

```yaml
- run: pact-broker can-i-deploy ... || true       # don't fail; let gate decide
- run: oasdiff breaking ... --format json > oasdiff.json || true
- run: graphql-inspector diff ... --json > gqi.json || true
- run: buf breaking ... --error-format json > buf.json || true

- name: Contract compatibility gate
  run: python scripts/run_contract_gate.py
```

The `|| true` lets each tool emit its artifact even on failure; the
final gate is the single source of CI truth.

## References

- [`pact-contract-testing`](../pact-contract-testing/SKILL.md)
- [`openapi-contract-diff`](../openapi-contract-diff/SKILL.md)
- [`graphql-schema-regression`](../graphql-schema-regression/SKILL.md)
- [`protobuf-compat-checking`](../protobuf-compat-checking/SKILL.md)
- [can-i-deploy][cid] - Pact deployment gate exit codes.
- [oasdiff-breaking][oasdiff] - oasdiff severity tiers.
- [gqi-diff][gqi] - GraphQL Inspector breaking classification.
- [buf-breaking][buf] - buf breaking-change category model.
- [`data-quality-gate`](../../../qa-data-quality/skills/data-quality-gate/SKILL.md)
  and
  [`visual-baseline-gate`](../../../qa-visual-regression/skills/visual-baseline-gate/SKILL.md) - sibling gate skills with the same artifact shape.
