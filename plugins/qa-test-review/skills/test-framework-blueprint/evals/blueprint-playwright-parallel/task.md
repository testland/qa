# Review our Playwright framework draft before we build it

## Problem Description

Review our Playwright framework draft (`docs/framework-draft.md`) against the app inventory and write the corrected blueprint to `docs/test-blueprint.md`, including the authentication setup and the Playwright config.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: docs/framework-draft.md ===============
# Web E2E framework (draft)

- Playwright Test + TypeScript, `workers: 8`, `fullyParallel: true`.
- Every test logs in through the UI in `beforeEach` as `admin@acme.test`.
- Login state is also saved to `auth/admin.json`, which is committed so CI can reuse it.
- Tests create orders and then assert that the dashboard header shows `Orders: 1`.
- `helpers/retry.ts` wraps every click and fill in a 5-attempt retry with
  `page.waitForTimeout(1000)` between attempts, because clicks sometimes miss.
- CI config: `retries: 3`, `trace: 'off'` to keep artifacts small.

=============== FILE: docs/app-inventory.md ===============
React SPA + Node API. Accounts are per user; an admin sees only their own
organisation's orders. Login takes about 4 s (SSO redirect). The suite has 180 tests.
