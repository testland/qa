# CI perf job outcomes, 2026-03-16 through 2026-09-08

214 pull requests. 214 runs completed. 0 runs failed. The job has never posted
an assertion failure.

Changes that landed in that window and were later attributed to a performance
regression by someone other than this job:

| PR    | Change                                                              | Found by                             | CI verdict |
|-------|---------------------------------------------------------------------|--------------------------------------|------------|
| #1188 | Unresized 2.4 MB hero image on `/portal`                             | Pulsemetrics alert, day 4            | pass       |
| #1306 | Charting dep pulled into the shared vendor chunk, 410→822 kB gzip    | Pulsemetrics alert, day 9            | pass       |
| #1355 | Third-party eligibility script added render-blocking to `/appointments` | Rolled back after a member complaint | pass       |

Runner: `ubuntu-latest`, `npx lhci autorun` with no `--config` flag, `@lhci/cli`
pinned in `devDependencies`. Reports are uploaded on every run and the last 90
are still in the artifact store.
