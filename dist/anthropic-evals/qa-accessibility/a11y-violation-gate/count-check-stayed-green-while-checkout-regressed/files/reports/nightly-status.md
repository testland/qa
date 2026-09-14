# Nightly a11y scan - job #2211 onward

| Run   | Date       | Result  | Artifact uploaded |
|-------|------------|---------|-------------------|
| #2211 | 2026-08-30 | success | yes               |
| #2212 | 2026-08-31 | failure | no - runner OOM   |
| #2213 | 2026-09-01 | failure | no - runner OOM   |
| #2214 | 2026-09-02 | failure | no - runner OOM   |
| #2215 | 2026-09-03 | failure | no - runner OOM   |

The branch check downloads the most recent successful nightly artifact and
compares against that. Since #2211 that has been the 30 August one. When no
artifact can be downloaded at all the step logs `no baseline artifact - skipping`
and the job goes green. PR #4471 merged 2026-09-08.

The April audit signed off nine findings as known debt: five contrast, one form
label, one image alt, one empty link, one landmark. Nothing has been added to
that set or taken off it since.
