---
name: visual-diff-summarizer
description: "Triages a PR's visual regression diffs when there are too many changed screenshots to review one by one. Clusters snapshots (from Percy, Chromatic, Playwright `toHaveScreenshot`, Storybook, Loki) by component / route, separates changes that match PR intent from cascade / regression suspects, recommends which baselines to update, and emits one PR comment pointing the reviewer at the screenshots that need actual eyes. Use when a PR has 20+ visual diffs / changed screenshots and the reviewer needs help deciding which to open."
---

# visual-diff-summarizer

## Overview

A 50-diff visual review causes **diff blindness** - reviewers
rubber-stamp or skip. This skill turns "50 diffs" into "3 components
changed as the PR intended; 1 component changed unexpectedly - focus
here":

1. Read each visual tool's per-snapshot diff output (Percy /
   Chromatic / Playwright snapshots / Storybook).
2. Cluster diffs by **component / route** (not by file).
3. Cross-reference the PR's stated intent (title, description,
   labels) with each cluster.
4. Classify clusters as **aligned** (PR intent matches), **adjacent**
   (sibling component the PR touches transitively), or
   **unrelated** (suspected unintended cascade or regression).
5. Emit a sticky PR comment with recommended next actions per
   cluster.

The intent-vs-diff classification mirrors the same logic used by
snapshot golden-file management and visual-diff classification - **a wrong-but-consistent
visual baseline is worse than no baseline at all.**

## When to use

- A PR has 10+ visual diffs and the reviewer's attention budget
  isn't sustainable per-diff.
- The team uses Percy / Chromatic / Storybook visual tests + has
  intent-driven PR culture.
- A "design system update" cascades into many components and the
  team needs to confirm the cascade was intentional.

If the PR has 1 - 2 diffs in scoped files, this skill is overkill - 
the reviewer can open them directly. The value compounds at scale.

## Step 1 - Pick the upstream tool's output

Each tool exposes per-snapshot diff data (a `diff_ratio` per snapshot) via API or local artifact - see [references/tool-outputs.md](references/tool-outputs.md) for the source per tool. This skill is downstream of the `qa-visual-regression` per-tool wrappers and consumes their output.

## Step 2 - Normalize to per-snapshot rows

```typescript
interface SnapshotDiff {
  tool: 'percy' | 'chromatic' | 'playwright' | 'storybook' | 'loki';
  storyOrPage: string;             // e.g. "Button/with-icon" or "/checkout"
  componentOrRoute: string;        // derived: "Button" or "checkout"
  variant?: string;                // e.g. viewport, theme, hover state
  beforeImageUrl?: string;
  afterImageUrl?: string;
  diffImageUrl?: string;
  diffRatio: number;               // 0..1, fraction of pixels that changed
  baselineSnapshotId?: string;
}
```

Cluster keys:

```typescript
function clusterKey(d: SnapshotDiff): string {
  return d.componentOrRoute;       // "Button", "checkout", etc.
}
```

## Step 3 - Read PR intent

The PR's **title + description + labels** is the stated intent
signal. Pull via `gh pr view`:

```bash
gh pr view --json title,body,labels,files,headRefOid
```

Extract structural intent:

```typescript
interface Intent {
  title: string;
  body: string;
  labels: string[];
  changedFiles: string[];        // src paths
  // Derived:
  scopeKeywords: string[];       // e.g. ["Button", "checkout", "design-tokens"]
  changedComponents: Set<string>; // mapped from changedFiles
}
```

`scopeKeywords` extraction:

- From title: capitalize-cased words ("Refactor `Button`" →
  ["Button"]).
- From labels: e.g. `area:checkout` → ["checkout"].
- From changedFiles: walk paths; the leaf directory under
  `src/components/` or `src/routes/` is a component / route name.

## Step 4 - Classify each cluster against intent

```typescript
type Classification = 'aligned' | 'adjacent' | 'unrelated';

function classify(cluster: string, diffs: SnapshotDiff[], intent: Intent): Classification {
  if (intent.scopeKeywords.includes(cluster) ||
      intent.changedComponents.has(cluster)) {
    return 'aligned';
  }
  // Adjacent: cluster is a child / parent of a changed component (e.g. PR touches
  // Modal; Button-inside-Modal also diffs).
  if (intent.changedComponents.has(parentOf(cluster)) ||
      intent.changedComponents.has(childOf(cluster))) {
    return 'adjacent';
  }
  return 'unrelated';
}
```

