# Mutation score by month, assembled from the archived summaries

Compiled by @leena on 2026-09-10 from the `mutation-summary` artifact of the
first Monday run of each month.

| Month    | Score | Line coverage | Valid mutants | Job conclusion |
|----------|-------|---------------|---------------|----------------|
| 2026-03  | 78.1% | 86.2%         | 1,402         | success        |
| 2026-04  | 74.6% | 86.0%         | 1,471         | success        |
| 2026-05  | 71.2% | 86.4%         | 1,538         | success        |
| 2026-06  | 66.9% | 85.9%         | 1,644         | success        |
| 2026-07  | 61.4% | 86.1%         | 1,702         | success        |
| 2026-08  | 56.8% | 86.0%         | 1,795         | success        |
| 2026-09  | 52.4% | 86.2%         | 1,880         | success        |

Notes from Leena:

- Twenty-six weekly runs since the gate landed. Every one of them concluded
  `success`. The four that printed a score under 60 concluded `success` too.
- The mutant count rises every month, so each run is analysing that month's
  code rather than replaying an old result.
- I checked out last week's tree and ran `npx stryker run` on my laptop with
  the repo config. It printed the same 52.4 and then `echo $?` gave me 1.
- Nobody has ever been able to see which mutants survived. The artifact is the
  console summary and that is all we keep.
- Line coverage over the same period is the third column. It has not moved.
