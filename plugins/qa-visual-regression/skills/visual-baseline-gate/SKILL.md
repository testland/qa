---
name: visual-baseline-gate
description: "Consumes visual-diff-classifier JSON and a reviewer-signed acceptance log to produce a single go/no-go CI verdict for visual regression. Blocks when intentional baseline changes lack a non-author reviewer sign-off or when regressions are present, and emits a markdown + JSON artifact for the CI step. Use this skill when the gate's input is pre-classified diff data and the enforcement concern is reviewer approval, not when the goal is fanning out to multiple engines (use visual-ci-gate-orchestrator for that)."
---

# visual-baseline-gate

## Overview

A typical visual-regression CI run produces an engine-specific verdict
(Chromatic exit code, Percy build status, Playwright snapshot pass/fail).
That's not enough for a strict gate, because:

1. Each engine treats "visual changes" differently - Chromatic exits `1`
   on changes (review needed), Percy returns success but flags the build
   pending, Playwright fails the test outright.
2. **"The author updated baselines and committed them" is not the same
   as "a reviewer approved the baseline change."** A `--update-snapshots`
   commit is a self-approval; for safety-relevant components it should
   require a sign-off.

This skill defines a build-an-X workflow that consumes both the diff
classifier output and an explicit acceptance log to emit a single
go/no-go verdict.

## When to use

- The team uses two or more visual engines and wants one CI gate
  (similar in motivation to
  [`data-quality-gate`](../../../qa-data-quality/skills/data-quality-gate/SKILL.md)
  for data quality).
- The team wants to enforce a "reviewer approval" rule on baseline
  updates - i.e. a `--update-snapshots` commit by the PR author cannot
  self-approve a baseline change to a critical component.
- The team wants the [`visual-diff-classifier`](../../agents/visual-diff-classifier.md)
  output to become CI-blocking rather than advisory.

If the project uses one engine only and trusts engine-native review
(e.g. all changes go through Chromatic UI approval), prefer the
engine's native CI integration - see the matching engine's
"CI integration" section in its SKILL.md.

## Step 1 - Define the input shape

The gate consumes two inputs:

1. **Classification artifact** - JSON output from the
   [`visual-diff-classifier`](../../agents/visual-diff-classifier.md)
   agent, one record per snapshot:

   ```json
   {
     "snapshot": "dashboard-mobile-375",
     "engine":   "playwright",
     "category": "intentional|incidental|regression",
     "pattern":  "text-truncation|...|null",
     "paired_change": true,
     "diff_url": "playwright-report/data/dashboard-mobile-375-diff.png"
   }
   ```

2. **Acceptance log** - a YAML file at `.visual-acceptance.yml`
   committed by reviewers (NOT the PR author) that explicitly accepts
   each intentional baseline change for the current PR:

   ```yaml
   # .visual-acceptance.yml — committed by reviewers in the PR's review pass
   pr: 1234
   accepted_by: reviewer-handle
   accepted_at: 2026-05-04T12:00:00Z
   snapshots:
     - snapshot: dashboard-mobile-375
       reason: "Intentional CTA color change per design spec DS-456"
     - snapshot: pricing-tablet-768
       reason: "Intentional pricing tier rename"
   ```

The acceptance file lives in the PR branch; merging the PR records
the acceptance in git history.

## Step 2 - Define the gate decision rule

```python
def visual_gate(classifications, acceptance_log, *,
                require_reviewer_acceptance=True):
    accepted = {s["snapshot"] for s in acceptance_log.get("snapshots", [])}
    blockers = []
    for c in classifications:
        if c["category"] == "regression":
            blockers.append((c, "regression — blocks unconditionally"))
        elif c["category"] == "intentional" and require_reviewer_acceptance:
            if c["snapshot"] not in accepted:
                blockers.append((c, "intentional — missing reviewer acceptance"))
        elif c["category"] == "incidental":
            # incidental requires investigation but does NOT block by default
            pass

    return {
        "verdict": "no-go" if blockers else "go",
        "blockers": blockers,
        "incidentals": [c for c in classifications if c["category"] == "incidental"],
        "intentional_accepted": [c for c in classifications
                                 if c["category"] == "intentional"
                                 and c["snapshot"] in accepted],
    }
```

Default behavior:
- **regression** → block (always).
- **intentional** → block UNTIL listed in `.visual-acceptance.yml`.
- **incidental** → surface as a warning, do not block.

For low-risk projects, set `require_reviewer_acceptance=False` so
intentional changes pass without explicit acceptance - this collapses
the gate to "block on regressions only."

## Step 3 - Enforce author-cannot-self-approve

For a stricter gate, validate that the commit adding `.visual-acceptance.yml`
was authored by **someone other than the PR author**:

```bash
ACCEPTANCE_AUTHOR=$(git log --format='%ae' -1 .visual-acceptance.yml)
PR_AUTHOR=$(gh pr view --json author --jq '.author.login + "@..."')

if [[ "$ACCEPTANCE_AUTHOR" == "$PR_AUTHOR" ]]; then
  echo "ERROR: PR author cannot self-approve baseline changes"
  exit 1
fi
```

This is the visual-regression analog of GitHub's "require approval
from someone other than the last committer" branch protection.

## Step 4 - Emit the artifact

Markdown summary (matches the
[`data-quality-gate`](../../../qa-data-quality/skills/data-quality-gate/SKILL.md)
shape for cross-domain consistency):

```markdown
# Visual Baseline Gate — verdict: NO-GO

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

Plus a JSON sibling for downstream tooling:

```json
{
  "verdict": "no-go",
  "blockers": [...],
  "incidentals": [...],
  "intentional_accepted": [...]
}
```

A no-go verdict exits non-zero so CI halts.

## Worked example: minimal Python implementation

```python
# scripts/run_visual_gate.py
import json, os, sys, yaml
from pathlib import Path

CLASS_PATH = Path("visual-classifications.json")  # output of visual-diff-classifier
ACCEPT_PATH = Path(".visual-acceptance.yml")

if not CLASS_PATH.exists():
    print("No visual classifications produced — fail closed.")
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
print(f"# Visual Baseline Gate — verdict: {verdict.upper()}")
for c, reason in blockers:
    print(f"- {c['engine']} :: {c['snapshot']} :: {reason}")

sys.exit(0 if verdict == "go" else 1)
```

CI wiring (after each engine has produced its diff manifest, and after
the visual-diff-classifier has produced `visual-classifications.json`):

```yaml
- name: Run visual-diff-classifier (advisory)
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

## References

- [`visual-diff-classifier`](../../agents/visual-diff-classifier.md) - produces the classification input.
- [`percy-visual-regression-testing`](../percy-visual-regression-testing/SKILL.md)
- [`chromatic-visual-regression-testing`](../chromatic-visual-regression-testing/SKILL.md)
- [`playwright-snapshots`](../playwright-snapshots/SKILL.md)
- [`storybook-visual-regression-testing`](../storybook-visual-regression-testing/SKILL.md)
- [`visual-baseline-conventions`](../visual-baseline-conventions/SKILL.md) - the conventions this gate enforces.
- [`data-quality-gate`](../../../qa-data-quality/skills/data-quality-gate/SKILL.md) - sibling gate skill for data-quality results, same artifact shape.
