# Fixture recipes - auth, page object, DB, feature flags

[pw-fix]: https://playwright.dev/docs/test-fixtures
[pw-auth]: https://playwright.dev/docs/auth

## Auth fixture (`storageState` per worker)

Per [pw-auth][pw-auth], the storageState pattern signs in once and
reuses cookies + localStorage across tests:

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

## Page Object fixture (test-scoped)

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

## DB fixture (per-test snapshot/restore)

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
    // No teardown - next test runs `restore` itself.
  }, { auto: true }],
});
```

Per [pw-fix][pw-fix], `{ auto: true }` makes a fixture run for every
test even if the test doesn't list it in its parameters - the right
choice for cross-cutting state like DB reset.

The shell script delegates to a database snapshot/restore in
restore mode.

## Feature-flag fixture (composes with feature-flag-test-harness)

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
`feature-flag-test-harness`.
