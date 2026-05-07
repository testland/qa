---
name: data-quality-gate
description: "Builds a release-readiness gate for a data pipeline by gathering check results from one or more engines (dbt, Great Expectations, Soda), applying severity-aware pass/fail thresholds, and emitting a single go / no-go decision with per-check rationale. Use when authoring a CI step that must fail the build when data quality drops below thresholds."
rating: 23
d6: 3
archetype: S3
---

# data-quality-gate

## Overview

The S1 skills in this plugin (`dbt-testing`, `great-expectations`,
`soda-checks`) each produce their own per-check output: dbt writes
`run_results.json` ([dbt-run-results][1]), Great Expectations returns a
JSON result with a `success` flag and a `results` list
([gx-run-validation-definition][2]), and Soda emits a per-check
pass/fail summary in stdout (and to Soda Cloud) ([sodacl-overview][3]).

[1]: https://docs.getdbt.com/reference/artifacts/run-results-json
[2]: https://docs.greatexpectations.io/docs/core/run_validations/run_a_validation_definition
[3]: https://docs.soda.io/soda-v3/soda-cl-overview.md

This skill builds a **single release-readiness gate** that consumes those
heterogeneous outputs, applies severity-aware thresholds, and emits one
`go` / `no-go` decision the CI pipeline can act on. The skill is
deliberately engine-agnostic at the surface so a project can mix engines
(e.g. dbt for transformation tests + GX for ingestion validation + Soda
for cross-team observability) and still ship a single gate.

## When to use

- A pipeline runs more than one data-quality engine and needs a unified
  pass/fail summary (instead of one CI job per engine).
- Some checks are blocking (`severity: error`) and others should warn
  but not stop the pipeline (`severity: warn`) — the gate must
  distinguish.
- The team wants a structured artifact (JSON / markdown table) for PR
  comments, dashboards, or post-mortems — not just `exit 1`.
- A migration is rolling out new checks; the gate needs to honor a
  per-check "ratchet" (existing failures grandfathered, new failures
  block).

If a project uses only **one** engine and does not need severity
tiering, prefer that engine's native CI integration directly (see the
relevant S1 skill's "CI integration" section) — this gate adds
machinery you do not need.

## Step 1 — Identify your sources

Enumerate every check-emitting engine the gate must consume. For each:

| Engine | Result artifact | Schema |
|---|---|---|
| dbt   | `target/run_results.json` | `.results[]` with `unique_id`, `status`, `failures`, `message` ([dbt-run-results][1]) |
| GX    | Python object from `validation_definition.run()` or `checkpoint.run()` — has `success: bool` plus `results[]` of per-expectation outcomes ([gx-run-validation-definition][2]) |
| Soda  | stdout summary from `soda scan`; non-zero exit on any failure ([sodacl-overview][3]) |
| Other | custom — must be flattened into the unified shape below |

Persist each engine's raw artifact as a CI build artifact (matching the
pattern from each S1 skill's "CI integration" section) so the gate input
is reproducible and triageable.

## Step 2 — Define the unified check record

Flatten every engine's result into one record shape:

```json
{
  "check_id":     "dbt.test.orders.unique_order_id",
  "engine":       "dbt",
  "subject":      "orders.order_id",
  "status":       "fail",
  "severity":     "error",
  "failures":     12,
  "message":      "12 unique-key violations",
  "ratchet":      false,
  "owner":        "@data-platform"
}
```

| Field | Source |
|---|---|
| `check_id`  | engine-prefixed unique ID (`dbt.test.<unique_id>`, `gx.<suite>.<expectation_type>`, `soda.<dataset>.<check_text>`). |
| `engine`    | `dbt` / `gx` / `soda` / custom. |
| `subject`   | `<dataset>.<column>` or `<dataset>` for table-level checks. |
| `status`    | `pass` / `fail` / `warn` / `error` (engine-specific values normalized). |
| `severity`  | `error` (gate-blocking) or `warn` (gate-tolerable). Source: dbt `severity:` config; GX `meta` block convention; Soda `warn:` / `fail:` blocks. |
| `failures`  | row count for row-level checks; 0/1 for boolean checks. |
| `message`   | human-readable failure message. |
| `ratchet`   | optional — `true` if the failure existed before the ratchet date and is grandfathered. |
| `owner`     | optional — team/handle responsible for the dataset. |

## Step 3 — Apply the gate decision rule

Pseudocode:

```python
def gate_decision(records, *, allow_warn_failures=True):
    blockers = [
        r for r in records
        if r["status"] in ("fail", "error")
        and r["severity"] == "error"
        and not r.get("ratchet", False)
    ]
    warnings = [
        r for r in records
        if (r["status"] in ("fail", "error") and r["severity"] == "warn")
        or r["status"] == "warn"
    ]
    return {
        "verdict": "no-go" if blockers else "go",
        "blocker_count": len(blockers),
        "warning_count": len(warnings),
        "blockers": blockers,
        "warnings": warnings,
    }
```

