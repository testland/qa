## Per-test history, last 50 main-branch runs

| Test | Failures in 50 | Notes |
|---|---|---|
| tests/docs/** (13 suites) | 13 each, all in build 8842 | never failed before build 8842 |
| tests/pricing/discount.spec.ts | 1 (build 8842) | 43 consecutive passes before it; also failed on the retry of build 8842 at 03:44, which ran the same commit while docs-index was still down |
| tests/pricing/tax.spec.ts | 0 | |
| tests/pricing/currency.spec.ts | 0 | |

- Runner image `ubuntu-24.04 / 20260810.1.0` on every run in the window,
  unchanged for 11 days.
- No quarantine list, flake list, or skip annotation exists in this repository.
- docs-index incident window: 2026-08-13 01:50 to 03:10 UTC (status page).
