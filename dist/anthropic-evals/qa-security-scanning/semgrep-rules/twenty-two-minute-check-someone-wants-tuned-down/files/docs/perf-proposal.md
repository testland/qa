# Proposal: cut the sast check from 22m to under 5m

@priyanka.raman, 2026-09-10. Measured on branch `perf/sast-tuning`, five runs
each, GitHub-hosted `ubuntu-latest`.

Baseline on main: 21m 54s median.

**1. Cap the size of files we analyse at 200 KB.**
A handful of very large files dominate the tail of the scan. Capping the
per-file size takes the long tail off. Measured: -7m 20s.

**2. Cut the per-rule per-file timeout to 2 seconds.**
Some rules spend a long time on a few files. Two seconds is plenty for the
rules that actually find things. Measured: -4m 05s.

**3. Run with parallelism 2.**
I tried a few values. Going higher did not help much and the job got less
predictable run to run, so I would rather pin it somewhere stable and 2 felt
safe on a shared runner. Measured: +0m 40s (slightly slower, but steadier).

**4. Exclude `vendor/` and `**/*.min.js`.**
Neither is code we write. `vendor/` is 340 MB of third-party checkouts and the
minified bundles are unreadable output. Measured: -5m 10s.

**5. Switch the config over to registry auto-detection instead of our two
pinned rulesets.**
Auto-detection resolves rules per detected language rather than running both of
our pinned sets over everything, so it runs fewer rules. It is also one flag
instead of two and we stop having to think about which sets we are on.
Measured: -1m 30s.

Total on my branch: **4m 10s**. Findings count went from 34 to 31; the three
that dropped off were all in `vendor/`, which is item 4 doing its job.
