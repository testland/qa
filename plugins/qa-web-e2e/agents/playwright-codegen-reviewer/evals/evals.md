---
component: playwright-codegen-reviewer
type: agent
---

# playwright-codegen-reviewer - evals

Companion eval cases for [`playwright-codegen-reviewer`](../../playwright-codegen-reviewer.md).
Three cases cover happy path / branch / adversarial: a raw codegen
recording with 8 steps refactored into LoginPage + ProductPage Page
Objects plus AAA test, a shorter codegen recording where Page Object
extraction is borderline and the test gets a real name + final
assertion (still per the refuse-to-proceed rules), and an
already-refactored Page Object file that triggers the
refuse-to-proceed rule "leave the test name as 'test'" /
out-of-scope (the input is not raw codegen output). Re-run by pasting
the **Input** block as the first user message and checking the agent's
output against the **Pass condition**.

## Eval 1 - happy path - 8-step recording refactored into 2 Page Objects + AAA

**Input:**

```
Here is raw Playwright codegen output (produced by
`npx playwright codegen http://localhost:3000/login`). Please refactor
to idiomatic Page Object code per the team's test-code-conventions.
There are no existing Page Objects in the tests/page-objects/ directory
yet.

// tests/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.locator('input[type="email"]').click();
  await page.locator('input[type="email"]').fill('user@example.com');
  await page.locator('input[type="password"]').click();
  await page.locator('input[type="password"]').fill('test-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('link', { name: 'Shop' }).click();
  await page.getByRole('link', { name: 'BOOK-001' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 identifies the recorded flow (login + browse +
add-to-cart). Step 2 refactors `input[type="email"]` / `input[type="password"]`
into `getByLabel('Email')` / `getByLabel('Password')`. Step 3 extracts
`LoginPage` and `ProductPage` Page Object classes (the recording is 8
steps - above the refuse-rule threshold of >5 steps). Step 4 renames
`'test'` to an intent-describing name (per the refuse-rule "Leave the
test name as 'test'" - the agent never leaves it) and restructures
into AAA with `// Arrange` / `// Act` / `// Assert` comments. Step 4
adds a final assertion (per the refuse-rule "Skip the final assertion
when the codegen omitted one" - the agent always adds one), e.g.,
`await expect(page.getByTestId('cart-count')).toHaveText('1')`. Step 5
emits the file-list summary naming `page-objects/LoginPage.ts`,
`page-objects/ProductPage.ts`, and the refactored test file.

**Pass condition:** Output contains the literal strings `LoginPage` AND
`ProductPage` AND `getByLabel('Email')` AND at least one of `Arrange` /
`AAA` (case-insensitive). Output does NOT leave the test name as
`test('test'` and does NOT skip a final `expect(...)` assertion (the
refactored test contains at least one `expect(` call).

## Eval 2 - branch - short recording with form-field refactor + named test

**Input:**

```
Here is raw Playwright codegen output (produced by
`npx playwright codegen http://localhost:3000/contact`). Refactor per
the team's test-code-conventions. The tests/page-objects/ directory
contains one existing class: `ContactPage` with a `goto()` method only.

// tests/contact-submit.spec.ts
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/contact');
  await page.locator('#name').click();
  await page.locator('#name').fill('Ada Lovelace');
  await page.locator('textarea[name="message"]').click();
  await page.locator('textarea[name="message"]').fill('Hello world');
  await page.locator('.submit-btn').click();
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 refactors `#name` (id is auto-named, not user-visible)
into `getByLabel('Name')`, `textarea[name="message"]` into
`getByLabel('Message')`, and `.submit-btn` (CSS class) into
`getByRole('button', { name: 'Send' })` or similar. Step 3 extends
the existing `ContactPage` with a `submit(name, message)` method
(the recording is 6 steps - above the 5-step threshold - so Page
Object extraction is required per the refuse rule). Step 4 names the
test (e.g., `'visitor can submit a contact-form message'`) and adds
a final assertion (per the refuse rule - could be e.g.,
`expect(page.getByRole('status')).toHaveText('Thanks for your message')`).
Step 5 reports the refactor summary.

**Pass condition:** Output renames the test (does NOT leave
`test('test'`) AND contains at least one of `getByLabel('Name')` /
`getByLabel('Message')` (an accessibility-first refactor) AND contains
at least one `expect(` call (the added final assertion). Output extends
`ContactPage` rather than creating a duplicate Page Object.

## Eval 3 - adversarial - refuse on already-refactored input (not raw codegen)

**Input:**

```
Refactor this Playwright file per the team's test-code-conventions.

// tests/checkout.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { ProductPage } from './page-objects/ProductPage';

test('logged-in user can add an item to cart', async ({ page }) => {
  // Arrange — sign in
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.signIn('user@example.com', 'test-password');

  // Act — add to cart
  const productPage = new ProductPage(page);
  await productPage.goto('BOOK-001');
  await productPage.addToCart();

  // Assert
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});
```

**Target models:** sonnet (2026-05-25)

**Expected:** This input is the agent's own Step 4 worked-example
output - already-refactored Page Object code, not raw codegen output.
The test name is intent-describing (not `'test'`), Page Objects are
already extracted (`LoginPage`, `ProductPage`), the body is structured
in AAA with `// Arrange` / `// Act` / `// Assert` comments, and a
final `expect(...)` assertion is present. Step 1 (which expects a
`.spec.ts` file produced by `npx playwright codegen`) finds no
codegen markers - no inline CSS selectors like `locator('input[type=...]')`,
no `test('test', ...)` placeholder name, no missing-assertion gap.
The agent refuses to invent unnecessary refactors. It emits an
out-of-scope / nothing-to-refactor message and does NOT create new
`LoginPage` or `ProductPage` files (Write / Edit) or rename the
already-meaningful test name.

**Pass condition:** Output contains one of `already refactored` /
`already a page object` / `not raw codegen` / `nothing to refactor` /
`out of scope` / `no changes` (case-insensitive) AND does NOT emit a
"### Files emitted" section listing new `LoginPage.ts` / `ProductPage.ts`
files (no creation of duplicates). The agent must not invent refactors
on already-clean input - that is the entire adversarial point of the
eval.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (the codegen
  output that `npx playwright codegen` would otherwise produce, plus
  the already-refactored sample). No external fixtures, no need to
  clone a sample repo.
- Pass conditions are literal-substring checks; a reviewer can grep
  the agent's transcript for each substring. Note that this agent's
  tool surface includes `Write` / `Edit`, so eval re-runs may create
  page-object files - use a scratch directory or revert after each
  run.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
