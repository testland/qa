# E2E selectors and web-first assertions

Deep reference for the `test-code-conventions` SKILL.md (§8 and §9). Consult when reviewing end-to-end tests (Playwright / Cypress / Selenium / WebdriverIO) where locator fragility or synchronous assertions are the concern. The universal conventions (§1-§7, §10) stay in the SKILL; these two are E2E-specific.

## §8 - E2E selectors

Per [Playwright best practices][pwb]: "Your DOM can easily change so having your tests depend on your DOM structure can lead to failing tests."

[pwb]: https://playwright.dev/docs/best-practices

Per [Testing Library query priority][tl] (highest to lowest):

[tl]: https://testing-library.com/docs/queries/about/

| Priority | Query | When to use |
|---|---|---|
| 1 | `getByRole('button', { name: 'Submit' })` | Default. Tests via the accessibility tree - the same path users take. |
| 2 | `getByLabelText('Email')` | Form fields with an associated `<label>`. |
| 3 | `getByPlaceholderText`, `getByText`, `getByDisplayValue` | When labels aren't available. |
| 4 | `getByAltText`, `getByTitle` | Images, tooltips. |
| 5 | `getByTestId('submit-button')` | Last resort. Per Testing Library: "The user cannot see (or hear) these." |

CSS class selectors (`.button-primary`) and XPath (`//div[@class='cart']//button[1]`) are not on the priority list - per Playwright best practices they are explicitly identified as brittle.

The same convention holds across runners: Playwright (`page.getByRole(...)`), Cypress (`cy.findByRole(...)` via cypress-testing-library), and Selenium (when the test framework supports role-based queries via extensions).

## §9 - Web-first assertions (E2E)

Per Playwright best practices: avoid "manual assertions without waiting. Using `isVisible()` checks immediately without awaiting, rather than web-first assertions like `toBeVisible()` that wait for conditions to be met."

```typescript
// Bad - race condition
expect(page.locator('.toast').isVisible()).toBe(true);

// Good - auto-waits
await expect(page.locator('.toast')).toBeVisible();
```

The web-first form auto-waits for the assertion to become true within the test's timeout, eliminating the wait-N-seconds-and-hope pattern. A synchronous `.isVisible()` snapshot races the render and flakes on any latency the test author did not anticipate.

## Worked example - reviewing one E2E test file

```typescript
// Before - brittle selector, synchronous assertion
await page.locator('.cart-panel .btn-primary').click();
expect(page.locator('.toast-success').isVisible()).toBe(true);

// After - accessibility-first selector, web-first assertion
await page.getByRole('button', { name: 'Checkout' }).click();
await expect(page.getByRole('status')).toHaveText('Order confirmed');
```

The rewrite resolves the button through the accessibility tree (survives DOM refactors) and awaits the outcome (no render race).

## References

- Playwright best practices - user-facing locators, web-first assertions, "automated tests should verify that the application code works for the end users": https://playwright.dev/docs/best-practices
- Testing Library query priority - role-based → label → placeholder / text → testId; testid is the documented last resort ("The user cannot see (or hear) these"): https://testing-library.com/docs/queries/about/
