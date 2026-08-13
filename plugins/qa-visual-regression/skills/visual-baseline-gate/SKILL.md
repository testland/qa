---
name: visual-baseline-gate
description: "Consumes pre-classified visual-diff JSON and a reviewer-signed acceptance log to produce a single go/no-go CI verdict for visual regression. Blocks when intentional baseline changes lack a non-author reviewer sign-off or when regressions are present, and emits the binding gate artifacts - visual-gate.json + visual-gate.md - with fail-closed handling of a missing classifier run and author-cannot-self-approve enforcement, so the pipeline can exit non-zero on BLOCK. Use when the gate's input is pre-classified diff data and the enforcement concern is reviewer approval and a binding CI verdict."
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
  (similar in motivation to `data-quality-gate` in the
  qa-data-quality plugin, for data quality).
- The team wants to enforce a "reviewer approval" rule on baseline
  updates - i.e. a `--update-snapshots` commit by the PR author cannot
  self-approve a baseline change to a critical component.
- The team wants the classified visual-diff output to become
  CI-blocking rather than advisory.

If the project uses one engine only and trusts engine-native review
(e.g. all changes go through Chromatic UI approval), prefer the
engine's native CI integration - see the matching engine's
"CI integration" section in its SKILL.md.

## How to use

1. **Collect the two inputs** - the pre-classified diff JSON (one record
   per snapshot, `category` in intentional | incidental | regression) and
   the reviewer-committed `.visual-acceptance.yml` (see Inputs).
2. **Run the gate decision rule** - regression blocks always; intentional
   blocks until listed in the acceptance log; incidental warns only (see
   The gate decision rule).
3. **Enforce author-cannot-self-approve** - verify the commit that added
   `.visual-acceptance.yml` was authored by someone other than the PR
   author (see Author cannot self-approve).
4. **Emit the artifact and exit** - write the markdown + JSON summary and
   exit non-zero on a no-go verdict so CI halts. The full artifact
   template, the runnable CI entrypoint, and the GitHub Actions wiring are
   in [references/artifact-and-ci-wiring.md](references/artifact-and-ci-wiring.md).

## Inputs

The gate consumes two inputs:

1. **Classification artifact** - the pre-classified diff JSON, one
   record per snapshot:

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
   # .visual-acceptance.yml - committed by reviewers in the PR's review pass
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

## The gate decision rule

```python
def visual_gate(classifications, acceptance_log, *,
                require_reviewer_acceptance=True):
    accepted = {s["snapshot"] for s in acceptance_log.get("snapshots", [])}
    blockers = []
    for c in classifications:
        if c["category"] == "regression":
            blockers.append((c, "regression - blocks unconditionally"))
        elif c["category"] == "intentional" and require_reviewer_acceptance:
            if c["snapshot"] not in accepted:
                blockers.append((c, "intentional - missing reviewer acceptance"))
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
- **regression** -> block (always).
- **intentional** -> block UNTIL listed in `.visual-acceptance.yml`.
- **incidental** -> surface as a warning, do not block.

For low-risk projects, set `require_reviewer_acceptance=False` so
intentional changes pass without explicit acceptance - this collapses
the gate to "block on regressions only."

## Author cannot self-approve

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

## Emitting gate artifacts (the binding CI verdict)

Applying the decision rule in CI means turning the per-diff judgements into
binding output files the pipeline acts on:

1. **Fail closed on a missing classifier run.** Read
   `visual-classifications.json` (written by the classification step, e.g.
   `visual-diff-classifier`). If the file is absent or empty, emit `BLOCK`
   with reason `classifier-output-missing` and stop - a missing classifier
   run is itself a gate failure. Do not attempt to reconstruct
   classifications.
2. **Read the acceptance log.** Look for `.visual-acceptance.yml` in the
   branch root; if absent, treat all `intentional` diffs as unaccepted.
3. **Apply the decision rule** (previous section). Verdict precedence is
   `BLOCK` > `REVIEW` > `OK` - one `BLOCK` overrides any number of `OK`
   rows. `incidental` rows surface as `REVIEW`, never silently downgraded
   to `OK`; an `incidental` row whose pattern isn't in the conventions'
   valid list (anti-aliasing, font-bump, sub-pixel drift per
   `visual-baseline-conventions`) is suspect and stays `REVIEW`.
4. **Enforce author-cannot-self-approve.** Compare the acceptance log's
   `accepted_by` (and the committing author, next section) against the PR
   author; on a match, escalate the verdict to `BLOCK` regardless of other
   rows. The gate is read-only on `.visual-acceptance.yml` - only a human
   reviewer writes that file.
5. **Don't double-count engine-level signaling.** If the build used
   Chromatic without `--exit-zero-on-changes`, the CLI already exited
   non-zero on detected changes (exit code `1` = `BUILD_HAS_CHANGES`, per
   chromatic.com/docs/ci) - that is engine-level signaling, not a
   classifier verdict.
6. **Write `visual-gate.md` + `visual-gate.json` and exit.** `BLOCK` exits
   non-zero to halt CI; `REVIEW` and `OK` exit zero, with `REVIEW` posting
   the incidentals table as a PR comment for human attention. The full
   artifact templates and the GitHub Actions wiring are in
   [references/artifact-and-ci-wiring.md](references/artifact-and-ci-wiring.md).

## Worked example

Run the gate on one build. The classification step emitted three
records, and one reviewer committed an acceptance log:

```python
classifications = [
    {"snapshot": "dashboard-mobile-375", "engine": "playwright", "category": "regression"},
    {"snapshot": "pricing-tablet-768",   "engine": "percy",      "category": "intentional"},
    {"snapshot": "hero-desktop-1280",    "engine": "chromatic",  "category": "intentional"},
]
acceptance_log = {"snapshots": [{"snapshot": "hero-desktop-1280",
                                 "reason": "Intentional hero copy update per DS-789"}]}

result = visual_gate(classifications, acceptance_log)
```

Walking the rule per record:

| Snapshot              | Category    | In acceptance log? | Outcome |
|-----------------------|-------------|--------------------|---------|
| dashboard-mobile-375  | regression  | n/a                | **block** - regressions always block |
| pricing-tablet-768    | intentional | no                 | **block** - missing reviewer acceptance |
| hero-desktop-1280     | intentional | yes                | pass - reviewer signed off |

`result["verdict"]` is `"no-go"` (two blockers), so the CI step exits
non-zero and the merge is held. The gate prints:

```text
# Visual Baseline Gate - verdict: NO-GO
- playwright :: dashboard-mobile-375 :: regression - blocks unconditionally
- percy :: pricing-tablet-768 :: intentional - missing reviewer acceptance
```

To turn this build green, a non-author reviewer either fixes the
`dashboard-mobile-375` regression or, if the diff is actually intended,
adds both snapshots to `.visual-acceptance.yml` and re-runs the gate.
The full markdown + JSON artifact and the CI wiring that surfaces this
output are in
[references/artifact-and-ci-wiring.md](references/artifact-and-ci-wiring.md).

## References

- `percy-visual-regression-testing`
- `chromatic-visual-regression-testing`
- `playwright-snapshots`
- `storybook-visual-regression-testing`
- `visual-baseline-conventions` - the conventions this gate enforces.
- `data-quality-gate` - sibling gate skill for data-quality results, same artifact shape.
