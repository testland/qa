# Branch `spike/deterministic-gate` - M. Oyelaran, 2026-09-11

## The argument

Every number on our gate today is produced by asking a judge model a question.
We do not own that model, we cannot see inside it, and it is the thing that
moved under us between June and September. A gate whose readings depend on a
third party's weights is not a gate, it is a weather report.

The library ships metrics that never call a judge. They compare the answer
text against the reference answer directly - n-gram overlap, longest common
subsequence, character-level overlap, string distance. No model, no API key,
no cost, no drift.

## What the branch does

Replaces the four judged metrics with four text-comparison metrics and sets
floors from the tag run. Same 80 golden rows, same runner.

| Run of tag a91f3c2 | overlap-A | overlap-B | char-overlap | string-distance |
|--------------------|-----------|-----------|--------------|-----------------|
| 2026-09-11, 09:14  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |
| 2026-09-11, 13:40  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |
| 2026-09-12, 08:05  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |

Identical to four decimals, three runs, two days apart. Our current gate has
never repeated a number twice.

## Spot check the docs team ran on six golden rows

They read the answer the assistant gave and marked it right or wrong
themselves, with no reference to any score. `overlap-A` is from this branch;
`faithfulness` is from the 09-02 run for the same row.

| Row   | What the answer did                                          | Docs team | overlap-A | faithfulness |
|-------|--------------------------------------------------------------|-----------|-----------|--------------|
| g-004 | gave a rate limit of 60 per minute; the docs say 6 per minute | wrong     | 0.91      | 0.20         |
| g-017 | correct, but written in its own words start to finish          | right     | 0.29      | 0.96         |
| g-041 | correct, quoted the release note almost verbatim               | right     | 0.94      | 0.98         |
| g-058 | said the legacy CSV import is still supported                  | wrong     | 0.88      | 0.15         |
| g-062 | correct, reworded, plus one extra correct detail               | right     | 0.41      | 0.94         |
| g-072 | put the backoff change on the wrong release                    | wrong     | 0.86      | 0.34         |

I have not picked a floor yet. Open to suggestions on where to set it.
