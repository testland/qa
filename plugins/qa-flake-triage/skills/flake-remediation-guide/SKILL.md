---
name: flake-remediation-guide
description: "Provides concrete code-level fixes for each of the eight recurring flake patterns cataloged in flake-pattern-reference: replacing fixed sleeps with framework auto-waits, isolating state in beforeEach fixtures, adopting stable role-based locators, mocking network and clock, seeding RNG, closing leaked resources, and the Pattern 3 shared-parallel-state fix (per-worker DB schema via workerIndex). Use when a flake has already been classified by pattern and the engineer needs the specific code change to apply. Distinct from shared-parallel-state detection, which finds the problem rather than applying the fix."
---

# flake-remediation-guide

This skill closes the loop with `flake-pattern-reference`: that skill
identifies the pattern; this one gives the code fix.

> **Terminology note:** "flaky test" is a practitioner-emergent term
> from the Google Testing Blog
> ([google-causes][google-causes]).
> ISTQB does not maintain a canonical entry. The fixes below are grounded
> in Playwright, Cypress, MSW, and Faker official docs, cited inline.

## How to use

1. **Classify first.** Name the pattern by inspection
   (`flake-pattern-reference`) or by experiment (`flake-axis-bisection`);
   this guide is keyed by that pattern number.
2. **Jump to the fix.** Patterns 1-4 are below; patterns 5-8 (network,
   locator drift, environment, randomness) live in the two references
   under "Patterns 5-8".
3. **Apply the smallest change** the pattern calls for - a targeted edit,
   not a rewrite.
4. **Re-measure at a real depth.** Re-run at an N chosen from the failure
   rate you are willing to ship, not the screening N; a clean 0/20 does
   not prove the flake is gone (`flake-axis-bisection`).
5. **Quarantine if it blocks the trunk** while the fix is in review
   (`flaky-test-quarantine`).

## Worked example

A checkout test, `tests/checkout.spec.ts:42`, fails about 15% of runs in
CI and always passes locally.

1. **Classify.** `flake-axis-bisection` implicates the network-latency
   axis, and reading the source shows the assertion is gated on a fixed
   `page.waitForTimeout(2000)`, not on the response. That is Pattern 1
   (async / timing): the sleep is shorter than the slowest CI response.
2. **Locate the fix.** Pattern 1 below - replace the fixed sleep with a
   web-first assertion that retries until the condition holds.

```typescript
// Before - the 2s sleep races a variable-latency XHR
await page.getByRole('button', { name: 'Place order' }).click();
await page.waitForTimeout(2000);
expect(await page.getByText('Order confirmed').isVisible()).toBe(true);

// After - retries until the confirmation renders or the timeout expires
await page.getByRole('button', { name: 'Place order' }).click();
await expect(page.getByText('Order confirmed')).toBeVisible();
```

3. **Re-measure and ship.** The team's tolerance is 1%, so re-run at
   N=300 (`flake-axis-bisection` Step 2). A clean 0/300 bounds the rate at
   roughly 1%; a clean 0/20 would have proved nothing. No quarantine was
   needed - the fix landed inside the PR the flake was blocking.

## Pattern 1 fix: async / timing

**Root cause:** a fixed sleep is used instead of a deterministic event.

### Replace fixed sleeps with auto-waiting assertions

Playwright auto-retries actionability checks before every action within
the configured timeout ([pw-actionability][pw-action]) - you never need
`setTimeout` to wait for an element.

```typescript
// Before - brittle fixed sleep
await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'Submit' }).click();

// After - Playwright auto-waits until the button is visible, stable,
// and enabled before clicking ([pw-actionability][pw-action])
await page.getByRole('button', { name: 'Submit' }).click();
```

For assertions, use web-first `expect` forms that retry automatically
([pw-best-practices][pw-bp]):

```typescript
// Before - point-in-time check, races with rendering
expect(await page.getByText('Welcome').isVisible()).toBe(true);

// After - retries until the condition passes or the timeout expires
await expect(page.getByText('Welcome')).toBeVisible();
```

