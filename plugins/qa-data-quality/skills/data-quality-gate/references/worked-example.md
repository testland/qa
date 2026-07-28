# Worked example: minimal Python implementation

An end-to-end collector that reads each engine's artifact, flattens it into the
unified check record (Step 2), applies the Step 3 gate decision, and exits
non-zero on a no-go verdict.

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

print(f"# Data Quality Gate - verdict: {verdict.upper()}")
print(f"\nBlockers: {len(blockers)}\n")
for r in blockers:
    print(f"- {r['engine']} :: {r['subject']} :: {r['check_id']} ({r['failures']} failures)")

sys.exit(0 if verdict == "go" else 1)
```

Wire into CI **after** every engine step has produced its artifact:

```yaml
# .github/workflows/quality-gate.yml (excerpt)
- run: dbt build || true                  # don't fail yet - let gate decide
- run: python scripts/run_gx_gate.py || true
- run: soda scan -d warehouse -c configuration.yml checks.yml > scan.log || true
- run: python scripts/run_quality_gate.py
```

The `|| true` lets each engine emit its artifact even on failure; the
final gate is the single source of CI truth.
