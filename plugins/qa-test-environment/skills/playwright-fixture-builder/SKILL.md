---
name: playwright-fixture-builder
description: "Builds reusable Playwright fixtures via `test.extend` - picks the right scope (test vs worker), wires the `use(value)` setup/teardown split, composes auth (storageState per worker), database (per-test snapshot/restore), and feature-flag fixtures into one custom `test` object the whole suite imports. Outputs the `fixtures.ts` file plus per-fixture review notes (scope rationale, teardown ordering, `workerInfo.workerIndex` for parallel isolation). Use when the suite has copy-pasted `beforeEach` boilerplate that should be a fixture, or when adding auth / db / flag setup that crosses many specs."
---

# playwright-fixture-builder

## Overview

Playwright Test fixtures "establish the environment for each test,
giving the test everything it needs and nothing else"
([pw-fixtures][pw-fix]). They replace `beforeEach` / `afterEach`
boilerplate with composable, lazy-initialized values that hang off
the `test` function:

[pw-fix]: https://playwright.dev/docs/test-fixtures

```typescript
test('does X', async ({ page, todoPage, authedUser }) => {
  // page, todoPage, authedUser are fixtures
});
```

This skill is **build-an-X** - it produces the `fixtures.ts` (or
language-equivalent) file from the team's actual setup needs (auth,
database state, feature flags, app instance), picking the right
scope and teardown ordering for each.

The default Playwright fixtures available out of the box are
**`page`, `context`, `browser`, `browserName`, and `request`**
([pw-fixtures][pw-fix]).

## When to use

- Multiple spec files copy-paste `beforeEach`/`afterEach` setup
  blocks that should be a fixture.
- A new test suite needs auth + DB + flags wired and the team wants
  one cohesive `fixtures.ts` rather than ad-hoc helpers.
- An existing suite is slow because each test re-authenticates;
  there's a worker-scope shortcut available.
- The team is adding parallelism and current fixtures don't honor
  `workerInfo.workerIndex` for per-worker isolation.

If the suite has only a handful of specs and one common helper, a
shared `helpers.ts` file is enough - fixtures pay off when 5+ specs
share setup or when teardown ordering matters.

## Step 1 - Identify the right scope per fixture

Per [pw-fixtures][pw-fix]:

> "**Test-scoped** (default): Run before/after each test, torn down
> immediately after."
>
> "**Worker-scoped**: Run once per worker process, sharing resources
> across multiple tests. Declare with `{ scope: 'worker' }`."

| Fixture                   | Scope      | Why                                                                              |
|---------------------------|------------|----------------------------------------------------------------------------------|
| Authenticated user        | `worker`   | Auth handshake is expensive (UI login, cookie set, OTP); state is shareable.    |
| Storage-state file path   | `worker`   | One storageState per worker keeps server-side cohorts isolated.                 |
| Page object (TodoPage)    | `test`     | Each test needs a clean DOM and navigation start.                                |
| Test-DB snapshot          | `test`     | Per-test isolation requires per-test restore.                                    |
| Feature-flag overrides    | `test`     | Different tests may want different flag combos (compose with feature-flag-test-harness). |
| Browser instance          | `worker`   | (Playwright default) - sharing cuts ~500ms per test.                             |
| Test-data factory         | `test`     | Each test gets fresh fixtures with worker-namespaced IDs.                       |

**Rule of thumb:** if changing the fixture between two tests would
cause a test to fail, scope it `test`. Otherwise scope it `worker`.

## Step 2 - Auth fixture (`storageState` per worker)

Per [pw-auth][pw-auth], the storageState pattern signs in once and
reuses cookies + localStorage across tests:

[pw-auth]: https://playwright.dev/docs/auth

```typescript
// fixtures/auth.ts
import { test as base, type BrowserContext } from '@playwright/test';
import path from 'node:path';

type AuthFixtures = {
  storageState: string;
};

export const test = base.extend<{}, AuthFixtures>({
  storageState: [async ({ browser }, use, workerInfo) => {
    const username = `user${workerInfo.workerIndex}`;
    const fileName = path.resolve(`playwright/.auth/${username}.json`);

    const page = await browser.newPage({ storageState: undefined });
    await page.goto('/login');
    await page.getByLabel('Email').fill(`${username}@example.com`);
    await page.getByLabel('Password').fill('test-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/dashboard');

    await page.context().storageState({ path: fileName });
    await page.close();

    await use(fileName);
  }, { scope: 'worker' }],
});
```

Per [pw-auth][pw-auth], the storageState pattern uses
`await page.context().storageState({ path: authFile });` to write
the cookie/localStorage snapshot, and tests pick it up via
`storageState: 'playwright/.auth/user.json'` on the test or project.

