# Output-shape templates

Deep reference for the test-run-summary-author SKILL.md. Consult for the full
fill-in template of each of the four narrative shapes. The shape is an explicit
parameter and defaults to `status-update`.

## `status-update` (Slack-ready, ≤3 lines)

```markdown
**:white_check_mark: 2026-05-09 nightly regression - 1,247 pass, 18 fail, 3 skipped.**
Pass rate 98.6% (-0.3pp vs Wed). Top regressions: `cart.checkout.spec` (timeout), `auth.sso.spec` (assertion), `payments.refund.spec` (timeout). Run: <build-url>.
Duration 1h 12m, +4 min vs Wed; investigation owners: @cart, @auth, @payments.
```

The single-line lead is the load-bearing claim; the second and third lines are deltas + ownership. `:white_check_mark:` / `:warning:` / `:x:` map to pass-rate ≥99% / 95 - 98.99% / <95% by default (configurable per project).

## `release-notes` (PR / changelog form)

```markdown
## QA - v3.4.0

- **Test results:** 1,247 / 1,268 tests passed (98.3%), 18 failures, 3 skipped. Full report: <build-url>.
- **New failures vs v3.3.0:** 5 (3 in cart, 2 in auth). All 5 have open issues filed; severity classified per Allure. None are blocking per the team's release-readiness gates.
- **Coverage:** 87.4% line, 78.1% branch (+0.6 / +0.4 vs v3.3.0). See `coverage-diff-reporter` for per-file delta.
- **Performance:** smoke + regression duration 1h 12m, no SLO regressions.
- **Known issues being shipped:** 3 P3 cosmetic flakes (tracked in [JIRA-1234, JIRA-1235, JIRA-1236]), waivers attached.
```

## `exec-summary` (one-paragraph + bullets)

For the QBR / weekly leadership update. Three sentences plus a 4-bullet outlook:

```markdown
The v3.4.0 release went through nightly regression with a 98.3% pass rate, marginally down from v3.3.0's 98.6% - driven by five new failures concentrated in cart and auth, all with open issues and assigned owners. Coverage improved (+0.6 line, +0.4 branch) and the smoke / regression duration stayed inside the 90-minute SLO. The release-readiness gate cleared with the standard 3 cosmetic-flake waivers.

- **What we ship:** v3.4.0 cleared all blocking gates.
- **What we watch:** auth.sso flakes - 2 of 5 failures share root cause; bisector running.
- **What we'd flag:** cart.checkout timeout - newly regressed since v3.3.0, possible perf change in the inventory-cache path.
- **What we'd ask of leadership:** confirm the 90-minute regression SLO is still the right ceiling; current trend is +4 minutes per release.
```

## `cross-run-trend` (multi-run window, narrative)

A narrative form covering a time window (last N runs, last N days). The skill computes per-run metrics, identifies the run-over-run direction, and writes the trend in prose. This is the manager-layer complement to a tabular suite-health trend reporter - that answers "what is the suite health"; this shape answers "tell me the story over the last sprint." Requires ≥5 runs; with fewer, emit `INSUFFICIENT_RUNS` rather than drafting a trend from too few data points.
