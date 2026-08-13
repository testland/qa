---
name: test-code-conventions
description: "Pure-reference catalog of test-code conventions: AAA structure (Arrange / Act / Assert), per-test single-responsibility, descriptive naming (`{sut}_{scenario}_{expected}`), assertion specificity, mocking rationale (state vs behavior, fake vs mock), fixture-coupling rules, and the magic-number / hard-coded-string anti-patterns; the E2E selector-priority and web-first-assertion conventions live in references/. Use as the shared rule book a test-code review cites back to, or as onboarding for what makes a test code-reviewable; to score a test's quality on weighted axes use test-design-scorecard, and for setup/teardown isolation specifically use test-isolation-patterns."
---

# test-code-conventions

## Overview

This skill is a **pure reference** - no actions, no workflows. It
catalogs the test-code conventions a test-code review enforces.
When a review flags an issue, this reference gives the reviewer
the underlying rule.

## When to use

- A new team member is onboarding to the codebase and needs to
  understand "what we mean by a good test."
- A review flagged an issue and the reviewer
  needs the underlying rule's rationale.
- The team is authoring its own per-team test conventions document
  and wants a starting point.

## How to use

1. **Scope to test files.** Apply these conventions to `*.spec.*` /
   `*.test.*` / `tests/**` only; production code is out of scope.
2. **Read the Act lines first** (§1). One scan of the single Act per test
   tells you what each test exercises before you read the body.
3. **Check one logical assertion target** (§2) and a self-documenting
   name (§3) - hide the body and see whether the name still explains it.
4. **Judge the assertions and doubles** (§4 assertion specificity,
   §5 mocking) - loose matchers and behaviour-verification are the common misses.
5. **Trace fixture scope and magic literals** (§6, §7): the smallest scope
   that holds, and named values across the cause-effect chain.
6. **Flag slow setup** (§10); for E2E tests, apply the selector-priority
   and web-first rules in §8 / §9.
7. **Cite the section when flagging.** Name the rule (`§4`) and spend the
   words on the specific edit, not on restating the rule.

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
// Bad - three logical assertions
test('addItem updates cart', () => {
  cart.addItem(...);
  expect(cart.itemCount).toBe(1);          // assertion 1
  expect(cart.totalPrice).toBe(10);        // assertion 2 (different property)
  expect(cart.lastUpdated).toBeGreaterThan(t0);  // assertion 3 (different property)
});

// Good - three tests, each assertion isolated
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
// Bad - unexplained value
expect(cart.totalPrice).toBe(43.21);   // why 43.21?

// Also bad - expectation recomputes the formula under test, so it agrees
// with the implementation even when the implementation is wrong
const EXPECTED_TOTAL = PRICE_PER_BOOK * QTY * (1 + EXPECTED_TAX_RATE);
expect(cart.totalPrice).toBeCloseTo(EXPECTED_TOTAL, 2);

// Better - inputs named, expected value stated independently
const PRICE_PER_BOOK = 10.99;
const QTY = 4;
const TAX_RATE = 0.0825;
expect(cart.totalPrice).toBeCloseTo(47.59, 2);   // 4 x 10.99, +8.25% tax
```

Name the **inputs**; never derive the **expected value** from the
expression under test. The named inputs document where the number came
from, and the literal expectation is what makes the assertion
independent of the code it is checking.

## §8 - E2E selectors

Prefer user-facing, accessibility-first locators over DOM-structure
selectors. Per [tl-queries][tl] the query priority is `getByRole` →
`getByLabelText` → text / placeholder → `getByTestId` (last resort), and
per [pw-best-practices][pwb] CSS-class and XPath selectors are brittle
because the DOM changes freely. The full priority table, the per-framework
mappings (Playwright / Cypress / Selenium), and the CSS/XPath rationale are
in [references/e2e-selector-and-assertion-conventions.md](references/e2e-selector-and-assertion-conventions.md).

## §9 - Web-first assertions (E2E)

Prefer auto-waiting web-first assertions
(`await expect(locator).toBeVisible()`) over synchronous `.isVisible()`
checks that race the render, per [pw-best-practices][pwb]. The before /
after example is in [references/e2e-selector-and-assertion-conventions.md](references/e2e-selector-and-assertion-conventions.md).

## §10 - Slow setup is a smell

A test that takes >1s in setup (creating fixtures, seeding DB,
warming caches) has a coupling problem. The remedies:

- Move fixture creation to a per-suite `beforeAll` if shared.
- Use a template-DB snapshot/restore pattern for DB tests instead of
  `db:reset`.
- Move the unit test to an integration layer if it really needs the
  full stack - don't run integration tests under the unit-test
  budget.

The whole-suite cost of slow setup compounds: 10 tests × 2s =
+20s per CI run × 50 PRs/day = 1000s/day burned.

## Worked example - reviewing one test file

**The file under review (`checkout.spec.ts`):**

```typescript
let cart;                             // file-level, reused across tests
beforeAll(() => { cart = buildCart(); });

test('checkout 1', async () => {
  cart.addItem({ sku: 'BOOK-001', qty: 2 });
  const res = await checkout(cart);
  expect(res).toBeTruthy();
  expect(cart.total).toBe(43.21);
});
```

**Walking the conventions:**

| Convention | Finding | Fix |
|---|---|---|
| §1 AAA | Phases not separated; two logical Acts (`addItem`, `checkout`). | Blank-line the phases; split the two Acts into two tests. |
| §2 Single-responsibility | Asserts the checkout result *and* the cart total - two targets. | One assertion target per test. |
| §3 Naming | `checkout 1` names nothing. | `checkout_validCart_confirmsOrder`. |
| §4 Assertion specificity | `expect(res).toBeTruthy()` passes for `1`, `{}`, `[]`. | `expect(res.status).toBe('confirmed')`. |
| §6 Fixture coupling | `cart` is a file-level `beforeAll` fixture the test mutates. | Rebuild per test in `beforeEach` (inline ownership). |
| §7 Magic literals | `43.21` has no visible derivation. | Derive from named `PRICE`, `QTY`, `TAX_RATE`. |

**After the fixes:**

```typescript
const PRICE = 19.99, QTY = 2, TAX_RATE = 0.0825;
let cart;

beforeEach(() => { cart = buildCart(); });

test('checkout_validCart_confirmsOrder', async () => {
  // Arrange
  cart.addItem({ sku: 'BOOK-001', qty: QTY });

  // Act
  const res = await checkout(cart);

  // Assert
  expect(res.status).toBe('confirmed');
});

test('addItem_appliesTaxedTotal', () => {
  // Arrange
  cart.addItem({ sku: 'BOOK-001', qty: QTY });

  // Assert
  expect(cart.total).toBeCloseTo(PRICE * QTY * (1 + TAX_RATE), 2);
});
```

Each test now has one Act, one assertion target, a self-documenting name,
a specific matcher, an inline-owned fixture, and a derived expected value.
For the E2E selector and web-first conventions applied to a `*.e2e.ts`
file, see [references/e2e-selector-and-assertion-conventions.md](references/e2e-selector-and-assertion-conventions.md).

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
- E2E selector priority + web-first assertions (§8 / §9), with these
  citations, in
  [references/e2e-selector-and-assertion-conventions.md](references/e2e-selector-and-assertion-conventions.md).

[tl]: https://testing-library.com/docs/queries/about/
[pwb]: https://playwright.dev/docs/best-practices
