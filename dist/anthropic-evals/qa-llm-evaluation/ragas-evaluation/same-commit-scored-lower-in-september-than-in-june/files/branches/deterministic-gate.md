# Branch `spike/deterministic-gate` - M. Oyelaran, 2026-09-11

## The argument

Every number on our gate today is produced by asking a judge model a question.
We do not own that model, we cannot see inside it, and it is the thing that
moved under us between June and September. A gate whose readings depend on a
third party's weights is not a gate, it is a weather report.

The library ships metrics that never call a judge. They compare the answer text
against the reference answer directly - n-gram overlap, longest common
subsequence, character-level overlap, string distance. No model, no API key, no
cost, no drift.

## What the branch does

Replaces the four judged metrics with four text-comparison metrics. Same 80
golden rows, same runner.

| Run of tag a91f3c2 | overlap-A | overlap-B | char-overlap | string-distance |
|--------------------|-----------|-----------|--------------|-----------------|
| 2026-09-11, 09:14  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |
| 2026-09-11, 13:40  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |
| 2026-09-12, 08:05  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |

Identical to four decimals, three runs, two days apart. Our current gate has
never repeated a number twice.

## Per-row overlap-A, for the rows I happened to print

| Row   | overlap-A |
|-------|-----------|
| g-004 | 0.91      |
| g-017 | 0.29      |
| g-041 | 0.94      |
| g-058 | 0.88      |
| g-062 | 0.41      |
| g-072 | 0.86      |
| g-091 | 0.35      |
| g-103 | 0.77      |

I have not picked a floor yet. Open to suggestions on where to set it.
