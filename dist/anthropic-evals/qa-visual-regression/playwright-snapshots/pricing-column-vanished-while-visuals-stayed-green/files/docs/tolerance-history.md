# How the tolerances got where they are

| PR    | Date       | Change                                          | Stated reason                          |
|-------|------------|-------------------------------------------------|----------------------------------------|
| #1907 | 2026-06-11 | added `maxDiffPixels: 800`                       | "anti-aliasing on the headings"        |
| #1962 | 2026-06-24 | `maxDiffPixels` 800 -> 12000                     | "ticker keeps flipping it"             |
| #2011 | 2026-07-02 | added `threshold: 0.3`                           | "letting 30% of pixels vary, ad slot"  |
| #2044 | 2026-07-15 | `threshold` 0.3 -> 0.6, `maxDiffPixels` -> 45000 | "still red twice a week, going to 60%" |

Marcus's PR description on #2011: "threshold is the fraction of the image
allowed to differ, so 0.3 gives us headroom for the ad slot without being silly
about it."

Review comment from @hsong on #2011, approving: "Agreed, 30% of the image is
generous but that ad slot is a third of the fold on mobile."

Extract from `runbook/visual-job.md`, current:

> **If the visual job is red and you cannot see why.** The two numbers that
> matter are `maxDiffPixels` (how many pixels may differ) and `threshold` (what
> proportion of the image may differ). Raising either makes the job more
> forgiving. Do not raise them past the values in `playwright.config.ts` without
> asking Marcus.
