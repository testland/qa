---
name: a11y-violation-gate
description: "Builds a CI gate that fails the build on **new** WCAG / a11y violations introduced by a PR while grandfathering pre-existing violations on a per-rule / per-page baseline. Aggregates verdicts from axe-core / pa11y / Lighthouse a11y / WAVE / IBM Equal Access scans. Use when a project has accumulated a11y debt and a strict \"zero violations\" gate would block every PR - the ratchet pattern lets the team ship while preventing regressions."
rating: 24
d6: 4
archetype: S3
---

# a11y-violation-gate

## Overview

Most established projects don't pass strict a11y scans on day one - 
they have accumulated debt from years of pre-WCAG-conformance code.
A binary "all or nothing" gate creates a cliff: either disable the
gate (defeating the purpose) or block every PR until the entire
backlog is fixed (months of work).

The fix is the **ratchet pattern**: the gate fails only on
**new** violations vs. a stored baseline. Existing violations
are grandfathered. New violations block; fixes count toward
shrinking the baseline.

This skill builds that gate, aggregating outputs from any
combination of:

- [`axe-a11y`](../axe-a11y/SKILL.md)
- [`pa11y-a11y`](../pa11y-a11y/SKILL.md)
- [`lighthouse-a11y`](../lighthouse-a11y/SKILL.md)
- [`wave-a11y`](../wave-a11y/SKILL.md)
- [`ibm-equal-access-a11y`](../ibm-equal-access-a11y/SKILL.md)

Sibling gates with the same architecture:
[`data-quality-gate`](../../../qa-data-quality/skills/data-quality-gate/SKILL.md),
[`visual-baseline-gate`](../../../qa-visual-regression/skills/visual-baseline-gate/SKILL.md),
[`contract-compatibility-gate`](../../../qa-contract-testing/skills/contract-compatibility-gate/SKILL.md),
[`perf-budget-gate`](../../../qa-load-testing/skills/perf-budget-gate/SKILL.md).

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

Each scanner produces its own report shape:

| Scanner          | Native output                                    |
|------------------|--------------------------------------------------|
| axe-core         | JSON with `violations[]`; rule ID, impact, nodes. |
| pa11y            | JSON with `issues[]`; code (WCAG SC), type.       |
| Lighthouse a11y  | LHR JSON with `categories.accessibility.audits`.  |
| WAVE             | JSON via WebAIM API; `categories` with errors / warnings. |
| IBM Equal Access | JSON with `results[]`.                            |

Normalize to a unified record:

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
across runs = same violation; new fingerprint = new violation.

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

Pseudocode:

```python
def a11y_gate(records, baseline, *,
              block_on_severity=['critical', 'serious'],
              warn_on_severity=['moderate'],
              info_on_severity=['minor']):
    blockers = []
    warnings = []
    for r in records:
        if r['fingerprint'] in baseline:
            continue   # grandfathered
        if r['severity'] in block_on_severity:
            blockers.append(r)
        elif r['severity'] in warn_on_severity:
            warnings.append(r)

    return {
        'verdict': 'no-go' if blockers else 'go',
        'blocker_count': len(blockers),
        'warning_count': len(warnings),
        'blockers': blockers,
        'warnings': warnings,
        'shrinking_baseline_count': len([f for f in baseline if f not in {r['fingerprint'] for r in records}]),
    }
```

Three severity tiers map to behavior:

| Severity tier         | Behavior                                                   |
|-----------------------|------------------------------------------------------------|
| Block (critical/serious) | Fail the build.                                          |
| Warn (moderate)        | Surface in PR comment; no build failure.                   |
| Info (minor)           | Log; no PR comment unless count > N.                      |

Plus the **shrinking baseline** counter - when fingerprints in the
baseline disappear from the latest scan, the team has fixed them.
Surface this as a positive metric: "5 fixed / 47 remaining."

## Step 4 - Emit the artifact

Markdown summary suitable for `$GITHUB_STEP_SUMMARY` or PR comment:

```markdown
# A11y Gate — verdict: NO-GO

**Blockers (NEW violations): 2**

| Scanner | Rule              | WCAG SC | Page         | Selector            | Severity |
|---------|-------------------|---------|--------------|---------------------|----------|
| axe     | color-contrast    | 1.4.3   | /checkout    | button.primary      | serious  |
| axe     | aria-required-attr | 4.1.2  | /checkout    | div[role="dialog"]  | critical |

**Warnings (NEW moderate): 1**

| Scanner | Rule          | WCAG SC | Page         | Selector |
|---------|---------------|---------|--------------|----------|
| pa11y   | landmark-one-main | 1.3.1 | /checkout | (page-level) |

**Grandfathered (in baseline): 47**
**Fixed since baseline: 5**  ← positive trend

## Recommended next step

Block-tier violations must be fixed in this PR. To address the
two blockers:
- `button.primary` on `/checkout`: contrast ratio 3.8:1; needs ≥4.5:1.
- `div[role="dialog"]`: missing `aria-labelledby` or `aria-label`.
```

A no-go verdict exits non-zero so CI halts.

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

## Worked example: minimal Python implementation

```python
# scripts/run_a11y_gate.py
import json, sys
from pathlib import Path

records = []

# Source: axe-core JSON
axe_path = Path("axe-results.json")
if axe_path.exists():
    axe = json.loads(axe_path.read_text())
    for v in axe.get('violations', []):
        for node in v.get('nodes', []):
            records.append({
                'scanner': 'axe',
                'rule_id': v['id'],
                'wcag_sc': v.get('tags', [None])[-1],   # or parse from tags
                'page_url': axe.get('url', '/'),
                'selector': node.get('target', ['?'])[0],
                'severity': v.get('impact', 'moderate'),
                'fingerprint': f"axe::{v['id']}::{axe.get('url','/')}::{node.get('target', ['?'])[0]}",
            })

# Source: pa11y JSON
# ... (same shape, different fields — normalize to the same record)

# Load baseline
baseline_path = Path("a11y-baseline.json")
baseline = set()
if baseline_path.exists():
    baseline = set(json.loads(baseline_path.read_text()).get('violations', []))

# Apply gate
new_violations = [r for r in records if r['fingerprint'] not in baseline]
blockers = [r for r in new_violations if r['severity'] in ('critical', 'serious')]

verdict = 'no-go' if blockers else 'go'
print(f"# A11y Gate — verdict: {verdict.upper()}")
for r in blockers:
    print(f"- {r['scanner']} :: {r['rule_id']} on {r['page_url']} ({r['selector']})")

sys.exit(0 if verdict == 'go' else 1)
```

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
  [`axe-a11y`](../axe-a11y/SKILL.md),
  [`pa11y-a11y`](../pa11y-a11y/SKILL.md),
  [`lighthouse-a11y`](../lighthouse-a11y/SKILL.md),
  [`wave-a11y`](../wave-a11y/SKILL.md),
  [`ibm-equal-access-a11y`](../ibm-equal-access-a11y/SKILL.md).
- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
- Sibling gate skills (same architecture):
  [`data-quality-gate`](../../../qa-data-quality/skills/data-quality-gate/SKILL.md),
  [`visual-baseline-gate`](../../../qa-visual-regression/skills/visual-baseline-gate/SKILL.md),
  [`contract-compatibility-gate`](../../../qa-contract-testing/skills/contract-compatibility-gate/SKILL.md),
  [`perf-budget-gate`](../../../qa-load-testing/skills/perf-budget-gate/SKILL.md).
