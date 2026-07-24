---
name: flake-remediation-guide
description: "Provides concrete code-level fixes for each of the eight recurring flake patterns cataloged in flake-pattern-reference: replacing fixed sleeps with framework auto-waits, isolating state in beforeEach fixtures, adopting stable role-based locators, mocking network and clock, seeding RNG, closing leaked resources, and the Pattern 3 shared-parallel-state fix (per-worker DB schema via workerIndex). Use when a flake has already been classified by pattern and the engineer needs the specific code change to apply. Distinct from shared-parallel-state detection, which finds the problem rather than applying the fix."
---

# flake-remediation-guide

This skill closes the loop with `flake-pattern-reference`: that skill
identifies the pattern; this one gives the code fix.

> **Terminology note:** "flaky test" is a practitioner-emergent term
> from the Google Testing Blog
> ([google-causes](https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html)).
> ISTQB does not maintain a canonical entry. The fixes below are grounded
> in Playwright, Cypress, MSW, and Faker official docs, cited inline.

---

## Pattern 1 fix: async / timing

**Root cause:** a fixed sleep is used instead of a deterministic event.

### Replace fixed sleeps with auto-waiting assertions

Playwright auto-retries actionability checks before every action within
the configured timeout ([pw-actionability][pw-action]) - you never need
`setTimeout` to wait for an element.

[pw-action]: https://playwright.dev/docs/actionability

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

[pw-bp]: https://playwright.dev/docs/best-practices

```typescript
// Before - point-in-time check, races with rendering
expect(await page.getByText('Welcome').isVisible()).toBe(true);

// After - retries until the condition passes or the timeout expires
await expect(page.getByText('Welcome')).toBeVisible();
```

When you need to wait for an arbitrary JavaScript condition, use
`page.waitForFunction()` ([pw-api][pw-api]) instead of a sleep loop:

[pw-api]: https://playwright.dev/docs/api/class-page

```typescript
// Wait until the app sets window.appReady = true
await page.waitForFunction(() => window.appReady === true);
```

For page navigations, `page.waitForLoadState('networkidle')` blocks
until there are no network connections for 500 ms ([pw-api][pw-api]):

```typescript
await page.goto('/dashboard');
await page.waitForLoadState('networkidle');
```

### Cypress equivalent

Cypress retries query commands (`cy.get()`, `cy.find()`, etc.) for up
to `defaultCommandTimeout` (4 s by default) until the attached
assertion passes ([cy-retry][cy-retry]). Remove any `cy.wait(N)` calls
and let retry-ability do the work:

[cy-retry]: https://docs.cypress.io/app/core-concepts/retry-ability

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

---

## Pattern 2 fix: test ordering

**Root cause:** a test mutates state that a later test depends on, so
failures vary with run order.

### Move all mutable setup into beforeEach

Playwright's `test.beforeEach` and `test.afterEach` run before and
after every individual test ([pw-hooks][pw-hooks]). State initialized
there is never shared between tests.

[pw-hooks]: https://playwright.dev/docs/api/class-test#test-before-each

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

---

## Pattern 3 fix: shared parallel state

**Root cause:** two workers write to the same database row, file, or
port.

### Per-worker isolation using workerIndex

Playwright exposes `process.env.TEST_WORKER_INDEX` (unique per worker,
starts at 1) and `testInfo.workerIndex` inside fixtures ([pw-parallel][pw-par]):

[pw-par]: https://playwright.dev/docs/test-parallel

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

---

## Pattern 4 fix: resource leaks

**Root cause:** browsers, servers, or file descriptors opened in test
setup are not closed when the test ends (especially on failure).

### Always close in afterAll with try/finally

Playwright's global setup documentation shows the canonical pattern for
teardown that cannot be skipped ([pw-global-setup][pw-gs]):

[pw-gs]: https://playwright.dev/docs/test-global-setup-teardown

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

---

## Pattern 5 fix: network / external service

**Root cause:** the test reaches a real network endpoint that is slow,
rate-limited, or unavailable in CI.

### Playwright: intercept with page.route()

`page.route(urlPattern, handler)` intercepts every request matching the
pattern and stalls it until you call `fulfill`, `continue`, or `abort`
([pw-network][pw-net]):

[pw-net]: https://playwright.dev/docs/network

```typescript
await page.route('**/api/users', route =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Alice' }]),
  })
);

await page.goto('/users');
await expect(page.getByRole('listitem')).toHaveCount(1);
```

Use `browserContext.route()` instead of `page.route()` when the request
originates from a popup or a new page ([pw-api][pw-api]).

Block non-essential traffic (images, analytics) to speed up tests:

```typescript
await page.route('**/*.{png,jpg,jpeg,gif,webp}', route => route.abort());
```

### MSW (unit / integration tests)

Mock Service Worker intercepts fetch and XHR at the Node.js level for
unit and integration tests ([msw-start][msw]):

