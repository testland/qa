---
name: a11y-violation-gate
description: "Builds a CI gate that fails the build on **new** WCAG / a11y violations introduced by a PR while grandfathering pre-existing violations on a per-rule / per-page baseline. Aggregates verdicts from axe-core / pa11y / Lighthouse a11y / WAVE / IBM Equal Access scans. Use when a project has accumulated a11y debt and a strict \"zero violations\" gate would block every PR - the ratchet pattern lets the team ship while preventing regressions."
---

# a11y-violation-gate

## Overview

A binary "all or nothing" a11y gate blocks every PR on a project
with accumulated debt, so teams disable it. The **ratchet pattern**
fixes this: the gate fails only on **new** violations vs. a stored
baseline. Existing violations are grandfathered; fixes shrink the
baseline.

This skill builds that gate, aggregating outputs from any
combination of `axe-a11y`, `pa11y-a11y`, `lighthouse-a11y`,
`wave-a11y`, and `ibm-equal-access-a11y`.

Sibling gates with the same architecture: `data-quality-gate`,
`visual-baseline-gate`, `contract-compatibility-gate`,
`perf-budget-gate`.

## When to use

- The project has a11y debt and the team wants to gate against
  regressions while paying down the debt over time.
- Multiple a11y scanners run in CI; the team wants one verdict.
- Per-rule or per-page severity tiering matters (e.g. block on
  serious/critical, warn on moderate).

If the project is a11y-clean already, prefer a strict scanner-
native gate (e.g. `axe-core` configured to fail on any violation)
without ratchet - simpler.

## Step 1 - Run the scanners and unify their outputs

Each scanner emits its own report shape (axe-core `violations[]`,
pa11y `issues[]`, Lighthouse `categories.accessibility.audits`,
WAVE `categories`, IBM Equal Access `results[]`). Normalize every
finding to one unified record:

```json
{
  "scanner": "axe",
  "rule_id": "color-contrast",
  "wcag_sc": "1.4.3",
  "page_url": "/dashboard",
  "selector": "button.primary",
  "severity": "serious",
  "fingerprint": "axe::color-contrast::/dashboard::button.primary"
}
```

The **fingerprint** is the load-bearing field - same fingerprint
across runs = same violation; a new fingerprint = a new violation.
Per-scanner output shapes and field mappings are in
[references/gate-implementation.md](references/gate-implementation.md).

## Step 2 - Maintain a baseline

The baseline is a checked-in JSON file listing every grandfathered
fingerprint:

```json
{
  "version": 1,
  "updated_at": "2026-05-04T12:00:00Z",
  "violations": [
    "axe::color-contrast::/legacy-page::div.subtitle",
    "axe::label::/old-form::input#user_email",
    "pa11y::WCAG2AA.Principle1.Guideline_1_4.1_4_3.G18.Fail::/legacy-page::span.muted"
  ]
}
```

Check it into the repo at `a11y-baseline.json`. Update it
**deliberately** (as part of cleanup PRs); never auto-update from
CI.

## Step 3 - Apply the gate decision

Grandfather any fingerprint in the baseline, then block on new
violations by severity tier:

| Severity tier            | Behavior                                 |
|--------------------------|------------------------------------------|
| Block (critical/serious) | Fail the build.                          |
| Warn (moderate)          | Surface in PR comment; no build failure. |
| Info (minor)             | Log; no PR comment unless count > N.     |

The runnable gate (axe-core ingestion shown; extend to the other
scanners per
[references/gate-implementation.md](references/gate-implementation.md)):

```python
# scripts/run_a11y_gate.py
import json, sys
from pathlib import Path

records = []
axe_path = Path("axe-results.json")
if axe_path.exists():
    axe = json.loads(axe_path.read_text())
    url = axe.get('url', '/')
    for v in axe.get('violations', []):
        for node in v.get('nodes', []):
            sel = node.get('target', ['?'])[0]
            records.append({
                'scanner': 'axe', 'rule_id': v['id'],
                'wcag_sc': v.get('tags', [None])[-1],
                'page_url': url, 'selector': sel,
                'severity': v.get('impact', 'moderate'),
                'fingerprint': f"axe::{v['id']}::{url}::{sel}",
            })

baseline = set()
bp = Path("a11y-baseline.json")
if bp.exists():
    baseline = set(json.loads(bp.read_text()).get('violations', []))

seen = {r['fingerprint'] for r in records}
new = [r for r in records if r['fingerprint'] not in baseline]
blockers = [r for r in new if r['severity'] in ('critical', 'serious')]
warnings = [r for r in new if r['severity'] == 'moderate']
fixed = [f for f in baseline if f not in seen]   # shrinking baseline

verdict = 'no-go' if blockers else 'go'
print(f"# A11y Gate - verdict: {verdict.upper()}")
print(f"blockers={len(blockers)} warnings={len(warnings)} fixed={len(fixed)}")
for r in blockers:
    print(f"- {r['scanner']} :: {r['rule_id']} on {r['page_url']} ({r['selector']})")
sys.exit(0 if verdict == 'go' else 1)
```

The **shrinking baseline** counter (`fixed`) is the positive
signal: when baseline fingerprints disappear from the latest scan,
the team fixed them. Surface it as "5 fixed / 47 remaining." A
no-go verdict exits non-zero so CI halts.

## Step 4 - Emit the PR artifact

For a PR comment or `$GITHUB_STEP_SUMMARY`, render the verdict as a
markdown table grouping blockers, warnings, the grandfathered count,
and the fixed-since-baseline count, then a recommended-next-step
block. Full template:
[references/gate-implementation.md](references/gate-implementation.md).

## Step 5 - Baseline maintenance workflow

The baseline is shared state - careful coordination prevents bit
rot:

1. **Initial creation:** run all scanners; emit every current
   violation as a fingerprint; write to `a11y-baseline.json`.
2. **PR adds new violations:** gate fails; PR author fixes OR
   debates whether the violation was actually pre-existing
   (regenerate baseline if the team agrees).
3. **PR fixes existing violation:** the violation's fingerprint
   disappears from the next scan; the gate's "fixed since baseline"
   counter increments. **Manually remove** the fingerprint from
   `a11y-baseline.json` in the same PR - otherwise the baseline
   accumulates stale entries.
4. **Quarterly review:** the team reviews the baseline; any entry
   older than N quarters becomes a follow-up ticket.

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Auto-update baseline on every PR                            | Regressions silently get grandfathered.                             | Manual baseline updates only; reviewers verify each addition is intentional. |
| One severity threshold for all rules                         | `color-contrast` and `bypass` (skip-link) have different impact; uniform threshold over- or under-blocks. | Per-rule severity overrides; align with W3C-published rule severities. |
| Scoring "any violation = fail"                               | Tests every PR against the entire backlog; team disables the gate. | Ratchet against the baseline; only fail on net-new. |
| Skipping the "fixed-since-baseline" counter                 | Team has no positive feedback for cleanup work.                     | Surface the counter prominently; tie to OKRs. |
| Failing only on `critical`                                  | `serious` issues (most contrast / most ARIA) become invisible.     | Block on `critical` AND `serious`. |

## References

- All five scanner skills:
  `axe-a11y`,
  `pa11y-a11y`,
  `lighthouse-a11y`,
  `wave-a11y`,
  `ibm-equal-access-a11y`.
- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
- Sibling gate skills (same architecture):
  `data-quality-gate`, `visual-baseline-gate`,
  `contract-compatibility-gate`, `perf-budget-gate`.
