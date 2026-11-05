---
name: cypress-testing
description: "Use whenever a project writes, fixes or upgrades Cypress E2E tests: cypress.config.ts, replacing cy.wait sleeps with assertions, cy.intercept network stubs, fixtures and cy.task, cy.clock, cy.origin logins, cy.session commands, the Cypress 16 upgrade, and Cloud parallel runs."
---

# cypress-testing

## Overview

Per [cy-overview][cy]:

[cy]: https://docs.cypress.io/guides/overview/why-cypress

> "Cypress is described as 'a next generation front end testing
> tool built for the modern web.'"

Differentiators ([cy-overview][cy]):

> - **Time Travel Debugging:** "Cypress takes snapshots as your
>   tests run. Hover over commands in the Command Log to see
>   exactly what happened at each step."
> - **Automatic Waiting:** "Never add waits or sleeps to your
>   tests. Cypress automatically waits for commands and assertions
>   before moving on."
> - **Reliability:** "The testing approach avoids
>   Selenium/WebDriver architecture, resulting in fast, consistent
>   and reliable tests that are flake-free."

## When to use

- The team has invested in Cypress; a migration is unlikely.
- The test author values the time-travel debugger / GUI
  experience.
- Component testing is needed (Cypress supports React / Angular /
  Vue / Svelte component testing).
- Single-browser focus is acceptable (Chromium-first; Firefox /
  Edge supported but secondary).

For cross-browser including WebKit, see
`playwright-testing`.

## How to use

1. Install Cypress and scaffold the project (`npm install --save-dev cypress`, `npx cypress open`).
2. Set `baseUrl`, `specPattern`, and `retries` in `cypress.config.ts`.
3. Add `@testing-library/cypress` so specs select by role / label, not by CSS class.
4. Author each flow as a `describe` / `it` block; lean on auto-waiting assertions instead of `cy.wait(ms)`.
5. Extract repeated auth into a `cy.session`-backed custom command called from `beforeEach`.
6. Stub or wait on network calls with `cy.intercept` + `cy.wait('@alias')` instead of fixed sleeps.
7. Seed data with `cy.task`, load canned responses with fixtures, freeze time with `cy.clock`.
8. Drive a login on another origin (SSO, auth subdomain) inside `cy.origin`.
9. Run headless in CI (`npx cypress run`); debug failures by replaying commands in the time-travel GUI.
10. For scale, record + parallelize via Cypress Cloud and upload screenshot artifacts on failure (see [references/ci-and-cloud.md](references/ci-and-cloud.md)).

## Step 1 - Install

```bash
npm install --save-dev cypress
npx cypress open   # first run scaffolds the project
```

The interactive setup creates `cypress.config.ts` + `cypress/`
directory.

Per the [changelog][cychangelog], Cypress 16.0.0 (Sep 1, 2026) "requires
Node.js 22.x, 24.x, or >=26.x". Upgrading a 15.x suite? See
"Upgrading to Cypress 16" below before bumping the version.

[cychangelog]: https://docs.cypress.io/app/references/changelog

## Step 2 - Configure

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    video: true,
    screenshotOnRunFailure: true,
    retries: { runMode: 2, openMode: 0 },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
