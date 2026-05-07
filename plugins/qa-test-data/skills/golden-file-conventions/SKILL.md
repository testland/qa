---
name: golden-file-conventions
description: "Reference catalog for snapshot / golden file management — naming conventions, directory layout, when to add / update / remove a baseline, sanitization (timestamps, IDs, PII), per-OS / per-runtime variant strategy, and review workflow for snapshot diffs in PRs. Use when designing a snapshot-testing convention or auditing an existing one for drift."
rating: 24
d6: 4
archetype: S2
---

# golden-file-conventions

> **Terminology note:** "golden file" / "golden master" are
> practitioner-emergent terms popularized by the Working Effectively
> with Legacy Code tradition. ISTQB has no canonical entry — the
> closest formal term is "snapshot test." This catalog uses both
> interchangeably; assume "golden file" and "snapshot" mean the same
> thing in the rest of the body.

A reference catalog for **how** to manage snapshot / golden files.
Pairs with [`golden-file-manager`](../../agents/golden-file-manager.md)
which is the **active management** agent that updates / prunes
golden files based on these conventions.

## When to use

- A team is starting snapshot-testing on a project.
- A team has an existing snapshot suite and reviews are slow because
  of unclear conventions.
- A developer is unsure when to update a baseline vs. when to fix
  the regression.
- A PR review keeps stalling on "is this snapshot diff intentional?"

## Naming conventions

### Per-test snapshot file

Most snapshot frameworks (Jest, Vitest, pytest-snapshot, RSpec
Snapshot) use a path adjacent to the test file:

```
src/
  components/
    Button.tsx
    Button.test.tsx
    __snapshots__/
      Button.test.tsx.snap
```

Convention: **one snapshot file per test file**, named
`<test-file-name>.snap`. Do not split snapshots across multiple
files per test.

### Per-test name within a snapshot file

Inside a `.snap` file, each snapshot is keyed by `<describe>` >
`<it>` chain:

```
exports[`Button renders with primary variant 1`] = `<button class="primary">...</button>`;
```

The trailing ` 1` is the snapshot index when one test takes multiple
snapshots — keep these to a minimum (≤3 per test); beyond that,
split the test.

### Per-OS / per-browser variants (visual snapshots)

For visual / screenshot-based snapshots, the name carries the
platform suffix (per
[`playwright-snapshots`](../../../qa-visual-regression/skills/playwright-snapshots/SKILL.md)):

```
Button-primary-1-chromium-linux.png
Button-primary-1-firefox-linux.png
Button-primary-1-webkit-darwin.png
```

OS / browser suffixes are load-bearing — anti-aliasing and font
metrics differ. Don't strip them.

## Directory layout

| Layout                                | When to use                                              |
|---------------------------------------|----------------------------------------------------------|
| Adjacent (`__snapshots__/` next to test) | Default. Reviewer sees the diff in the same PR view as the test. |
| Centralized (`tests/__fixtures__/`)    | Cross-test fixtures (golden inputs reused by many tests).|
| External (`s3://snapshots-bucket/`)    | Visual snapshots that are large; CI uploads / downloads. Common with Percy, Chromatic, Playwright + S3. |

Default to adjacent. Centralized only when fixtures are reused.
External only when artifact size makes adjacent impractical.

## When to add a baseline

Add a snapshot when:

- A new component / page / output ships and its rendered shape is
  load-bearing.
- A bug fix changes a specific output that lacked coverage; the
  snapshot is the regression-prevention asset.
- A redesign locked the new design system; refresh all baselines in
  one PR.

**Don't** add a snapshot for:

- Output that's expected to change frequently (e.g. timestamps,
  randomized IDs). Snapshot the **shape**, not the volatile values
  — see Sanitization below.
- Internal-only rendering paths the user never sees.
- Test scaffolding output (e.g. test runner banners).

## Sanitization (the load-bearing rule)

A snapshot that contains volatile values (timestamps, UUIDs, random
IDs, current dates) breaks every run. **Sanitize before
snapshotting:**

| Volatile field            | Sanitization pattern                              |
|---------------------------|---------------------------------------------------|
| Timestamps                | Replace with a fixed string `[TIMESTAMP]` or freeze the clock (`vi.useFakeTimers()`). |
| UUIDs                     | Replace with `[UUID]` or seed a deterministic generator. |
| Auto-increment IDs        | Replace with `[ID]` or use a sequence-controlled fixture. |
| File paths (`/var/folders/...`) | Replace with `[PATH]` or normalize via project root. |
| Memory addresses (object refs) | Avoid in serialized output; use a custom serializer. |
| User-data tokens          | Strip before snapshotting; tokens shouldn't be in the test surface anyway. |

