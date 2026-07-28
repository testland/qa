# Intent -> step mapping and framework variants

The intent mapping lives once per project and translates each named
user-language intent into framework-native code. Adding a new intent
or refactoring one is a single edit; every test authored later uses
the new shape.

## Full Playwright mapping (`e2e/intents/index.ts`)

```typescript
import { Page, expect } from '@playwright/test';

export const intents = {
  user_visits_landing_page: async (page: Page, ctx: any) => {
    await page.goto(ctx.baseUrl);
  },

  user_clicks_signup: async (page: Page) => {
    await page.getByRole('link', { name: 'Sign up' }).click();
  },

  user_fills_signup_form: async (page: Page, ctx: any, data: any) => {
    await page.getByLabel('Email').fill(data.email);
    await page.getByLabel('Password').fill(data.password);
    ctx.email = data.email;   // share state with later intents
    ctx.password = data.password;
  },

  user_submits_signup: async (page: Page) => {
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/welcome/);
  },

  user_confirms_email_via_inbox: async (page: Page, ctx: any) => {
    const link = await getEmailConfirmLink(ctx.email);   // reads from a Mailpit / Inbucket fixture
    await page.goto(link);
  },

  // ... etc
};
```

## Cypress

Same intent set, Cypress chained-command bodies: each intent maps to
`cy.get(...)` / `cy.findByRole(...)` calls sharing state through a
`ctx` object passed between commands.

## Karate (pure-API journeys)

```gherkin
Feature: New user onboards and completes first task

  Background:
    * url 'http://localhost:3000'

  Scenario: Onboarding flow
    Given path '/'
    When method GET
    Then status 200

    Given path '/signup'
    And request { email: '#{newuser@example.com}', password: 'TestPass123!' }
    When method POST
    Then status 201

    # ... more steps
```

(Per `karate-testing`.)