The default is **strict-but-warn-tolerant**: any non-ratcheted error-severity
failure blocks; warn-severity failures and ratcheted records show in the
report but do not block.

For a stricter mode (no warn tolerance), set `allow_warn_failures=False`
and treat `warning_count > 0` as a blocker.

## Step 4 — Emit the artifact

The gate produces a markdown summary suitable for both `$GITHUB_STEP_SUMMARY`
and Soda Cloud / Slack pipelines:

```markdown
# Data Quality Gate — verdict: NO-GO

**Blockers: 2**

| Engine | Subject              | Check                  | Failures | Owner            |
|--------|----------------------|------------------------|---------:|------------------|
| dbt    | orders.order_id      | unique                 |       12 | @data-platform   |
| gx     | orders.discount_pct  | ExpectColumnValuesToBeBetween | 4 | @analytics-eng   |

**Warnings: 1**

| Engine | Subject     | Check               | Failures | Owner       |
|--------|-------------|---------------------|---------:|-------------|
| soda   | customers   | row_count > 0       |        0 | @platform   |
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

A no-go verdict exits non-zero so the CI pipeline halts.

## Worked example: minimal Python implementation

```python
# scripts/run_quality_gate.py
import json, sys, subprocess
from pathlib import Path

records = []

# Source: dbt run_results.json
dbt_path = Path("target/run_results.json")
if dbt_path.exists():
    rr = json.loads(dbt_path.read_text())
    for r in rr.get("results", []):
        if not r["unique_id"].startswith("test."):
            continue
        records.append({
            "check_id": f"dbt.{r['unique_id']}",
            "engine": "dbt",
            "subject": r["unique_id"].split(".")[-1],
            "status": "fail" if r["status"] == "fail" else "pass",
            "severity": "error",   # dbt severity defaults to error
            "failures": r.get("failures") or 0,
            "message": r.get("message") or "",
        })

# Source: Great Expectations result (deserialized from JSON dump)
gx_path = Path("gx/result.json")
if gx_path.exists():
    gx = json.loads(gx_path.read_text())
    for r in gx.get("results", []):
        cfg = r.get("expectation_config", {})
        records.append({
            "check_id": f"gx.{cfg.get('type', 'unknown')}",
            "engine": "gx",
            "subject": cfg.get("kwargs", {}).get("column", ""),
            "status": "pass" if r.get("success") else "fail",
            "severity": cfg.get("meta", {}).get("severity", "error"),
            "failures": r.get("result", {}).get("unexpected_count", 0),
            "message": cfg.get("type", ""),
        })

# Source: Soda scan stdout (parsed line-by-line)
soda_path = Path("scan.log")
if soda_path.exists():
    for line in soda_path.read_text().splitlines():
        if line.strip().startswith("FAIL"):
            records.append({
                "check_id": f"soda.{line.strip()}",
                "engine": "soda",
                "subject": "",
                "status": "fail",
                "severity": "error",
                "failures": 1,
                "message": line.strip(),
            })

# Apply gate
blockers = [r for r in records if r["status"] == "fail" and r["severity"] == "error"]
verdict = "no-go" if blockers else "go"

print(f"# Data Quality Gate — verdict: {verdict.upper()}")
print(f"\nBlockers: {len(blockers)}\n")
for r in blockers:
    print(f"- {r['engine']} :: {r['subject']} :: {r['check_id']} ({r['failures']} failures)")

sys.exit(0 if verdict == "go" else 1)
```

Wire into CI **after** every engine step has produced its artifact:

```yaml
# .github/workflows/quality-gate.yml (excerpt)
- run: dbt build || true                  # don't fail yet — let gate decide
- run: python scripts/run_gx_gate.py || true
- run: soda scan -d warehouse -c configuration.yml checks.yml > scan.log || true
- run: python scripts/run_quality_gate.py
```

The `|| true` lets each engine emit its artifact even on failure; the
final gate is the single source of CI truth.

## References

- [`dbt-testing/SKILL.md`](../dbt-testing/SKILL.md) — dbt
  `run_results.json` schema and field meanings.
- [`great-expectations/SKILL.md`](../great-expectations/SKILL.md) — GX
  result object shape and `result_format` levels.
- [`soda-checks/SKILL.md`](../soda-checks/SKILL.md) — Soda CLI invocation
  and stdout summary format.
- [dbt-run-results][1] — canonical run_results.json schema.
- [gx-run-validation-definition][2] — GX `validation_definition.run()`
  return shape.
- [sodacl-overview][3] — SodaCL check vocabulary.
