---
name: testcafe-testing
description: "Authors TestCafe E2E tests — `npm install testcafe`, fixture/test syntax, `Selector` API for queries, automatic-waits, no WebDriver required (TestCafe injects scripts via a proxy), supports any browser including remote / cloud farms. Use when the team prefers a no-WebDriver architecture and one of TestCafe's specific features (e.g., role-based auth) matters."
rating: 22
d6: 3
archetype: S1
---

# testcafe-testing

## Overview

TestCafe (DevExpress) is an alternative E2E framework that
**doesn't use WebDriver**. Instead, it injects a JavaScript
proxy into the browser; tests run in Node and the proxy
synchronizes browser state.

This means:

- No WebDriver installation.
- Cross-browser without per-browser setup.
- No per-browser binary downloads.

The trade-off: the proxy approach has its own quirks; less
mainstream than Playwright / Cypress / Selenium.

## When to use

- The team has invested in TestCafe.
- A no-WebDriver architecture is preferred (e.g., shared CI
  environments where installing browser drivers is constrained).
- TestCafe's role-based auth feature is valuable (manage
  multi-user scenarios cleanly).

For new projects in 2026+: Playwright is the broader-supported
choice.

## Step 1 — Install

```bash
npm install --save-dev testcafe
```

No browser-driver setup; TestCafe uses installed browsers
directly.

## Step 2 — Author a test

```javascript
// tests/checkout.test.js
import { Selector } from 'testcafe';

fixture('Checkout flow').page('http://localhost:3000');

test('completes checkout', async (t) => {
  await t
    .typeText('[data-testid=email]', 'user@example.com')
    .typeText('[data-testid=password]', 'pwd')
    .click('button[type=submit]');

  await t.expect(Selector('h1').withText('Welcome').exists).ok();

  await t
    .navigateTo('/products/BOOK-001')
    .click('[data-testid=add-to-cart]');

  await t.expect(Selector('[data-testid=cart-count]').textContent).eql('1');
});
```

The fluent API (`t.X.Y.Z`) auto-waits.

## Step 3 — Selector API

```javascript
// Basic
const heading = Selector('h1');

// CSS
const button = Selector('button[type=submit]');

// By text
const submitButton = Selector('button').withText('Submit');

// By attribute
const cartCount = Selector('[data-testid=cart-count]');

// Chained
const linkInsideHeader = Selector('header').find('a').withText('Sign in');

// With state (visible, focused, etc.)
const visibleError = Selector('.error').filterVisible();
```

## Step 4 — Roles (multi-user auth)

TestCafe's distinguishing feature: **Roles** — encapsulated auth
state for switching between users in tests.

```javascript
import { Role } from 'testcafe';

const adminUser = Role('http://localhost:3000/login', async t => {
  await t
    .typeText('[data-testid=email]', 'admin@example.com')
    .typeText('[data-testid=password]', 'admin-pwd')
    .click('button[type=submit]');
});

const regularUser = Role('http://localhost:3000/login', async t => {
  await t
    .typeText('[data-testid=email]', 'user@example.com')
    .typeText('[data-testid=password]', 'user-pwd')
    .click('button[type=submit]');
});

test('admin sees admin panel', async t => {
  await t.useRole(adminUser).expect(Selector('a').withText('Admin').exists).ok();
});

test('regular user does not see admin panel', async t => {
  await t.useRole(regularUser).expect(Selector('a').withText('Admin').exists).notOk();
});
```

Roles cache the auth state — subsequent `useRole` calls don't
re-run the login.

## Step 5 — Run

```bash
# All tests, default browser (Chrome)
npx testcafe chrome tests/

# Multiple browsers
npx testcafe chrome,firefox tests/

# Headless
npx testcafe chrome:headless tests/

# Specific test
npx testcafe chrome tests/checkout.test.js
```

## Step 6 — Reporters

```bash
# JUnit XML (CI-friendly)
npx testcafe chrome:headless tests/ --reporter junit:reports/junit.xml

# Multiple reporters
npx testcafe chrome:headless tests/ --reporter spec,junit:reports/junit.xml
```

## Step 7 — Network mocking

```javascript
import { Selector, RequestMock } from 'testcafe';

const mock = RequestMock()
  .onRequestTo('https://api.example.com/orders/123')
  .respond({ orderId: 123, status: 'shipped' }, 200, {
    'access-control-allow-origin': '*',
  });

fixture('Order page').page('http://localhost:3000').requestHooks(mock);

test('shows shipped status', async (t) => {
  await t.expect(Selector('[data-testid=status]').textContent).eql('shipped');
});
```

## Step 8 — CI integration

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npx testcafe chrome:headless tests/ --reporter junit:reports/junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: testcafe-reports
          path: reports/
```

The JUnit XML feeds [`junit-xml-analysis`](../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Manual `await new Promise(r => setTimeout(r, 2000))`                   | Defeats auto-wait; flaky.                                                 | Trust TestCafe's automatic synchronization. |
| Inline credentials in tests                                            | Secrets in code.                                                          | Roles + env vars (Step 4). |
| Skipping `--reporter`                                                  | Default spec output not CI-parseable.                                    | `--reporter junit:reports/...` (Step 6). |
| Using TestCafe for unit-test-shaped scope                              | E2E framework overhead for unit tests.                                   | Use the unit framework (Jest, etc.) for unit tests. |

## Limitations

- **Smaller community than Playwright / Cypress.** Stack Overflow
  hit rate lower.
- **Proxy-based architecture has quirks.** Some sites that block
  iframe / proxy techniques don't work cleanly.
- **No native mobile support.** Mobile via emulation only.
- **Roles cache may stale.** Re-evaluate cache invalidation when
  auth changes.

## References

- TestCafe at `testcafe.io`.
- [`playwright-testing`](../playwright-testing/SKILL.md),
  [`cypress-testing`](../cypress-testing/SKILL.md),
  [`selenium-testing`](../selenium-testing/SKILL.md) — alternatives.
