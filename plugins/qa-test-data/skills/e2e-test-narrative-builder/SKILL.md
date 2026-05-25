---
name: e2e-test-narrative-builder
description: "Assembles a multi-step end-to-end user-journey test from a list of high-level user intents — translates each intent (\"user signs up\", \"user adds product to cart\", \"user completes checkout with promo code\") into the corresponding test-runner step (Playwright / Cypress / Selenium / Karate), wires shared state across steps via test fixtures, and emits the resulting test as a single Scenario in the project's E2E framework. Use when scaffolding an E2E test that exercises a complete user flow rather than a single page."
rating: 23
d6: 3
archetype: S3
---

# e2e-test-narrative-builder

## Overview

E2E tests model **user journeys** — sequences of actions across
multiple pages / components that collectively exercise a business
flow. Authoring them as a list of low-level Playwright /
Cypress / Selenium calls is verbose and easy to break on UI
refactors.

This skill takes a high-level intent list and assembles a single
narrative test:

```
1. user_signs_up_with_email
2. user_confirms_email
3. user_creates_workspace
4. user_invites_teammate
5. user_completes_first_task
```

→ One `.spec.ts` (or `.feature`) with the canonical sequence.

## When to use

- Scaffolding a new E2E test for a multi-step business flow.
- Migrating from one E2E framework to another (Playwright →
  Cypress, etc.) — write the intents once, regenerate.
- A PRD describes a user journey and the team wants the matching
  E2E test before implementation.
- Pairs with [`spec-to-suite-orchestrator`](../../../qa-shift-left/agents/spec-to-suite-orchestrator.md)
  in the shift-left chain — that orchestrator hands off intent
  lists to this skill.

## Step 1 — Capture the intent list

A typical user-journey test has 5-15 intents:

```yaml
test:
  name: New user onboards and completes first task
  fixtures: [seed_workspace, seed_admin_user]   # from seed-data-curator
  steps:
    - intent: user_visits_landing_page
      page: /
    - intent: user_clicks_signup
    - intent: user_fills_signup_form
      data:
        email: '{{ faker.email }}'
        password: '{{ faker.password }}'
    - intent: user_submits_signup
    - intent: user_confirms_email_via_inbox
    - intent: user_creates_workspace
      data:
        name: 'Test Workspace'
    - intent: user_invites_teammate
      data:
        teammate_email: 'teammate@example.com'
    - intent: user_creates_first_task
      data:
        title: 'Hello world'
    - intent: user_marks_task_complete
  assertions:
    - on_page: /workspace/{workspace_id}
    - selector_visible: '[data-testid="task-complete-celebration"]'
    - api_called: POST /api/tasks/complete
```

Intents are **named verbs in user-language**. They abstract over
"click the button with text 'Sign up'" — the matching helper
function (in step 2) knows how.

## Step 2 — Define the intent → step mapping

Once per project, a mapping file translates intents to framework-
native code:

```typescript
// e2e/intents/index.ts (Playwright example)
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
    const link = await getEmailConfirmLink(ctx.email);   // helper that reads from a Mailpit / Inbucket fixture
    await page.goto(link);
  },

  // ... etc
};
```

The mapping is **the project's** — it knows how the project's UI is
laid out. Adding a new intent or refactoring an existing one is one
edit; tests authored later automatically use the new shape.

## Step 3 — Generate the test

The skill emits the matching .spec / .feature file.

**Default: Playwright** — first-party TypeScript types, built-in
fixtures + parallelism, role/label-based selectors that survive UI
refactors. Use Cypress when the project already standardizes on it;
use Karate for pure-API journeys; use Selenium only for legacy
suites already invested in it.

### Playwright

