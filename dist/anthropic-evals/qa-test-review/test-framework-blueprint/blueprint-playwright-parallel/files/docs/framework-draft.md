# Web E2E framework (draft)

- Playwright Test + TypeScript, `workers: 8`, `fullyParallel: true`.
- Every test logs in through the UI in `beforeEach` as `admin@acme.test`.
- Login state is also saved to `auth/admin.json`, which is committed so CI can reuse it.
- Tests create orders and then assert that the dashboard header shows `Orders: 1`.
- `helpers/retry.ts` wraps every click and fill in a 5-attempt retry with
  `page.waitForTimeout(1000)` between attempts, because clicks sometimes miss.
- CI config: `retries: 3`, `trace: 'off'` to keep artifacts small.
