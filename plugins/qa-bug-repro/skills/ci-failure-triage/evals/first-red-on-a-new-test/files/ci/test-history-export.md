## History tool export: com.acme.e2e.ReferralSignupTest

The history tool indexes a test from the first run that contained it.

| run | when | branch | base.url | result |
|---|---|---|---|---|
| pr-2210-run-4 | 2026-08-14 16:22 | pr/2210 | https://pr-2210.preview.acme.internal | pass |
| main-e2e-1187 | 2026-08-17 07:02 | main | https://staging.acme.internal | pass -> fail (first main run) |

- No earlier runs exist: the file was added in PR #2210 and merged 2026-08-14 17:05.
- Runner image `ubuntu-24.04 / 20260810.1.0` on both runs; chromedriver and
  Chrome versions identical on both runs.
- No quarantine list, flake list, or skip annotation exists in this repository.
- The other 10 E2E tests in this run have 50-run histories and are all green.

## Environment facts we can state

- `pr/2210` runs target a per-PR preview stack built from the branch.
- `main` runs target the shared staging stack.
- Feature flags are served per-environment by the flag service. The E2E job does
  not log flag state, and the flag service has no audit export enabled for
  staging.
- `git log --since=2026-08-14 -- src/referral/` returns commits only from PR
  #2210 itself; nothing has changed in that directory since the merge.
