# New referral E2E failed on its second-ever run

## Problem Description

A contractor added `ReferralSignupTest` in PR #2210 and it merged on Friday
afternoon. It passed on the PR run. On Monday's first main-branch run it failed
with "no such element" on the referral code field. The contract ended Friday,
so there is nobody to ask what the test was written against.

Two answers are circulating. The referral team says the test is wrong - the
contractor probably used an identifier that only exists in a branch build. The
QA lead says the test is right and the referral form is not rendering on the
shared environment, which would be a real bug behind a flag.

Whoever is wrong wastes a couple of days, and main stays red while we argue. We
have the failing run's log and what our history tool knows about this test. We
want a written determination we can act on, or a written statement of why we
cannot make one yet.

## Output Specification

Produce `triage-referral-e2e.md` containing:

1. What kind of failure this is and who owns the next action, or - if the
   attached material does not settle it - a clear statement that it does not,
   with the reason.
2. What the attached material does establish, quoting the specific lines and
   values you relied on.
3. What it does not establish, and for each gap the exact artefact you would
   collect and what that artefact would let you conclude.
4. The next action, stated so someone else can carry it out.

Do not fill a gap with the most likely story.

Out of scope: editing the test, changing selectors, touching application code,
or drafting a bug-report form.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/main-e2e-1187.log ===============
2026-08-17T07:02:11Z ##[group]Runner Image
2026-08-17T07:02:11Z Image: ubuntu-24.04   Version: 20260810.1.0
2026-08-17T07:02:11Z ##[endgroup]
2026-08-17T07:02:12Z ##[group]Run mvn -B -Pe2e verify -Dbase.url=https://staging.acme.internal
2026-08-17T07:02:58Z [INFO] Running com.acme.e2e.CheckoutSmokeTest
2026-08-17T07:03:41Z [INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 42.8 s
2026-08-17T07:03:42Z [INFO] Running com.acme.e2e.ReferralSignupTest
2026-08-17T07:04:19Z [ERROR] Tests run: 1, Failures: 0, Errors: 1, Skipped: 0, Time elapsed: 37.1 s
2026-08-17T07:04:19Z [ERROR] submitsAReferralCode  Time elapsed: 37.1 s  <<< ERROR!
2026-08-17T07:04:19Z org.openqa.selenium.NoSuchElementException:
2026-08-17T07:04:19Z no such element: Unable to locate element:
2026-08-17T07:04:19Z   {"method":"css selector","selector":"[data-qa=referral-code-input]"}
2026-08-17T07:04:19Z   (Session info: chrome=141.0.7390.54)
2026-08-17T07:04:19Z   at org.openqa.selenium.remote.RemoteWebDriver.findElement(RemoteWebDriver.java:390)
2026-08-17T07:04:19Z   at com.acme.e2e.pages.ReferralPage.codeInput(ReferralPage.java:24)
2026-08-17T07:04:19Z   at com.acme.e2e.ReferralSignupTest.submitsAReferralCode(ReferralSignupTest.java:31)
2026-08-17T07:04:20Z [INFO] Running com.acme.e2e.AccountSettingsTest
2026-08-17T07:04:55Z [INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 34.6 s
2026-08-17T07:04:57Z [INFO] Results:
2026-08-17T07:04:57Z [ERROR] Errors: com.acme.e2e.ReferralSignupTest.submitsAReferralCode
2026-08-17T07:04:57Z [INFO] Tests run: 11, Failures: 0, Errors: 1, Skipped: 0
2026-08-17T07:04:59Z ##[group]Run actions/upload-artifact@v4
2026-08-17T07:04:59Z   with:
2026-08-17T07:04:59Z     name: e2e-artifacts
2026-08-17T07:04:59Z     path: e2e-artifacts/**
2026-08-17T07:04:59Z ##[warning]No files were found with the provided path: e2e-artifacts/**. No artifacts will be uploaded.
2026-08-17T07:04:59Z ##[endgroup]
2026-08-17T07:05:00Z ##[error]Process completed with exit code 1.

=============== FILE: ci/test-history-export.md ===============
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