`parentOf`/`childOf` use the team's component-graph manifest (from
Storybook or a hand-maintained JSON) to identify hierarchy.

## Step 5 - Render the report

Emit a sticky PR comment grouping clusters aligned → adjacent → unrelated, each with a per-cluster recommendation and a "Quick actions" block that auto-approves only the aligned cluster. The full report template (headers, per-cluster tables, quick-action commands) is in [references/report-format.md](references/report-format.md).

## Step 6 - Cluster sort order

The reviewer scans top-down. Order:

1. **Unrelated** (action required: investigate).
2. **Adjacent** (action required: confirm).
3. **Aligned** (action: bulk-approve).

Inside each group, sort by max diff ratio descending - biggest
visual change first.

## Step 7 - Verify, then auto-update only the aligned cluster

**Checkpoint before approving:** open one sample diff per aligned cluster and confirm it matches the PR's stated intent; only then run the auto-accept command. The summary includes the safe-to-run command for the aligned cluster only - adjacent and unrelated clusters never get an auto-update suggestion.

This matches the adversarial logic of per-snapshot visual-diff
classification: aligned diffs go through; unrelated diffs
are refused with a recommendation to escalate to a regression bisect.

## Step 8 - CI integration (sticky comment)

```yaml
- name: Fetch tool diff data
  run: |
    npx chromatic --dry-run --json > visual-diffs.json

- name: Generate summary
  run: python scripts/visual_summary.py visual-diffs.json --pr ${{ github.event.pull_request.number }} > summary.md

- name: Post sticky comment
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    header: visual-diff-summary
    path: summary.md
```

## Anti-patterns

| Anti-pattern                                                       | Why it fails                                                                  | Fix |
|--------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Posting one comment per snapshot                                   | PR conversation is buried; reviewer can't see the forest.                    | One sticky summary (Step 8); per-snapshot detail in linked tool UI. |
| No intent classification - just listing diffs                       | Reviewer has to figure out what's expected vs surprise; same problem as no summary. | Aligned / adjacent / unrelated buckets (Step 4). |
| Auto-approving every diff                                           | Regressions silently become baselines. The point of visual tests is defeated. | Auto-approve only aligned cluster (Step 7); refuse unrelated. |
| Sorting by alphabetical name                                        | High-impact diffs sit below low-impact alphabetical earlier-letter ones.     | Sort by max diff ratio within each classification group (Step 6). |
| Cross-tool deduplication missing                                    | Same snapshot appears in 3 reports (Percy + Playwright + Chromatic dual-instrumentation). | Deduplicate by `(componentOrRoute, variant)` cluster key. |
| Reporting unchanged snapshots                                       | Hides the few that did change; reviewer scrolls past.                        | Report only changed; unchanged count in the summary header. |
| Treating "diff% = 0.1" as a real diff                                | Anti-aliasing / font rendering jitter; not a visual change.                  | Threshold (typically diff% > 0.5 or pixel count > 10) before counting. |

## Limitations

- **No semantic understanding of the visual change.** "Color
  changed" vs "layout broke" looks the same in a diff ratio. Eyeball
  the unrelated cluster; the summary is a triage aid, not a
  replacement.
- **Component-graph dependency.** `parentOf`/`childOf` requires a
  curated graph (typical: Storybook tree). Without it, every diff
  outside the changed-files set looks unrelated.
- **No cross-PR memory.** A diff that's been "unrelated" for 3 PRs
  in a row probably isn't a regression - but the summary doesn't
  remember. Persist verdicts in a per-component history table for
  long-term context.
- **Tool-specific quirks.** Chromatic's "interaction tests" can
  produce diffs that aren't visual changes per se (different DOM
  state captured). Tool-specific normalizers in Step 1 must handle
  these.

## References

- The `qa-visual-regression` plugin's per-tool wrappers
  (`percy-visual-regression-testing`,
  `chromatic-visual-regression-testing`, `playwright-snapshots`,
  `storybook-visual-regression-testing`) - the producers of the
  upstream diff data this skill consumes.
- Per-snapshot visual-diff classification and baseline curation -
  the per-snapshot adversarial logic that this skill summarizes at
  the cluster level.
- Text-snapshot golden-file management - same intent-vs-diff
  classification applied to text snapshots.
- Regression bisection - escalation target for unrelated clusters.
- `junit-xml-analysis`,
  `coverage-diff-reporter` - 
  sibling PR-summary skills.
