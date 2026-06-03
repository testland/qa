---
name: flag-removal-runbook-author
description: "Workflow-driven skill that builds the runbook for safely removing a feature flag from the codebase + the flag platform. Walks through: pre-removal verification (flag fully rolled out, no usage variance in evaluations, dependent code paths identified), the code-removal steps (delete the if-branches, simplify, restore types), the platform-side removal (archive in LaunchDarkly / Unleash / Flagsmith / GrowthBook), the verification post-removal, and the rollback plan. Use when removing a flag that has finished its mission (rollout-complete, experiment-shipped, kill-switch retired). Composes feature-flag-test-matrix-reference + stale-flag-detector."
rating: 22
d6: 4
---

# flag-removal-runbook-author

## Overview

Stale feature flags are technical debt: they bloat the codebase,
expand the flag-state matrix per
[`feature-flag-test-matrix-reference`](../feature-flag-test-matrix-reference/SKILL.md),
and confuse readers. But removing a flag wrong - deleting code
that's actually still gated for some users - is a regression.

This skill produces the **runbook** for safely removing a flag.

## When to use

- A flag is at 100% rollout for ≥ 2 weeks.
- An experiment has shipped; the variant code paths need
  consolidation.
- A kill-switch hasn't been activated for ≥ 6 months.
- Stale-flag audit (per
  [`stale-flag-detector`](../../agents/stale-flag-detector.md))
  surfaced the flag.

## Step 1 - Pre-removal verification

Before any code touches:

| Check | Pass criterion |
|---|---|
| Rollout 100% for all segments | LD/Unleash/etc. dashboard confirms |
| No alternate behaviour gated on this flag | Per-flag-page in platform shows no targeting variation |
| Evaluation count stable | Not a recently-changed flag; no recent variation flips |
| Dependent flags identified | Grep for the flag + any flag whose targeting references this flag's value |
| Owner / sponsor identified | Person who can authorise removal |
| Rollback plan exists | If removal breaks, how to restore |

**Failure of any check** = abort and resolve first.

## Step 2 - Identify dependent code

Grep:

```bash
grep -rn 'show-new-ui\|"show-new-ui"' --include='*.{ts,js,py,go,java}' .
```

For each match, classify:

| Pattern | Action |
|---|---|
| `if (client.isOn('flag'))` → branch A else branch B | Delete branch B; remove the `if` |
| Conditional import / require | Delete the conditional; keep the new module |
| Conditional CSS / styling | Delete the old class; keep the new |
| Switch on multi-variant flag | Keep only the shipped variant |
| Test fixtures with the flag | Update or delete |
| Configuration with default = the old value | Update default; document |

## Step 3 - Code removal

For boolean flag at 100% rollout = true:

```typescript
// Before
if (client.isOn('show-new-ui')) {
  return <NewHeader />;
} else {
  return <OldHeader />;
}

// After
return <NewHeader />;
```

Delete `<OldHeader />` component if not used elsewhere. Use
TypeScript / linter to find unused imports.

For multi-variant flag with `treatment-b` shipped:

```typescript
// Before
const variant = client.getFeatureValue('checkout-experiment', 'control');
if (variant === 'treatment-a') { ... }
else if (variant === 'treatment-b') { ... }
else { ... }  // control

// After (only treatment-b retained)
// (inline treatment-b's logic here)
```

Keep the **shipped variant's logic, inlined**. Delete the
others.

## Step 4 - Update tests

Per [`flag-state-coverage-builder`](../flag-state-coverage-builder/SKILL.md):

