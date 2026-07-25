# Visual baseline gate - artifact format and CI wiring

Deep reference for the `visual-baseline-gate` SKILL.md. Consult when emitting
the gate's markdown + JSON artifact or wiring the gate into a CI pipeline.

## Markdown artifact

The gate writes `visual-gate.md`. Its shape matches `data-quality-gate` for
cross-domain consistency:

```markdown
# Visual Baseline Gate - verdict: NO-GO

**Blockers: 2**

| Snapshot                  | Engine     | Category    | Reason                         | Diff |
|---------------------------|------------|-------------|--------------------------------|------|
| dashboard-mobile-375      | playwright | regression  | text-truncation                | [diff](playwright-report/data/dashboard-mobile-375-diff.png) |
| pricing-desktop-1280      | chromatic  | intentional | missing reviewer acceptance    | [build](https://chromatic.com/build/...) |

**Incidentals (advisory): 1**

| Snapshot                | Engine | Category   | Pattern         |
|-------------------------|--------|------------|-----------------|
| onboarding-tablet-768   | percy  | incidental | anti-aliasing   |

**Intentional + accepted: 5**

(see .visual-acceptance.yml for rationale)
```

## JSON sibling

A machine-readable `visual-gate.json` for downstream tooling:

```json
{
  "verdict": "no-go",
  "blockers": [...],
  "incidentals": [...],
  "intentional_accepted": [...]
}
```

A no-go verdict exits non-zero so CI halts.

## CI entrypoint script

A minimal runnable gate that reads both inputs, fails closed when no
classifications were produced, and exits non-zero on no-go:

```python
# scripts/run_visual_gate.py
import json, os, sys, yaml
from pathlib import Path

CLASS_PATH = Path("visual-classifications.json")  # output of the visual-diff classification step
ACCEPT_PATH = Path(".visual-acceptance.yml")

if not CLASS_PATH.exists():
    print("No visual classifications produced - fail closed.")
    sys.exit(1)

classifications = json.loads(CLASS_PATH.read_text())
acceptance = yaml.safe_load(ACCEPT_PATH.read_text()) if ACCEPT_PATH.exists() else {"snapshots": []}
accepted = {s["snapshot"] for s in acceptance.get("snapshots", [])}

blockers = []
for c in classifications:
    if c["category"] == "regression":
        blockers.append((c, "regression"))
    elif c["category"] == "intentional" and c["snapshot"] not in accepted:
        blockers.append((c, "missing reviewer acceptance"))

verdict = "no-go" if blockers else "go"
print(f"# Visual Baseline Gate - verdict: {verdict.upper()}")
for c, reason in blockers:
    print(f"- {c['engine']} :: {c['snapshot']} :: {reason}")

sys.exit(0 if verdict == "go" else 1)
```

## GitHub Actions wiring

Run the gate after each engine has produced its diff manifest and after the
visual-diff classification step has produced `visual-classifications.json`:

```yaml
- name: Run visual-diff classification (advisory)
  run: |
    # produces visual-classifications.json
    ...

- name: Visual baseline gate
  run: python scripts/run_visual_gate.py

- name: Upload gate artifact
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: visual-baseline-gate
    path: |
      visual-classifications.json
      visual-gate.json
      visual-gate.md
    retention-days: 14
```

The `if: always()` upload keeps the artifact even on a no-go exit, so
reviewers can audit which snapshots blocked the merge.
