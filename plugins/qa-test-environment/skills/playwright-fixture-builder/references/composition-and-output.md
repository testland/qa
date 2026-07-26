# Composition, teardown ordering, boxing, output format

[pw-fix]: https://playwright.dev/docs/test-fixtures
[pw-auth]: https://playwright.dev/docs/auth

## Compose into one `test` export

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

## Teardown ordering

Per [pw-fix][pw-fix], teardown runs in **reverse order** of setup:
last-setup-first-teardown. Critical for fixtures that depend on
each other:

- DB fixture sets up before app fixture; app teardown runs first
  (clean shutdown), then DB teardown.
- Auth fixture sets up before page fixture; page closes first, then
  auth state is rolled back.

If a teardown depends on something a downstream fixture set up, the
dependency direction is wrong - invert the fixture composition.

## Box internal fixtures from the report

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
## Playwright fixtures - `<suite>`

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