- Remove the per-flag isolation tests for this flag.
- Update any matrix that included this flag.
- Update the `flag-coverage.yaml` to remove entries.
- Keep any test that asserts the new behaviour (it's no longer
  flag-gated - it's just the behaviour).

```bash
# Find tests referencing the flag
grep -rn 'show-new-ui' tests/
```

## Step 5 - Platform-side removal

| Platform | Removal action |
|---|---|
| LaunchDarkly | Archive the flag (UI: flag → ⋯ → Archive). Don't delete - archived flags retain analytics. Per [launchdarkly.com/docs](https://launchdarkly.com/docs/) |
| Unleash | Archive in the UI; deletion is permanent |
| Flagsmith | Delete feature (UI); the environment.json on next regenerate will lack it |
| GrowthBook | Archive in the UI |

**Archive instead of delete** where possible - retains
historical analytics in case of regression.

## Step 6 - Deploy

Standard deploy. The flag is now:

- Removed from code
- Archived in the platform
- No longer in the test matrix

Production should see identical behaviour as before removal.

## Step 7 - Post-removal verification

Within 24h of deploy:

| Check | Pass |
|---|---|
| Error rate unchanged | No 5xx spike |
| Performance unchanged | p95 latency unchanged |
| User-facing behaviour stable | No "broken UI" support tickets |
| Platform shows zero evaluations of the archived flag | Confirms no code still references it |

If any check fails → roll back (revert the removal commit).

## Step 8 - Rollback plan

```bash
# If removal regresses something
git revert <removal-commit>
git push
# Then in the platform: un-archive the flag and re-set its prior value
```

The rollback plan must be **in the PR description** for the
removal - not memorized.

## Step 9 - Document the removal

Add to the project's `flag-history.md`:

```markdown
## 2026-05-20 — Removed `show-new-ui`

- Rolled out 100% on 2026-04-15
- Stable for 5 weeks at 100%
- Removed in commit abc1234
- Archived in LaunchDarkly
- Owner sign-off: @engineering-lead
- Rollback plan: revert + un-archive
```

## Multi-flag removal batching

For stale-flag audits surfacing multiple removals: batch is
faster but riskier. Per
[`stale-flag-detector`](../../agents/stale-flag-detector.md):

| Batch size | When |
|---|---|
| 1 flag per PR | Default - easy to revert, clear analytics |
| 3-5 flags per PR | Same area of codebase; same owner |
| 10+ flags per PR | Periodic audit; experienced reviewer required |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Remove flag at <100% rollout | Some users still see the old path; you break them | Wait for 100% + soak |
| Delete in platform but leave code | "Removed" but still evaluated → SDK errors on missing flag | Code first, then platform |
| Leave code but archive in platform | Code still references; defaults kick in; behaviour change | Either both or neither |
| No rollback plan | Hard to recover if regression | Always plan revert + un-archive |
| Skip post-removal verification | "It compiled; ship it" | Watch error rate / latency / tickets for 24h |
| Bulk remove without owner sign-off | Unilateral removal of someone else's work | Per-flag owner sign-off |
| Re-use flag name later | Confuses analytics, archive-then-create-new | New flag, new name |
| Forget to update tests | Tests still gate on the removed flag; mock returns default → wrong outcome | Step 4 |
| Leave dead variants from multi-variant | Half-clean removal | Inline shipped variant's logic |

## Output

This skill produces:

- A per-flag removal PR (code + tests + coverage-doc updated).
- A platform-side checklist for the archive action.
- A 24h post-deploy verification plan.
- A rollback-ready PR description.
- A line in `flag-history.md`.

## References

- LaunchDarkly archive doc:
  [launchdarkly.com/docs](https://launchdarkly.com/docs/).
- Companion catalogs:
  [`feature-flag-test-matrix-reference`](../feature-flag-test-matrix-reference/SKILL.md),
  [`flag-state-coverage-builder`](../flag-state-coverage-builder/SKILL.md).
- Detector:
  [`stale-flag-detector`](../../agents/stale-flag-detector.md).
- Sibling SDKs (for platform-specific archive steps):
  [`launchdarkly-testing`](../launchdarkly-testing/SKILL.md),
  [`unleash-testing`](../unleash-testing/SKILL.md),
  [`flagsmith-testing`](../flagsmith-testing/SKILL.md),
  [`growthbook-testing`](../growthbook-testing/SKILL.md).