```typescript
// e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';
import { intents } from './intents';

test('new user onboards and completes first task', async ({ page }) => {
  const ctx = { baseUrl: process.env.BASE_URL ?? 'http://localhost:3000' };

  await intents.user_visits_landing_page(page, ctx);
  await intents.user_clicks_signup(page, ctx);
  await intents.user_fills_signup_form(page, ctx, {
    email: 'newuser@example.com',
    password: 'TestPass123!',
  });
  await intents.user_submits_signup(page, ctx);
  await intents.user_confirms_email_via_inbox(page, ctx);
  await intents.user_creates_workspace(page, ctx, { name: 'Test Workspace' });
  await intents.user_invites_teammate(page, ctx, { teammate_email: 'teammate@example.com' });
  await intents.user_creates_first_task(page, ctx, { title: 'Hello world' });
  await intents.user_marks_task_complete(page, ctx);

  // Assertions
  await expect(page).toHaveURL(/\/workspace\/[a-z0-9-]+/);
  await expect(page.locator('[data-testid="task-complete-celebration"]')).toBeVisible();
});
```

### Cypress

Similar structure with Cypress's chained command syntax; the
intents map to `cy.get(...)` calls.

### Karate

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

(Per [`karate-testing`](../../../qa-api-testing/skills/karate-testing/SKILL.md).)

## Step 4 — Wire fixtures

Each intent may depend on fixtures generated by:

| Fixture source | Skill |
|----------------|-------|
| Seed data (workspaces, admin users) | [`seed-data-curator`](../seed-data-curator/SKILL.md). |
| Synthetic field values (emails, passwords) | [`faker-data`](../faker-data/SKILL.md) etc. |
| Mock external services (email, payment) | [`wiremock-stubs`](../wiremock-stubs/SKILL.md), [`msw-handlers`](../msw-handlers/SKILL.md), [`mountebank-imposters`](../mountebank-imposters/SKILL.md). |

The intent file declares `fixtures: [...]` and the generated test
imports them at the top.

## Output format

```markdown
## E2E Narrative Generated — `<test-name>`

**Framework:** Playwright | Cypress | Selenium | Karate
**Intents used:** N
**Test file:** `e2e/<slug>.spec.ts`
**Fixtures referenced:**
  - seed_workspace (from seed-data-curator)
  - mock_email_inbox (from wiremock-stubs)

**Output preview:**

```typescript
// (the generated test file)
```

### Validation

- All intents have matching entries in `e2e/intents/index.ts`.
- All referenced fixtures exist in the project.
- Test compiles (TypeScript / JS lint pass).
- (Optional) test runs once locally and passes against a seeded env.

### Open intents (require new helpers)

- `user_completes_payment_with_apple_pay` — not yet in the intent
  mapping. Add to `e2e/intents/index.ts` before this test will run.
```

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Inline Playwright calls instead of named intents              | Tests break on UI refactors; can't migrate frameworks easily.      | Always go through the intent mapping. |
| One mega-intent that does 5 things                             | Hard to compose with other tests; failure attribution unclear.     | One intent per user-observable action. |
| Intent names that include implementation details (`user_clicks_xpath`) | Couples the intent to a selector strategy.                  | Intent names are user-language: `user_signs_up`, not `user_clicks_signup_button`. |
| Sharing context via globals                                    | Cross-test pollution; flaky.                                       | Pass `ctx` through every intent; per-test scope. |
| Authoring 50-step narrative tests                              | Single-test failure cascades; hard to debug.                       | Split into smaller stories; reuse intents across multiple smaller tests. |

## Limitations

- **One framework per project.** The intent mapping is per-
  framework; sharing intents across Playwright + Cypress + Karate
  in the same repo means maintaining three mappings.
- **UI changes still break.** Robust selectors (data-testid, role)
  reduce churn but don't eliminate it; a UI overhaul still
  requires updating the intent mapping.
- **Doesn't replace specific assertion logic.** The narrative
  describes the journey; assertions per intent still need explicit
  authoring.

## References

- [`seed-data-curator`](../seed-data-curator/SKILL.md),
  [`faker-data`](../faker-data/SKILL.md),
  [`wiremock-stubs`](../wiremock-stubs/SKILL.md),
  [`msw-handlers`](../msw-handlers/SKILL.md),
  [`mountebank-imposters`](../mountebank-imposters/SKILL.md) —
  fixture sources.
- [`karate-testing`](../../../qa-api-testing/skills/karate-testing/SKILL.md)
  — Karate output format.
- [`spec-to-suite-orchestrator`](../../../qa-shift-left/agents/spec-to-suite-orchestrator.md)
  — upstream agent that hands off intent lists to this skill.