[msw]: https://mswjs.io/docs/getting-started

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('https://api.example.com/user', () =>
    HttpResponse.json({ id: 'abc-123', name: 'Alice' })
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());   // clean per-test overrides
afterAll(() => server.close());
```

### Smoke / contract tests that need a real endpoint

Isolate them in a separate Playwright project or Jest project with a
`--testPathPattern` that CI runs outside the main gate. The main merge
gate only runs mocked suites.

---

## Pattern 6 fix: locator drift

**Root cause:** selectors matched by CSS class, position, or text that
shifts with unrelated UI changes.

### Prefer role-based locators

Playwright recommends `getByRole()` as the primary locator strategy
because it reflects how users and assistive technology perceive the
page ([pw-bp][pw-bp]):

```typescript
// Before - CSS class breaks on a design-system update
await page.locator('button.btn-primary.checkout-btn').click();

// After - survives CSS changes; tied to accessible role + name
await page.getByRole('button', { name: 'Checkout' }).click();
```

Fallback order: `getByRole` > `getByTestId` > `getByLabel` / `getByText`
> CSS/XPath (last resort).

### Add data-testid for elements with no stable role

```html
<div class="card" data-testid="product-card-42">...</div>
```

```typescript
await page.getByTestId('product-card-42').click();
```

### Strictness prevents silent multi-match

Playwright locators are strict by default: if a locator matches more
than one element, the action throws rather than silently acting on the
first match ([pw-locators][pw-loc]):

[pw-loc]: https://playwright.dev/docs/locators

```typescript
// Throws immediately if two buttons match - forces you to be more specific
await page.getByRole('button', { name: 'Delete' }).click();
```

Narrow an ambiguous locator with `.filter()`:

```typescript
await page
  .getByRole('listitem')
  .filter({ hasText: 'Product 42' })
  .getByRole('button', { name: 'Delete' })
  .click();
```

---

## Pattern 7 fix: environment variance

**Root cause:** path separators, line endings, timezones, or fonts
differ across OS / CI environments.

### Pin timezone

Set `TZ=UTC` in every CI job that contains time-sensitive assertions.
This eliminates the class of failures where `new Date().toISOString()`
produces a different date in UTC-8 vs. UTC+9.

```yaml
# .github/workflows/test.yml
env:
  TZ: UTC
```

### Use platform-neutral path APIs

```typescript
// Before - breaks on Windows CI
const fixture = path.join('tests', 'fixtures', 'data.json');

// After - works on Linux, macOS, and Windows
import { join } from 'node:path';
const fixture = join('tests', 'fixtures', 'data.json');
```

### Freeze the clock with Playwright's Clock API

When the test asserts a displayed date or a timer-driven behavior, use
`page.clock.install()` to stop the system clock at a fixed instant
([pw-clock][pw-clk]):

[pw-clk]: https://playwright.dev/docs/clock

```typescript
// Install the fake clock before the page loads; freeze at a known UTC instant
await page.clock.install({ time: new Date('2026-01-15T12:00:00Z') });
await page.goto('/dashboard');

// "Last seen" label will always read "Jan 15, 2026" regardless of
// which machine or timezone the test runs on
await expect(page.getByTestId('last-seen')).toHaveText('Jan 15, 2026');
```

`page.clock.install()` overrides `Date`, `setTimeout`, `setInterval`,
`requestAnimationFrame`, and `performance` ([pw-clock][pw-clk]).

### Visual snapshots

For pixel-level snapshot tests, regenerate baselines only in CI (never
from a developer laptop). OS font rendering and anti-aliasing differ
between macOS and Linux - a baseline captured locally will produce
false positives on the CI runner. See `playwright-snapshots`
for the full update workflow.

---

## Pattern 8 fix: randomness

**Root cause:** tests generate random data without a controlled seed,
so the failing combination cannot be reproduced.

### Seed every random source

**Faker.js** - call `faker.seed(N)` before generating any test data.
The same integer seed produces the same data sequence on every run
([faker-api][faker]):

[faker]: https://fakerjs.dev/api/

```typescript
import { faker } from '@faker-js/faker';

beforeEach(() => {
  faker.seed(12345);   // deterministic; any integer works
});

test('long product name does not overflow card', async ({ page }) => {
  const name = faker.commerce.productName();   // same value every run
  await page.goto(`/products/new`);
  await page.getByLabel('Name').fill(name);
  await expect(page.getByTestId('product-card')).toBeVisible();
});
```

**Math.random** - replace with a seeded PRNG such as
[`seedrandom`](https://github.com/davidbau/seedrandom):

```typescript
import seedrandom from 'seedrandom';

const rng = seedrandom('fixed-seed');
const id = Math.floor(rng() * 1_000_000);
```

**Vitest / Jest fake timers** - `vi.useFakeTimers({ seed: N })` or
`jest.useFakeTimers({ now: N })` seeds the internal PRNG as well as
the system clock.

### Persist the seed in CI artifacts

Log the seed used per run so a flake on CI can be replayed locally:

```typescript
const SEED = Number(process.env.TEST_SEED ?? Date.now());
console.log(`faker seed: ${SEED}`);   // visible in CI job log
faker.seed(SEED);
```

Pass `TEST_SEED=<failing-seed>` to reproduce the exact failure.

### Property-based test failures are not flakes

When a property-based test (fast-check, jqwik) fails, it has found a
real edge case. Copy the failing seed into a regression test and fix
the production bug.

---

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

---

## Related components

- `flake-pattern-reference` -
  detection heuristics and triage decision tree for identifying which
  pattern applies before applying a fix from this skill.
- `flaky-test-quarantine` -
  workflow to quarantine a flake while this fix is in progress.