```

## Step 3 - Author E2E tests

```typescript
// cypress/e2e/checkout.cy.ts
describe('Checkout flow', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.env(['USER_PASSWORD']).then(({ USER_PASSWORD }) => {
      cy.get('[data-testid="password"]').type(USER_PASSWORD, { log: false });
    });
    cy.get('[data-testid="signin-btn"]').click();
    cy.contains('Welcome').should('be.visible');
  });

  it('completes checkout end-to-end', () => {
    cy.visit('/products/BOOK-001');
    cy.contains('button', /add to cart/i).click();
    cy.get('[data-testid="cart-count"]').should('have.text', '1');

    cy.visit('/checkout');
    cy.env(['TEST_CARD_NUMBER']).then(({ TEST_CARD_NUMBER }) => {
      cy.get('[name="card"]').type(TEST_CARD_NUMBER, { log: false });
    });
    cy.contains('button', /place order/i).click();
    cy.contains('Order confirmed', { timeout: 10000 }).should('be.visible');
  });
});
```

Per [cy-overview][cy], assertions auto-wait - no `cy.wait(2000)`
needed.

Never type a password or card number as a literal. Per [cy-env][cyenv],
`cy.env()` (Cypress 15.10+) yields the requested keys, and per
[cy-env-guide][cyenvguide] Cypress strips the `CYPRESS_` prefix, so CI
sets `CYPRESS_USER_PASSWORD` from its secret store. `{ log: false }`
keeps the value out of the Command Log.

[cyenv]: https://docs.cypress.io/api/commands/env
[cyenvguide]: https://docs.cypress.io/app/guides/environment-variables

## Step 4 - Use cypress-testing-library

For accessibility-first selectors:

```bash
npm install --save-dev @testing-library/cypress
```

```typescript
// cypress/support/commands.ts
import '@testing-library/cypress/add-commands';

// Now in tests:
cy.findByRole('button', { name: /sign in/i }).click();
cy.findByLabelText('Email').type('user@example.com');
```

`findByRole` (from cypress-testing-library) is the Cypress
equivalent of Playwright's `getByRole` - preferred for
accessibility-aware testing.

## Step 5 - Custom commands

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email, password) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.findByLabelText('Email').type(email);
    cy.findByLabelText('Password').type(password, { log: false });
    cy.findByRole('button', { name: /sign in/i }).click();
    cy.url().should('not.include', '/login');
  });
});

// Usage in tests:
beforeEach(() => {
  cy.env(['USER_PASSWORD']).then(({ USER_PASSWORD }) => {
    cy.login('user@example.com', USER_PASSWORD);
  });
});
```

`cy.session(...)` caches the auth state across tests - reuse the
login result, avoid re-running the login flow.

## Step 6 - Stub and wait on the network with cy.intercept

Per [cy-intercept][cyint], `cy.intercept` will "Spy and stub network
requests and responses." Aliasing a route and waiting on it replaces
every fixed `cy.wait(ms)`:

```typescript
// Spy: let the real request through, but wait for it and assert on it
cy.intercept('POST', '/api/orders').as('createOrder');
cy.contains('button', /place order/i).click();
cy.wait('@createOrder').its('response.statusCode').should('eq', 201);

// Stub: answer from a fixture file (cypress/fixtures/products.json)
cy.intercept('GET', '/api/products*', { fixture: 'products.json' }).as('products');

// Stub an error to test the failure UI
cy.intercept('GET', '/api/cart', { statusCode: 500, body: {} }).as('cartDown');
cy.visit('/cart');
cy.wait('@cartDown');
cy.contains('Something went wrong').should('be.visible');
```

Per [cy-intercept][cyint], `cy.wait('@alias')` yields the request and
response, so `.its('request.body')` and `.its('response.statusCode')`
assert on the exact call the UI made. Register the intercept **before**
the action that fires the request, or the request is missed.

[cyint]: https://docs.cypress.io/api/commands/intercept

## Step 7 - Fixtures, Node tasks and a frozen clock

**Fixtures.** Per [cy-fixture][cyfix], `cy.fixture` loads "a fixed set
of data located in a file" from `cypress/fixtures` by default. Pass it
straight to an intercept with `{ fixture: 'users' }`, or read it for
form input:

```typescript
cy.fixture('users').then((users) => {
  cy.findByLabelText('Email').type(users[0].email);
});
```

**Node tasks.** Per [cy-task][cytask], "cy.task() runs code in Node.js
from your test" - seeding a database, reading files, calling a CLI.
Handlers live in `setupNodeEvents`, and per the same page a handler
must return a value or `null`; returning `undefined` fails the command:

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';
import { seedDefaults } from './scripts/db';

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      on('task', {
        async 'db:seed'() {
          await seedDefaults();
          return null;
        },
      });
    },
  },
});

