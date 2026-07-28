# Reference directory layouts

Deep reference for the `framework-choice-advisor` SKILL.md, Step 4. After the team has chosen a stack, these are the canonical directory layouts the per-framework skill assumes. Layouts are conventions, not mandates - every project has reasons to deviate, but the canonical layout is the starting point a newcomer can read.

## Playwright + Jest (TypeScript) - the 2026 default for web E2E

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── login.fixture.ts
│   ├── cart/
│   │   ├── add-item.spec.ts
│   │   └── checkout.spec.ts
│   └── pages/                  # Page Objects (per Martin Fowler's pattern)
│       ├── LoginPage.ts
│       ├── CartPage.ts
│       └── CheckoutPage.ts
├── helpers/
│   ├── api-client.ts            # HTTP client for setup / teardown
│   ├── test-data.ts             # Fixtures and seeds
│   └── selectors.ts             # Shared accessibility-first locators
├── fixtures/                    # Static test data
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

Conventions:
- One `*.spec.ts` per feature flow; one Page Object per page or major component.
- Fixtures scoped to `describe` blocks; global fixtures are an anti-pattern (see `test-code-conventions` §6).
- Page Objects follow [Martin Fowler's pattern](https://martinfowler.com/bliki/PageObject.html): they wrap a page with an application-specific API and do not make assertions.

## Cypress + Mocha (TypeScript)

```
cypress/
├── e2e/
│   ├── auth/login.cy.ts
│   └── cart/checkout.cy.ts
├── support/
│   ├── commands.ts              # Custom Cypress commands
│   ├── pages/                   # Page Objects (Cypress idiom: command-based, not class-based)
│   └── e2e.ts
├── fixtures/
├── cypress.config.ts
└── package.json
```

Cypress idiom prefers custom commands over class-based POMs; the directory layout reflects that.

## Selenium / WebdriverIO (TypeScript or Java)

```
test/
├── specs/
│   ├── auth/login.spec.ts
│   └── cart/checkout.spec.ts
├── pageobjects/
│   ├── login.page.ts
│   └── cart.page.ts
├── helpers/
├── wdio.conf.ts
└── package.json
```

WDIO's runner ergonomics improve on raw Selenium; the layout is conventional.