### Waiting on an explicit condition

For an arbitrary JavaScript condition use `page.waitForFunction()`
([pw-api][pw-api]) instead of a sleep loop; for navigations,
`page.waitForLoadState('networkidle')` blocks until there are no network
connections for 500 ms ([pw-api][pw-api]):

```typescript
await page.waitForFunction(() => window.appReady === true);

await page.goto('/dashboard');
await page.waitForLoadState('networkidle');
```

### Cypress equivalent

Cypress retries query commands (`cy.get()`, `cy.find()`, etc.) for up
to `defaultCommandTimeout` (4 s by default) until the attached
assertion passes ([cy-retry][cy-retry]). Remove any `cy.wait(N)` calls
and let retry-ability do the work:

```javascript
// Before
cy.wait(3000);
cy.get('[data-testid="result"]').should('contain', 'Done');

// After - cy.get() retries until the assertion passes
cy.get('[data-testid="result"]').should('contain', 'Done');
```

### Animations

Disable CSS animations in test setup so animated transitions do not
cause the stability check to spin. Playwright config ([pw-action][pw-action]):

```typescript
// playwright.config.ts
export default defineConfig({
  use: { launchOptions: { args: ['--force-prefers-reduced-motion'] } },
});
```

Cypress: `Cypress.config('animationDistanceThreshold', 0)` in
`cypress/support/e2e.ts`.

## Pattern 2 fix: test ordering

**Root cause:** a test mutates state that a later test depends on, so
failures vary with run order.

### Move all mutable setup into beforeEach

Playwright's `test.beforeEach` and `test.afterEach` run before and
after every individual test ([pw-hooks][pw-hooks]). State initialized
there is never shared between tests.

```typescript
// Before - shared mutable variable leaks between tests
let userId: string;

test.beforeAll(async ({ request }) => {
  userId = await createUser(request);   // mutated once; all tests share it
});

test('user can log in', async ({ page }) => {
  await page.goto(`/users/${userId}`);
});

test('user can be deleted', async ({ page }) => {
  await deleteUser(userId);             // now userId is gone for sibling tests
});

// After - each test gets its own user
test.beforeEach(async ({ request }, testInfo) => {
  testInfo.userId = await createUser(request);
});

test.afterEach(async ({ request }, testInfo) => {
  await deleteUser(testInfo.userId);
});
```

For database tests, roll back a transaction after each test rather
than truncating between describe blocks. This keeps isolation cheap and
avoids the DDL lock contention that truncation can cause in CI.

### Surface ordering bugs early

Run the suite with `--repeat-each=3` in Playwright or `jest --randomize`
to force different orderings in CI. The first run that diverges from a
clean run pinpoints the ordering dependency.

## Pattern 3 fix: shared parallel state

**Root cause:** two workers write to the same database row, file, or
port.

### Per-worker isolation using workerIndex

Playwright exposes `process.env.TEST_WORKER_INDEX` (unique per worker,
starts at 1) and `testInfo.workerIndex` inside fixtures ([pw-parallel][pw-par]):

```typescript
// fixtures/db.ts - per-worker database schema
import { test as base } from '@playwright/test';

export const test = base.extend<{}, { dbSchema: string }>({
  dbSchema: [
    async ({}, use, workerInfo) => {
      const schema = `test_${workerInfo.workerIndex}`;
      await db.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      await db.query(`SET search_path TO ${schema}`);
      await use(schema);
      await db.query(`DROP SCHEMA ${schema} CASCADE`);
    },
    { scope: 'worker' },
  ],
});
```

Per-worker isolation checklist:

- DB: `PG_SCHEMA=test_${workerIndex}` or a per-worker SQLite file.
- Files: `TMPDIR=/tmp/test-worker-${workerIndex}`.
- Ports: allocate from a per-worker range
  (`BASE_PORT=4000 + workerIndex * 10`).
- IDs: use UUIDs, not auto-increment integers shared across workers.

