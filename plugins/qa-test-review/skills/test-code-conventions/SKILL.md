---
name: test-code-conventions
description: "Pure-reference catalog of test code conventions - AAA structure (Arrange / Act / Assert), per-test single-responsibility, descriptive naming patterns (`<system_under_test>_<scenario>_<expected>` vs nested describe), assertion specificity, fixture-coupling rules, and the magic-number / hard-coded-string anti-pattern. The agents in this plugin (test-code-critic, assertion-quality-reviewer, mocking-anti-pattern-detector, e2e-selector-quality-critic) load this as their shared rule book. Use as a team's onboarding reference for \"what makes a test code-reviewable\" and as the source-of-truth the critics' verdicts cite back to."
rating: 22
d6: 3
archetype: S2
---

# test-code-conventions

## Overview

This skill is a **pure reference** - no actions, no workflows. It
catalogs the test-code conventions that the rest of `qa-test-review`'s
critics enforce. When a critic flags an issue, it cites this
reference for the reviewer to learn the underlying rule.

## When to use

- A new team member is onboarding to the codebase and needs to
  understand "what we mean by a good test."
- A critic from this plugin (`test-code-critic`,
  `assertion-quality-reviewer`, `mocking-anti-pattern-detector`,
  `e2e-selector-quality-critic`) flagged an issue and the reviewer
  needs the underlying rule's rationale.
- The team is authoring its own per-team test conventions document
  and wants a starting point.

## §1 - AAA structure

The canonical test shape - **Arrange, Act, Assert** - splits each
test into three phases:

```typescript
test('addItem increases cart count', () => {
  // Arrange
  const cart = new Cart();

  // Act
  cart.addItem({ sku: 'BOOK-001', qty: 1 });

  // Assert
  expect(cart.itemCount).toBe(1);
});
```

The phases are visually separated (blank line; comment; or
`// arrange / act / assert` headers). The benefits:

- Reviewer can scan a 50-test file by reading only the Act lines - 
  knows what each test actually exercises.
- Failure debugging is faster: the failed assertion points to the
  specific Assert; the Arrange and Act are isolated.

**Each test has exactly one Act**. Two Acts = two tests. Splitting
on multiple Acts is the canonical refactor when a single test grows
too long.

## §2 - Single-responsibility per test

A test that asserts `cart.count === 1 AND cart.totalPrice === 10
AND cart.lastUpdated > now()` is three tests in disguise. When one
assertion fails, the test stops; the other two failures are
masked.

The rule: **one logical assertion per test**. "Logical" means
related to the same observable property - multiple `expect` calls
that all verify "the cart has one item" (count = 1, items.length = 1,
contents[0].sku = '...') are one logical assertion.

Splitting:

```typescript
// Bad — three logical assertions
test('addItem updates cart', () => {
  cart.addItem(...);
  expect(cart.itemCount).toBe(1);          // assertion 1
  expect(cart.totalPrice).toBe(10);        // assertion 2 (different property)
  expect(cart.lastUpdated).toBeGreaterThan(t0);  // assertion 3 (different property)
});

// Good — three tests, each assertion isolated
test('addItem increments count', () => { /* ... */ });
test('addItem updates totalPrice', () => { /* ... */ });
test('addItem updates lastUpdated', () => { /* ... */ });
```

## §3 - Naming patterns

Two well-established conventions:

### A - `<system_under_test>_<scenario>_<expected>` (Roy Osherove)

```typescript
test('addItem_validQty_incrementsCount', () => { /* ... */ });
test('addItem_zeroQty_throwsValidationError', () => { /* ... */ });
test('addItem_negativeQty_throwsValidationError', () => { /* ... */ });
```

The triple makes the test self-documenting; no need to read the body
to understand what's verified.

### B - Nested describe + it

```typescript
describe('Cart', () => {
  describe('addItem', () => {
    describe('with valid qty', () => {
      it('increments count', () => { /* ... */ });
    });
    describe('with zero qty', () => {
      it('throws ValidationError', () => { /* ... */ });
    });
  });
});
```