Per [pw-fix][pw-fix], `workerInfo.workerIndex` is the canonical way
to derive per-worker unique values:

> "A common use case is accessing `workerInfo.workerIndex` to create
> unique resources per worker."

For per-worker accounts (when each worker mutates its own
server-side state), **`user${workerInfo.workerIndex}`** is the
canonical pattern.

### Wire it via `test.use`

```typescript
// tests/dashboard.spec.ts
import { test, expect } from './fixtures/auth';

test.use({ storageState: ({ storageState }, use) => use(storageState) });

test('shows the user dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading')).toContainText('Welcome');
});
```

Or set globally in `playwright.config.ts`:

```typescript
projects: [
  {
    name: 'authenticated',
    use: { storageState: 'playwright/.auth/user.json' },
  },
],
```

## Step 3 - Page Object fixture (test-scoped)

Page objects encapsulate per-page selectors and behaviors. The
canonical example from [pw-fix][pw-fix]:

```typescript
const test = base.extend<{ todoPage: TodoPage }>({
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);
    await todoPage.removeAll();
  },
});
```

The `use()` call demarcates setup vs teardown: code before is setup,
code after is teardown. The teardown runs even if the test fails.

## Step 4 - DB fixture (composes with `db-snapshot-restore`)

```typescript
// fixtures/db.ts
import { test as base } from './auth';
import { execSync } from 'node:child_process';

type DbFixtures = {
  cleanDb: void;
};

export const test = base.extend<DbFixtures>({
  cleanDb: [async ({}, use) => {
    execSync('bash scripts/restore-test-db.sh', { stdio: 'inherit' });
    await use();
    // No teardown — next test runs `restore` itself.
  }, { auto: true }],
});
```

Per [pw-fix][pw-fix], `{ auto: true }` makes a fixture run for every
test even if the test doesn't list it in its parameters - the right
choice for cross-cutting state like DB reset.

The shell script delegates to the db-snapshot-restore agent's
restore mode (see [`db-snapshot-restore`](../../agents/db-snapshot-restore.md)).

## Step 5 - Feature-flag fixture (composes with feature-flag-test-harness)

```typescript
// fixtures/flags.ts
import { test as base } from './db';
import { OpenFeature, InMemoryProvider } from '@openfeature/server-sdk';

type FlagFixtures = {
  flags: (overrides: Record<string, unknown>) => Promise<void>;
};

export const test = base.extend<FlagFixtures>({
  flags: async ({}, use) => {
    const setFlags = async (overrides: Record<string, unknown>) => {
      const provider = new InMemoryProvider(buildVariants(overrides));
      await OpenFeature.setProviderAndWait(provider);
    };
    await use(setFlags);
    // Teardown: restore an empty provider so the next test starts clean.
    await OpenFeature.setProviderAndWait(new InMemoryProvider({}));
  },
});

function buildVariants(overrides: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(overrides).map(([k, v]) => [k, {
      defaultVariant: 'configured',
      variants: { configured: v },
      disabled: false,
    }]),
  );
}
```

A test that needs a flag picks the value:

```typescript
test('shows new checkout when flag is on', async ({ page, flags }) => {
  await flags({ new_checkout: true });
  await page.goto('/checkout');
  await expect(page.getByTestId('new-checkout-banner')).toBeVisible();
});
```

For the matrix harness pattern (one shard per combo), see
[`feature-flag-test-harness`](../feature-flag-test-harness/SKILL.md).

## Step 6 - Compose into one `test` export

The pyramid: each layer extends the previous one. Tests import from
the top:

```typescript
// fixtures/index.ts
export { test, expect } from './flags';
```

```typescript
// tests/checkout.spec.ts
import { test, expect } from '../fixtures';

test('promo code applies when feature flag is on', async ({
  page, flags, cleanDb,
}) => {
  await flags({ promo_codes: true });
  // page is authenticated (from auth fixture, worker scope)
  // cleanDb already ran (auto, test scope)
  await page.goto('/checkout');
  // ...
});
```

The composition order is the dependency order: auth → db → flags.
A fixture can pull anything declared earlier in the chain via its
own destructured params.

## Step 7 - Teardown ordering

Per [pw-fix][pw-fix], teardown runs in **reverse order** of setup:
last-setup-first-teardown. Critical for fixtures that depend on
each other:

- DB fixture sets up before app fixture; app teardown runs first
  (clean shutdown), then DB teardown.
- Auth fixture sets up before page fixture; page closes first, then
  auth state is rolled back.

If a teardown depends on something a downstream fixture set up, the
dependency direction is wrong - invert the fixture composition.

## Step 8 - Box internal fixtures from the report

