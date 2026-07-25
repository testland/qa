# Visual-diff summary report format

The sticky PR comment emitted by `SKILL.md` Step 5. Clusters are grouped
aligned → adjacent → unrelated, sorted by max diff ratio within each group.

```markdown
## Visual diff summary - `<sha>`

**Total snapshots:** 87 (12 changed, 75 unchanged)
**Verdict:** REVIEW (1 unrelated cluster suspects regression)

### ✅ Aligned with PR intent (3 clusters, 7 diffs)

The PR title says **"Refactor Button to use new design tokens"** - these clusters match.

| Cluster | Diffs | Max diff% | Recommendation |
|---------|------:|----------:|----------------|
| Button  |   4   |   8.2%    | Update baselines (accept new snapshots) |
| ButtonGroup |   2   |   3.1%    | Update baselines |
| IconButton  |   1   |   1.5%    | Update baseline   |

### ⚠ Adjacent (1 cluster, 3 diffs) - confirm intent

| Cluster | Diffs | Max diff% | Recommendation |
|---------|------:|----------:|----------------|
| Modal   |   3   |   2.8%    | Modal contains Button; check that the Button color change inside Modal is intended (it should be - but eyeball one). |

### ❌ Unrelated (1 cluster, 2 diffs) - DO NOT update without investigation

| Cluster | Diffs | Max diff% | Recommendation |
|---------|------:|----------:|----------------|
| Footer  |   2   |   12.0%   | The Footer component isn't mentioned in the PR. Suspected unintended cascade. Open the diffs and run a regression bisect if no obvious cause. |
```

The report ends with a **Quick actions** block that auto-approves only the aligned cluster - adjacent and unrelated clusters are left for manual review:

```bash
# Update aligned baselines after eyeballing 1 sample per cluster:
chromatic --auto-accept-changes --only-changed --components Button,ButtonGroup,IconButton
# OR for Percy:
percy approve <build-id> --snapshots Button,ButtonGroup,IconButton
# Refused - Footer cluster needs investigation; do NOT auto-approve.
```