// In a spec
beforeEach(() => {
  cy.task('db:seed');
});
```

**Clock.** Per [cy-clock][cyclock], `cy.clock` "overrides native global
functions related to time allowing them to be controlled synchronously
via cy.tick()". Freeze the date before `cy.visit`, then move time:

```typescript
cy.clock(new Date(2026, 0, 31)); // month is 0-indexed
cy.visit('/billing');
cy.contains('Renews on February 1, 2026').should('be.visible');

cy.tick(30 * 60 * 1000); // fire the 30-minute idle timer
cy.contains('Session expired').should('be.visible');
```

[cyfix]: https://docs.cypress.io/api/commands/fixture
[cytask]: https://docs.cypress.io/api/commands/task
[cyclock]: https://docs.cypress.io/api/commands/clock

## Step 8 - Log in through another origin with cy.origin

Per [cy-origin][cyorigin], `cy.origin` "runs Cypress commands on a page
at a different origin than the one your test is running in" - an SSO
page or an auth subdomain. Values cross into the callback only through
the `args` option, and per the same page `cy.session()` wraps the whole
sign-in flow; called inside the `cy.origin` callback it throws:

```typescript
Cypress.Commands.add('loginSso', (username: string, password: string) => {
  cy.session(['sso', username], () => {
    cy.visit('/');
    cy.contains('a', 'Log in').click();
    cy.origin(
      'https://auth.example.com',
      { args: { username, password } },
      ({ username, password }) => {
        cy.get('#username').type(username);
        cy.get('#password').type(password, { log: false });
        cy.contains('button', 'Sign in').click();
      },
    );
    cy.url().should('include', '/dashboard');
  });
});
```

Per the [changelog][cychangelog] (16.1.1), subdomains count as different
origins by default, so `app.example.com` to `auth.example.com` also needs
`cy.origin`.

[cyorigin]: https://docs.cypress.io/api/commands/origin

## Step 9 - Run

```bash
# Open the GUI (interactive; great for development)
npx cypress open

# Headless (CI)
npx cypress run

# Single spec
npx cypress run --spec "cypress/e2e/checkout.cy.ts"