## Pattern 4 fix: resource leaks

**Root cause:** browsers, servers, or file descriptors opened in test
setup are not closed when the test ends (especially on failure).

### Always close in afterAll with try/finally

Playwright's global setup documentation shows the canonical pattern for
teardown that cannot be skipped ([pw-global-setup][pw-gs]):

```typescript
test.afterAll(async ({ browser }) => {
  try {
    await customServer.close();
  } finally {
    await browser.close();   // runs even if server.close() throws
  }
});
```

`try/finally` releases the browser process even if the preceding
cleanup step throws.

### Per-test timeouts

Set a per-test timeout so the framework terminates a hung test rather
than letting it block workers indefinitely ([pw-api][pw-api]):

```typescript
// playwright.config.ts
export default defineConfig({ timeout: 30_000 });

// Override for a single slow test
test('slow import', async ({ page }) => {
  test.setTimeout(60_000);
  // ...
});
```

## Patterns 5-8: network, locator drift, environment, randomness

The four remaining pattern fixes are code-heavy and self-contained, so
they live in two deep references. Each carries its own citations.

- **Network + locator drift** - Pattern 5 (mock at the boundary with
  `page.route()` / MSW; never reach a real endpoint) and Pattern 6
  (role-based locators, `data-testid` fallback, strict multi-match):
  [references/network-and-locator-fixes.md](references/network-and-locator-fixes.md).
- **Environment + randomness** - Pattern 7 (pin `TZ=UTC`, freeze the
  clock, normalize paths, CI-only visual baselines) and Pattern 8 (seed
  every RNG and persist the seed in the CI log):
  [references/environment-and-randomness-fixes.md](references/environment-and-randomness-fixes.md).

## Quick-reference: pattern to fix

| Pattern | Key fix | Primary API |
|---------|---------|-------------|
| async / timing | Replace sleep with auto-wait assertion | `await expect(loc).toBeVisible()` ([pw-bp][pw-bp]) |
| test ordering | Move setup to `beforeEach`; roll back DB per test | `test.beforeEach` / `test.afterEach` ([pw-hooks][pw-hooks]) |
| shared parallel state | Per-worker schema / dir / port via `workerIndex` | `testInfo.workerIndex` ([pw-par][pw-par]) |
| resource leaks | `browser.close()` in `afterAll` with `try/finally` | `test.afterAll` + `try/finally` ([pw-gs][pw-gs]) |
| network | Mock at boundary; never reach real endpoints | `page.route()` ([pw-net][pw-net]) / MSW ([msw][msw]) |
| locator drift | Role-based locators; `data-testid` fallback | `getByRole()` ([pw-bp][pw-bp]) |
| environment variance | Pin `TZ=UTC`; freeze clock; normalize paths | `page.clock.install()` ([pw-clk][pw-clk]) |
| randomness | Seed every RNG; persist seed in CI log | `faker.seed(N)` ([faker-api][faker]) |

## Related components

- `flake-pattern-reference` -
  detection heuristics and triage decision tree for identifying which
  pattern applies before applying a fix from this skill.
- `flake-axis-bisection` -
  the measurement protocol that classifies a flake by experiment when
  inspection is inconclusive.
- `flaky-test-quarantine` -
  workflow to quarantine a flake while this fix is in progress.

[google-causes]: https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html
[pw-action]: https://playwright.dev/docs/actionability
[pw-bp]: https://playwright.dev/docs/best-practices
[pw-api]: https://playwright.dev/docs/api/class-page
[cy-retry]: https://docs.cypress.io/app/core-concepts/retry-ability
[pw-hooks]: https://playwright.dev/docs/api/class-test#test-before-each
[pw-par]: https://playwright.dev/docs/test-parallel
[pw-gs]: https://playwright.dev/docs/test-global-setup-teardown
[pw-net]: https://playwright.dev/docs/network
[msw]: https://mswjs.io/docs/getting-started
[pw-clk]: https://playwright.dev/docs/clock
[faker]: https://fakerjs.dev/api/
