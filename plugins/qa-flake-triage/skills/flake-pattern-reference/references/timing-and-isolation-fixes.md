# Timing, ordering, parallel-state, and resource-leak flake fixes

Deep reference for `flake-pattern-reference` SKILL.md. The Pattern 1
(async / timing), Pattern 2 (test ordering), Pattern 3 (shared parallel
state), and Pattern 4 (resource leaks) code fixes.

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

[pw-action]: https://playwright.dev/docs/actionability
[pw-bp]: https://playwright.dev/docs/best-practices
[pw-api]: https://playwright.dev/docs/api/class-page
[cy-retry]: https://docs.cypress.io/app/core-concepts/retry-ability
[pw-hooks]: https://playwright.dev/docs/api/class-test#test-before-each
[pw-par]: https://playwright.dev/docs/test-parallel
[pw-gs]: https://playwright.dev/docs/test-global-setup-teardown