Most frameworks support custom serializers / matchers — use them.
Jest's `expect.any(Date)` matcher pattern is canonical:

```javascript
expect(result).toMatchSnapshot({
  createdAt: expect.any(Date),
  uuid: expect.any(String),
});
```

The serializer normalizes volatile fields **before** comparison,
so the snapshot shows `Any<Date>` rather than a specific timestamp.

## Update vs. fix decision tree

When a snapshot diff appears in a PR:

```
Is the diff explained by code changes in the same PR?
├── No  → REGRESSION; fix the code, do not update the snapshot.
└── Yes → Did the diff align with the intent (described in the PR title)?
    ├── No  → REGRESSION (cascade from an unrelated change); investigate before updating.
    └── Yes → Is the diff isolated to the components the PR is supposed to change?
        ├── No  → INVESTIGATE: a CSS / token / shared-component change affected unrelated snapshots.
        └── Yes → UPDATE: run `--update-snapshots` and commit.
```

The most common review failure is **rubber-stamping snapshot
updates** — accepting a 47-component diff because the PR title says
"Refactor Button". The diff classifier in
[`golden-file-manager`](../../agents/golden-file-manager.md)
implements this decision tree.

## Severity tiering

Every snapshot has an implicit severity:

| Tier        | Behavior                              | Examples |
|-------------|---------------------------------------|----------|
| Critical    | Blocks merge on diff; requires explicit reviewer acceptance. | Production-shipped pages; payment flows; auth. |
| Standard    | Blocks merge on diff; author can self-approve with a clear PR description. | Internal admin tooling; non-shipping experiments. |
| Advisory    | Surfaces diff but doesn't block.       | Unstable areas under active redesign; new baselines during ramp-up. |

Promote Advisory → Standard after ~2 weeks of stability. Promote
Standard → Critical for security-sensitive surfaces.

## Pruning rules

Remove a snapshot when:

- The associated test is deleted.
- The component / page is removed from the product.
- The snapshot has produced more false positives than real
  regressions over a 3-month window — it's noise, not signal.

The [`golden-file-manager`](../../agents/golden-file-manager.md)
agent automates the "test deleted but snapshot remained" cleanup.

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Updating snapshots in a separate "snapshot refresh" PR         | Reviewer can't see the code change that justifies the diff.        | Always update snapshots in the same PR as the source change. |
| `--update-snapshots` in PR CI as the default                  | Snapshots become tautologies; never catch a regression.             | Update snapshots only in interactive runs; PR CI fails on diff. |
| Snapshotting raw HTML for components                           | Brittle to attribute-order changes from tooling upgrades.          | Snapshot the React / Vue / Svelte component tree (e.g. `react-test-renderer`), not raw HTML; OR use a normalizer. |
| One mega-snapshot per page                                    | A 5kb diff is uninterpretable; reviewers approve to move on.       | Per-component snapshots; smaller surface = faster review. |
| Storing snapshots externally without checksums                 | A drift in S3 vs. the test code makes "what changed?" hard.        | Include checksums in the test code; verify on each run. |
| Snapshots of error messages with stack traces                  | Stack traces include line numbers that drift with every refactor.  | Snapshot the **error type + message** only; strip the trace. |
| Cross-OS shared snapshots                                      | Anti-aliasing / font / line-ending differences flake the test.     | Per-OS snapshot suffixes (see naming above). |

## Review workflow

1. **PR opens with snapshot diff.** Reviewer reads the PR title /
   description first to understand intent.
2. **Reviewer checks each diff cell** against the decision tree
   above.
3. **For unintended diffs:** comment with the specific cell + ask
   for code investigation; do not approve.
4. **For intended diffs:** approve; the snapshot becomes the new
   baseline.
5. **For ambiguous diffs:** request a second reviewer; treat as
   Critical-tier even if labeled Standard.

## References

- ISO/IEC/IEEE 29119 series — formal test-document conventions
  (cite by stable ID).
- [`golden-file-manager`](../../agents/golden-file-manager.md) —
  active-management agent that uses this catalog.
- [`playwright-snapshots`](../../../qa-visual-regression/skills/playwright-snapshots/SKILL.md)
  — visual-snapshot-specific naming and per-OS suffix conventions.
- [`visual-baseline-conventions`](../../../qa-visual-regression/skills/visual-baseline-conventions/SKILL.md)
  — broader visual-coverage conventions; this skill is the
  text/object-snapshot equivalent.