Both are valid; the team picks one and stays consistent. Mixing the
two in one suite is the smell.

**Avoid**: `test('it works')`, `test('test 1')`,
`test('addItem 1')`, `test('addItem 2')`. Generic names are zero
debugging help when the failure surfaces.

## §4 - Assertion specificity

Assertions should narrow the verification window to exactly what's
being asserted. Vague matchers hide regressions:

| Vague                                    | Specific                                    | Why specific is better |
|------------------------------------------|---------------------------------------------|------------------------|
| `expect(x).toBeTruthy()`                  | `expect(x).toEqual({ id: 1, name: 'foo' })` | "truthy" passes for `1`, `'a'`, `{}`, `[]` - many bug shapes pass. |
| `expect(arr).toBeDefined()`               | `expect(arr).toEqual(['BOOK-001'])`          | "defined" passes for `[]`, `null`-prototype, …             |
| `expect(err).toBeInstanceOf(Error)`       | `expect(err.code).toBe('VALIDATION_ERROR')` | Catches "right type, wrong reason" regressions.            |
| `expect(response.status).toBeGreaterThan(199)` | `expect(response.status).toBe(201)`     | 200, 204, 299 also pass - masks status-code regressions.   |
| `expect(html).toContain('error')`         | `expect(html).toMatch(/<div class="error">.*Invalid/)` | "error" matches "no errors" too. |

The general principle: the assertion should fail on **any change to
the SUT's behavior** that isn't intentional. If the assertion
passes for behaviors that shouldn't, it's too loose.

## §5 - Mocking

The full taxonomy per [mocks-stubs][ms]:

[ms]: https://martinfowler.com/articles/mocksArentStubs.html

> "Dummy objects: passed around but never actually used. Usually
> they are just used to fill parameter lists." ([mocks-stubs][ms])
>
> "Fake objects: actually have working implementations, but usually
> take some shortcut which makes them not suitable for production."
> ([mocks-stubs][ms])
>
> "Stubs: provide canned answers to calls made during the test,
> usually not responding at all to anything outside what's
> programmed in." ([mocks-stubs][ms])
>
> "Spies: stubs that also record some information based on how they
> were called." ([mocks-stubs][ms])
>
> "Mocks: objects pre-programmed with expectations which form a
> specification of the calls they are expected to receive."
> ([mocks-stubs][ms])

Per [mocks-stubs][ms]: "Only mocks insist upon behavior
verification. The other doubles can, and usually do, use state
verification."

Convention rules:

1. **Prefer state verification over behavior verification.** Assert
   on the SUT's resulting state, not on which methods were called
   on a collaborator. Behavior verification couples the test to the
   implementation; refactors break tests that should pass.
2. **Don't mock what you don't own.** Mocking third-party libraries
   makes tests pass against a fictional API; when the library
   updates, the mock drifts undetected. Prefer adapter patterns +
   contract tests against the real boundary.
3. **Prefer fakes over mocks for state-bearing collaborators.** A
   fake DB / fake clock / fake feature-flag service is reusable
   across tests; mocks are bespoke per test.

## §6 - Fixture coupling

Tests that share fixtures (parameters, builders, factory functions)
should be coupled at the smallest scope:

| Scope                  | When to use                                                        |
|------------------------|--------------------------------------------------------------------|
| Inline (per test)      | Default. The test owns the data; reviewer sees what's being tested. |
| `describe`-block       | Multiple tests verify the same scenario differently.                |
| File-level (`beforeEach`) | Shared setup with no per-test variation.                          |
| Cross-file factory     | Shared *shapes*, not shared *instances*. Use builders / factories. |

Anti-pattern: a giant `globalFixtures.ts` that every test imports.
Tests now break in unrelated ways when the global is touched; the
test no longer "owns" what it verifies.

## §7 - Magic numbers and strings

Test code is more tolerant of magic numbers than production code - 
the test's job is often to assert against specific values. But
**meaningful magic** matters:

