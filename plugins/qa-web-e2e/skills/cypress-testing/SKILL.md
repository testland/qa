---
name: cypress-testing
description: "Authors Cypress E2E tests - `npm install cypress`, `cypress.config.ts` setup, `cy.*` command chains, automatic-waiting commands, time-travel debugger via Cypress GUI, custom commands for reusable patterns, Cypress Cloud for parallel/recording. Per Cypress''''s positioning: \"fast, consistent and reliable tests that are flake-free\" via in-browser execution architecture."
rating: 23
d6: 4
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
[`playwright-testing`](../playwright-testing/SKILL.md).

## Step 1 - Install

```bash
npm install --save-dev cypress
npx cypress open   # first run scaffolds the project
```

The interactive setup creates `cypress.config.ts` + `cypress/`
directory.

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
    cy.get('[data-testid="password"]').type('test-password');
    cy.get('[data-testid="signin-btn"]').click();
    cy.contains('Welcome').should('be.visible');
  });

  it('completes checkout end-to-end', () => {
    cy.visit('/products/BOOK-001');
    cy.contains('button', /add to cart/i).click();
    cy.get('[data-testid="cart-count"]').should('have.text', '1');

    cy.visit('/checkout');
    cy.get('[name="card"]').type('4242 4242 4242 4242');
    cy.contains('button', /place order/i).click();
    cy.contains('Order confirmed', { timeout: 10000 }).should('be.visible');
  });
});
```

Per [cy-overview][cy], assertions auto-wait - no `cy.wait(2000)`
needed.

## Step 4 - Use cypress-testing-library

For accessibility-first selectors (per the team's
[`e2e-selector-quality-critic`](../../../qa-test-review/agents/e2e-selector-quality-critic.md)
convention):

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
    cy.findByLabelText('Password').type(password);
    cy.findByRole('button', { name: /sign in/i }).click();
    cy.url().should('not.include', '/login');
  });
});

// Usage in tests:
beforeEach(() => {
  cy.login('user@example.com', 'pwd');
});
```

`cy.session(...)` caches the auth state across tests - reuse the
login result, avoid re-running the login flow.

## Step 6 - Run

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

## Step 7 - Time-travel debugger

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

## Step 8 - Cypress Cloud (paid; optional)

```bash
# Record run to Cypress Cloud
npx cypress run --record --key <CYPRESS_RECORD_KEY>

# Parallel
npx cypress run --record --parallel
```

Cloud provides:
- Parallel execution across N CI jobs.
- Recording (replay any test from anywhere).
- Per-test analytics.
- Flaky-test detection.

OSS alternative: [`currents-integration`](../../../qa-test-reporting/skills/currents-integration/SKILL.md)
covers similar analytics for both Cypress + Playwright.

## Step 9 - CI integration

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: cypress-io/github-action@v6
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
          browser: chrome
          record: true
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `cy.wait(2000)` between actions                                        | Defeats Cypress's auto-wait; flaky.                                       | Trust assertions; chain commands. |
| `cy.get('.button-class')` (CSS class)                                  | Brittle; defeats `findByRole` patterns.                                   | cypress-testing-library + `data-testid` (Steps 3-4). |
| Cross-test state via global variables                                  | Tests order-dependent.                                                    | `cy.session()` for auth; per-test fresh state. |
| Mixing Cypress + plain xUnit assertions                                | Confusing; two assertion styles.                                          | Cypress chains throughout. |
| Running Cypress against production                                     | Cypress can mutate state; pollutes prod data.                            | Local / staging only. |

## Limitations

- **Single-browser-process architecture.** Per [cy-overview][cy]:
  "avoids Selenium/WebDriver architecture" - but this also means
  no native multi-domain testing (workarounds exist).
- **Same-tab restriction.** Originally Cypress only tested
  same-tab; multi-tab support added later but with caveats.
- **No native mobile.** Mobile via emulation only; for native, see
  [`appium-testing`](../../../qa-mobile/skills/appium-testing/SKILL.md).
- **Cypress Cloud is paid.** OSS-budget teams use
  [`currents-integration`](../../../qa-test-reporting/skills/currents-integration/SKILL.md).

## References

- [cy][cy] - Cypress overview, key features (time-travel,
  automatic waiting, native browser access), three test types
  (E2E, component, accessibility).
- [`playwright-testing`](../playwright-testing/SKILL.md),
  [`selenium-testing`](../selenium-testing/SKILL.md),
  [`webdriverio-testing`](../webdriverio-testing/SKILL.md) - 
  alternative E2E frameworks.
- [`currents-integration`](../../../qa-test-reporting/skills/currents-integration/SKILL.md) - OSS analytics alternative to Cypress Cloud.
- [`e2e-selector-quality-critic`](../../../qa-test-review/agents/e2e-selector-quality-critic.md) - selector convention.
