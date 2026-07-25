# Contract compatibility gate - implementation and CI wiring

Deep reference for the `contract-compatibility-gate` SKILL.md. Consult when
implementing the gate script, specifying the emitted artifact format, or wiring
the gate into CI after each protocol step has run.

## Emitting the artifact

Markdown summary suitable for `$GITHUB_STEP_SUMMARY`:

```markdown
# Contract Compatibility Gate - verdict: NO-GO

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

## Reference implementation

```python
# scripts/run_contract_gate.py
import json, os, subprocess, sys
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

print(f"# Contract Compatibility Gate - verdict: {verdict.upper()}")
for r in blockers:
    print(f"- {r['tool']} :: {r['subject']} :: {r['finding']} ({r['message']})")

sys.exit(0 if verdict == "go" else 1)
```

## Wiring into CI

Run the gate **after** every protocol step has produced its artifact:

```yaml
- run: pact-broker can-i-deploy ... || true       # don't fail; let gate decide
- run: oasdiff breaking ... --format json > oasdiff.json || true
- run: graphql-inspector diff ... --json > gqi.json || true
- run: buf breaking ... --error-format json > buf.json || true

- name: Contract compatibility gate
  run: python scripts/run_contract_gate.py
```

The `|| true` lets each tool emit its artifact even on failure; the final gate
is the single source of CI truth.