# Specific browser
npx cypress run --browser firefox
npx cypress run --browser chrome
```

## Step 10 - Time-travel debugger

Per [cy-overview][cy]: "Hover over commands in the Command Log to
see exactly what happened at each step."

In `cypress open` mode:
1. Run a test.
2. Hover over commands in the left-side log.
3. See the DOM snapshot for each step in the main browser
   pane.
4. Click a command → freeze the state for inspection.

This is Cypress's killer feature - debugging by visually replaying
the test.

## Step 11 - Cypress Cloud + CI

Recording and parallel runs go through Cypress Cloud (paid; OSS
alternative `currents-integration` in the qa-test-reporting plugin),
and the GitHub Actions job wires `cypress-io/github-action` +
screenshot artifacts on failure. Commands and the full workflow YAML:
[references/ci-and-cloud.md](references/ci-and-cloud.md).

## Upgrading to Cypress 16

Breaking changes in 16.0.0 that hit most suites, per the
[changelog][cychangelog]:

| Change in 16.0.0 | What to do |
|---|---|
| Node.js 20 and 25 support removed | Run on Node.js 22, 24 or 26+ locally and in CI. |
| `Cypress.env()` removed | Sensitive values: `cy.env()` (Step 3). Non-sensitive values read in the browser: `Cypress.expose()`. The `env` key in per-test config overrides becomes `expose`. |
| `cy.exec()` and `execTimeout` removed | Move shell calls into a `cy.task()` handler (Step 7) and use `taskTimeout`. |
| Chrome, Chromium and Edge intercept on the native browser network | `cy.intercept` no longer reports `req.httpVersion`, and intercepted responses have no compression headers; drop assertions on either. The deprecated `forceHttp1` option keeps the old path while migrating. |
| `cy.type()` default `keystrokeDelay` changed from 10 to 0 | Tests that relied on slow typing to let a debounce fire should assert on the result instead. |
| `viewportWidth`, `viewportHeight`, `blockHosts` can no longer be set via `Cypress.config()` mid-test | Set them in the config file or with `cy.viewport()`. |
| Component testing minimums: Angular 21, Vite 8; Next.js 14 dropped | Upgrade the framework before Cypress. |

## Worked example

A team has a hand-written `checkout.cy.ts` that logs in from scratch
in every test and sleeps `cy.wait(3000)` before asserting the cart
count. It flakes about 1 run in 5 on CI.

1. The login block moves into a `login` custom command wrapped in
   `cy.session(...)`, called from `beforeEach` with the password read
   via `cy.env()` instead of the old literal - the auth flow now runs
   once and is cached.
2. `cy.wait(3000)` is deleted; the check becomes
   `cy.get('[data-testid="cart-count"]').should('have.text', '1')`,
   which auto-retries until the count settles.
3. CSS-class selectors like `cy.get('.signin-btn')` are replaced with
   `cy.findByRole('button', { name: /sign in/i })` via
   cypress-testing-library.
4. `npx cypress run --spec cypress/e2e/checkout.cy.ts` is green 20/20
   locally; the GitHub Actions job records the run to Cypress Cloud.

Result: the flow runs faster (login cached, no fixed sleep) and the
flake disappears because every wait is now assertion-driven.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `cy.wait(2000)` between actions                                        | Defeats Cypress's auto-wait; flaky.                                       | Trust assertions; chain commands. |
| Waiting on a fixed time for an API call                                | Too short on slow CI, wasted time on fast runs.                           | `cy.intercept(...).as('x')` then `cy.wait('@x')` (Step 6). |
| Registering `cy.intercept` after the click that sends the request       | The request fires before the route exists and is never matched.          | Intercept first, then act (Step 6). |
| Seeding data through the UI in every test                              | Slow, and a UI bug breaks unrelated tests.                                | `cy.task('db:seed')` (Step 7). |
| `cy.get('.button-class')` (CSS class)                                  | Brittle; defeats `findByRole` patterns.                                   | cypress-testing-library + `data-testid` (Steps 3-4). |
| Cross-test state via global variables                                  | Tests order-dependent.                                                    | `cy.session()` for auth; per-test fresh state. |
| Mixing Cypress + plain xUnit assertions                                | Confusing; two assertion styles.                                          | Cypress chains throughout. |
| Running Cypress against production                                     | Cypress can mutate state; pollutes prod data.                            | Local / staging only. |

## Limitations

- **Single-browser-process architecture.** Per [cy-overview][cy]:
  "avoids Selenium/WebDriver architecture". A test that crosses origins
  must wrap the foreign-origin commands in `cy.origin` (Step 8), and
  values only cross through its `args`.
- **Same-tab restriction.** Originally Cypress only tested
  same-tab; multi-tab support added later but with caveats.
- **No native mobile.** Mobile via emulation only; for native, see
  `appium-testing` (in the qa-mobile plugin).
- **Cypress Cloud is paid.** OSS-budget teams use
  `currents-integration`.

## References

- [cy][cy] - Cypress overview, key features (time-travel,
  automatic waiting, native browser access), three test types
  (E2E, component, accessibility).
- [cyenv][cyenv] - `cy.env()` command: reads env keys, added in 15.10.0.
- [cyenvguide][cyenvguide] - environment variables and secrets guide:
  `CYPRESS_` prefix stripping.
- [cyint][cyint] - `cy.intercept`: spy and stub, aliases, waiting and
  asserting on request and response.
- [cyfix][cyfix] - `cy.fixture`: `cypress/fixtures` default folder.
- [cytask][cytask] - `cy.task`: Node handlers in `setupNodeEvents`,
  return a value or `null`.
- [cyclock][cyclock] - `cy.clock` and `cy.tick`.
- [cyorigin][cyorigin] - `cy.origin`: `args` option, `cy.session`
  placement.
- [cychangelog][cychangelog] - Cypress changelog: 16.0.0 breaking
  changes, Node.js support, 16.1.1 subdomain origins.
- `playwright-testing`,
  `selenium-testing`,
  `webdriverio-testing` - 
  alternative E2E frameworks.
- `currents-integration` - OSS analytics alternative to Cypress Cloud.