```typescript
// Bad
expect(cart.totalPrice).toBe(43.21);   // why 43.21?

// Better
const PRICE_PER_BOOK = 10.99;
const QTY = 4;
const EXPECTED_TAX_RATE = 0.0825;
const EXPECTED_TOTAL = PRICE_PER_BOOK * QTY * (1 + EXPECTED_TAX_RATE);
expect(cart.totalPrice).toBeCloseTo(EXPECTED_TOTAL, 2);
```

The named constants double as documentation. The reviewer sees the
math; the assertion failure message becomes interpretable.

## §8 - E2E selectors

Per [pw-best-practices][pwb]: "Your DOM can easily change so having
your tests depend on your DOM structure can lead to failing tests."

[pwb]: https://playwright.dev/docs/best-practices

Per [tl-queries][tl] (Testing Library priority order):

[tl]: https://testing-library.com/docs/queries/about/

| Priority | Query                                       | When to use |
|----------|---------------------------------------------|-------------|
| 1        | `getByRole('button', { name: 'Submit' })`    | Default. Tests via the accessibility tree - same path as users. |
| 2        | `getByLabelText('Email')`                    | Form fields with associated `<label>`. |
| 3        | `getByPlaceholderText`, `getByText`, `getByDisplayValue` | When labels aren't available. |
| 4        | `getByAltText`, `getByTitle`                 | Images, tooltips. |
| 5        | `getByTestId('submit-button')`               | Last resort. Per [tl-queries][tl]: "The user cannot see (or hear) these." |

CSS class selectors (`.button-primary`) and XPath
(`//div[@class='cart']//button[1]`) are not on the priority list - 
per [pw-best-practices][pwb] they are explicitly identified as
brittle.

The same convention holds for Playwright (`page.getByRole(...)`),
Cypress (`cy.findByRole(...)` via cypress-testing-library), and
Selenium (when the test framework supports role-based queries via
extensions).

## §9 - Web-first assertions (E2E)

Per [pw-best-practices][pwb]: avoid "manual assertions without
waiting. Using `isVisible()` checks immediately without awaiting,
rather than web-first assertions like `toBeVisible()` that wait for
conditions to be met."

```typescript
// Bad — race condition
expect(page.locator('.toast').isVisible()).toBe(true);

// Good — auto-waits
await expect(page.locator('.toast')).toBeVisible();
```

The web-first form auto-waits for the assertion to become true
within the test's timeout, eliminating the wait-N-seconds-and-hope
pattern.

## §10 - Slow setup is a smell

A test that takes >1s in setup (creating fixtures, seeding DB,
warming caches) has a coupling problem. The remedies:

- Move fixture creation to a per-suite `beforeAll` if shared.
- Use [`db-snapshot-restore`](../../qa-test-environment/agents/db-snapshot-restore.md)
  template-DB pattern for DB tests instead of `db:reset`.
- Move the unit test to an integration layer if it really needs the
  full stack - don't run integration tests under the unit-test
  budget.

The whole-suite cost of slow setup compounds: 10 tests × 2s =
+20s per CI run × 50 PRs/day = 1000s/day burned.

## References

- [mocks-stubs][ms] - Martin Fowler on the test-double taxonomy:
  dummies, fakes, stubs, spies, mocks; state vs behavior
  verification; classical (Detroit) vs mockist (London) styles.
- [tl-queries][tl] - Testing Library query priority: role-based
  → label → placeholder/text → testId. The "as users find them"
  principle; testid is the last resort.
- [pw-best-practices][pwb] - Playwright best practices: user-facing
  locators, web-first assertions, "automated tests should verify
  that the application code works for the end users."
- [`test-code-critic`](../../agents/test-code-critic.md),
  [`assertion-quality-reviewer`](../../agents/assertion-quality-reviewer.md),
  [`mocking-anti-pattern-detector`](../../agents/mocking-anti-pattern-detector.md),
  [`e2e-selector-quality-critic`](../../agents/e2e-selector-quality-critic.md) - the four agents that consume this reference.