Helper fixtures that aren't user-meaningful clutter the test report.
Per [pw-fix][pw-fix], `{ box: true }` hides them:

```typescript
export const test = base.extend({
  _internalSetup: [async ({}, use) => {
    // ...setup nobody needs to see in the report
    await use();
  }, { box: true }],
});
```

## Output format

```markdown
## Playwright fixtures — `<suite>`

**Fixtures produced:** N
**File:** `tests/fixtures/index.ts`

| Fixture          | Scope   | Auto | Boxed | Setup cost | Teardown |
|------------------|---------|------|-------|------------|----------|
| `storageState`   | worker  | no   | no    | ~1.2s      | none     |
| `cleanDb`        | test    | yes  | yes   | ~0.4s      | none     |
| `flags`          | test    | no   | no    | ~5ms       | restore empty provider |
| `todoPage`       | test    | no   | no    | ~50ms      | `removeAll()` |

### Scope rationale

- `storageState`: worker-scope cuts ~600ms × N tests. Per-worker
  index avoids cross-worker auth conflicts.
- `cleanDb`: test-scope + auto: every test starts clean; reviewer
  doesn't have to remember to wire it.
- `flags`: test-scope: different tests want different combinations;
  teardown restores empty provider so a leaked override can't
  poison the next test.
- `todoPage`: test-scope: page object holds state.

### Recommended next step

Wire `playwright.config.ts` to use the `authenticated` project per
[pw-auth][pw-auth] for the auth-default suite, and a separate
`anonymous` project for tests that explicitly opt out of auth.
```

## Anti-patterns

| Anti-pattern                                                                | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Worker-scoped fixture for state that **changes** between tests              | Tests on the same worker pollute each other; intermittent failures.       | Move to test scope. Per [pw-fix][pw-fix]: test-scoped fixtures "are torn down immediately after". |
| Test-scoped fixture for **immutable** expensive state (e.g. logged-in user) | Per-test login = N × ~1s. CI time balloons.                              | Worker scope + `workerInfo.workerIndex` per [pw-fix][pw-fix]. |
| `beforeAll` for shared state in a parallel suite                             | `beforeAll` runs once per spec file, not once per worker; doesn't compose. | Worker-scoped fixture with the right `use()` boundary. |
| Teardown that depends on a downstream fixture's setup                        | Reverse-order teardown means the dependency is gone when teardown runs.   | Invert composition: dependent fixture extends the dependency. |
| Manual `await context.close()` inside a test                                  | Bypasses Playwright's cleanup; flake on the next test.                    | Let the page/context fixture handle close in its teardown. |
| Hard-coded port / DB name in fixtures                                         | Two parallel workers fight over the same resource.                        | Derive from `workerInfo.workerIndex` per [pw-fix][pw-fix]. |
| Storing `playwright/.auth/*.json` in git                                       | Per [pw-auth][pw-auth]: "these files contain sensitive cookies and headers". | `.gitignore` the auth dir; reauthenticate in CI per worker. |
| One mega-fixture that bundles auth+db+flags                                  | Tests can't opt out of pieces; one tweak breaks everyone.                  | Atomic fixtures composed via `extend` per Step 6. |

## Limitations

- **No mid-test scope changes.** A worker-scoped fixture can't be
  reset for one test without re-architecting; if mid-test reset is
  needed, the fixture should be test-scoped.
- **Session storage isn't auto-captured.** Per [pw-auth][pw-auth]:
  "Manually persist session data since Playwright doesn't
  automatically capture it" - for sessionStorage-based auth, write
  custom serialization in the fixture.
- **Teardown failures don't fail the test.** A throw inside the
  post-`use()` block produces a warning, not a failure. Wrap
  critical teardown in a runtime check that fails the next test if
  state is dirty.
- **Fixture timeout is per-fixture, not per-test.** Long auth
  fixtures need `{ timeout: 60_000 }`; the test's own timeout is
  separate.

## References

- [pw-fix][pw-fix] - `test.extend`, scope (test vs worker),
  `workerInfo.workerIndex`, automatic / boxed fixtures, default
  fixtures.
- [pw-auth][pw-auth] - `storageState` pattern, per-worker
  authentication via `parallelIndex`, role-based auth files,
  security note on `.gitignore`.
- [`db-snapshot-restore`](../../agents/db-snapshot-restore.md) - the
  shell script the `cleanDb` fixture wraps.
- [`feature-flag-test-harness`](../feature-flag-test-harness/SKILL.md) - the matrix-shard pattern that complements per-test `flags`
  fixture overrides.
- [`testcontainers`](../testcontainers/SKILL.md),
  [`docker-compose-test`](../docker-compose-test/SKILL.md) - the
  underlying stack the fixtures point at.
