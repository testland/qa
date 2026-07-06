---
name: test-step-design-patterns
description: "Pure reference catalog of test-step design patterns at the architecture tier - step granularity (one logical action per step), abstraction layers (mechanical → page → business), step extraction rules (when to inline / when to extract to a helper / when to extract to a Page Object method), the declarative-vs-imperative phrasing rule, FIRST principles (Fast / Independent / Repeatable / Self-validating / Timely), and the AAA / Given-When-Then mapping. Distinct from `test-code-conventions` §1 (AAA structure at the file level) and from `manual-step-to-gherkin` (Gherkin-specific translation) - this catalog is the cross-framework architecture-tier reference for what a step IS, when it should exist, and where it should live."
---

# test-step-design-patterns

## Overview

This skill is a **pure reference** - no execution steps. It is the catalog the [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md), [`test-code-critic`](../../agents/test-code-critic.md), and [`playwright-codegen-reviewer`](../../../qa-web-e2e/agents/playwright-codegen-reviewer.md) cite when auditing step granularity at the architecture tier - within an "Act" phase, *what is one step?* It complements [`test-code-conventions §1`](../test-code-conventions/SKILL.md) (AAA structure at the file level).

## When to use

- Designing a test framework - pick the abstraction layers up front (mechanical / page / business).
- Auditing existing tests where step count per test is high (>15 actions per test signals granularity problems).
- Refactoring codegen output where every UI mechanic became its own step.
- Onboarding engineers who are writing first tests - point them at the canonical citations.

## Pattern 1 - FIRST principles

**Canonical source:** [Robert C. "Uncle Bob" Martin - *Clean Code* (2008), chapter 9 "Unit Tests"](https://www.oreilly.com/library/view/clean-code-a/9780136083238/), reaffirmed in *Clean Coder* and across his blog. The FIRST mnemonic is the foundational quality bar for every test step.

| Letter | Principle |
|---|---|
| **F - Fast** | Tests must be fast. Slow tests don't get run; tests that don't get run don't catch bugs. |
| **I - Independent** | Tests must not depend on each other. Each test sets up its own world. Per [Fowler on test isolation](https://martinfowler.com/articles/nonDeterminism.html), this is the prerequisite to parallel execution and selective re-runs. |
| **R - Repeatable** | Tests run consistently on any environment (laptop, CI, prod-like). No "runs only on Tuesdays" / "passes on Linux only." |
| **S - Self-validating** | Tests pass or fail on their own. No human reads logs to determine the outcome. |
| **T - Timely** | Tests are written close to (ideally before) the production code. Stale tests rot. |

FIRST is the underlying rationale for most of the patterns below. A step that violates FIRST is the smell; the patterns prescribe the fix.

## Pattern 2 - Step granularity

A "step" is the minimal unit a test reader can name in business terms. **One logical action per step** - not one click, not one assertion, but one *meaningful operation*.

### The single-purpose-step rule

**Each step should do exactly one of:** Arrange (setup), Act (the operation under test), Assert (verify outcome), or Annotate (logging / labelling). Steps that mix two are split.

| Smell | Refactor |
|---|---|
| `await page.click('#submit'); expect(toast).toBeVisible();` | Two steps: the Act (`submit`) and the Assert (`toast visible`). Split. |
| `const user = await createUser({...}); await login(user);` | Two Arrange steps. Acceptable as one logical "Arrange a logged-in user" if the helper is named that way (Pattern 4). |
| `await page.click('#row-1'); await page.click('#row-1-edit'); await page.fill('#name', 'New');` | Three mechanical clicks comprising one business action ("edit row 1's name"). Extract to a single business step (Pattern 4). |

### Step count per test

Aim for **3-8 steps per test body** (counting Arrange / Act / Assert phases as steps). >15 is the threshold the [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) flags as a smell - the test is doing too much or operating at the wrong abstraction.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| One step that does everything: `await fullCheckoutFlow();` | Single line of action; the test reads as "did the helper work?" not as "did the SUT work?" |
| 30 mechanical clicks comprising one logical flow | Brittle to UI changes; the test reads as a script, not a specification |
| Mixed Act + Assert in one line (`expect(await page.click(...)).toBeTruthy()`) | Cannot distinguish "the action failed" from "the assertion failed" in the diagnostic |
| One step with two unrelated assertions (`expect(cart.total).toBe(10); expect(user.role).toBe('admin');`) | Test fails on the first assert; the second is never evaluated. Split per [`test-code-critic`](../../agents/test-code-critic.md) §2 single-responsibility |

## Pattern 3 - Abstraction layers

The dominant test-code smell at scale is **mechanical steps in the test body**. The fix is layered abstraction. Three layers, named consistently:

| Layer | Vocabulary | Example |
|---|---|---|
| **Business layer** (the test body) | Domain verbs the PM / business stakeholder would recognise | `customer.signsIn()`, `cart.addsItem(sku)`, `checkout.placesOrder()` |
| **Page / Component layer** (Page Objects, Tasks, Service Objects) | Page-specific or component-specific operations | `LoginPage.submit({ email, password })`, `CartPage.applyCoupon(code)` |
| **Mechanical layer** (the framework primitives) | Click, type, navigate, request | `page.click()`, `page.fill()`, `request.post()` |

**The test body lives at the business layer.** The test never reaches into the mechanical layer directly. If it does, the team has either no abstraction or the abstraction leaks.

### Worked example (cross-framework)

**Bad** (test body at the mechanical layer):

```typescript
test('places an order', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', '[email protected]');
  await page.fill('#password', 'pass');
  await page.click('#submit');
  await page.goto('/product/sku-001');
  await page.click('button.add-to-cart');
  await page.goto('/checkout');
  await page.fill('#shipping-address', '123 Main St');
  await page.click('#place-order');
  await expect(page.locator('.confirmation')).toBeVisible();
});
```

**Good** (test body at the business layer):

```typescript
test('places an order', async ({ customer, cart, checkout }) => {
  await customer.signsIn();
  await cart.addsItem('sku-001');
  await checkout.placesOrderWithDefaultShipping();
  await expect(checkout.confirmation).toBeVisible();
});
```

The mechanics live in the Page Object / Task / fixture. The test body reads as the *specification*, not the implementation.

### When to keep the test mechanical

Some tests legitimately operate at the mechanical layer - testing the mechanical surface itself:

- Accessibility tests asserting keyboard navigation order.
- Visual regression tests asserting pixel-level rendering.
- Selector-resilience tests asserting `getByRole` works across viewports.

For these, the test body at the mechanical layer is correct. Tag them (`@a11y`, `@visual`) so reviewers don't refactor them by mistake.

## Pattern 4 - Step extraction rules

When should a step move out of the test body?

| Heuristic | Action |
|---|---|
| The step appears in 3+ tests | Extract to a Page Object method / Task / fixture |
| The step is mechanical (click, fill, navigate) but the test isn't about that mechanic | Extract |
| The step is business-meaningful and only used here | Keep inline; name it well |
| The step is 5+ lines of mechanical operations | Always extract |
| The step requires explanatory comments | The comment is a smell; the abstraction is missing - extract |
| The step is the first thing in 80% of tests | Extract to a fixture (per-test or per-describe setup) |

### The "rule of three" for extraction

Per [Refactoring (Fowler 1999, 2nd ed. 2018)](https://martinfowler.com/books/refactoring.html), duplicate code is acceptable at first occurrence (write it inline). At the second occurrence, note the duplication. At the third occurrence, extract.

This applies to test steps: don't pre-extract on the first test ("we might need this later" is YAGNI). Extract when the third test needs the same step.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Extracting every step on the first test | YAGNI; the abstraction doesn't match real usage |
| Never extracting (every test is 30 lines of mechanics) | Mechanical leakage; brittle |
| Extracting to a helper that doesn't belong to a layer (`helpers/random-stuff.ts`) | Sprawl; the team can't find the helper |
| Extracted helper that takes 8 parameters | The helper is doing too much; split it |
| Helper that hides Act vs Arrange (named `setupAndDoThing()`) | Test reads as if it's doing one thing when it does two |

## Pattern 5 - AAA / Given-When-Then mapping

Two equivalent step-grouping vocabularies. Same content, different name conventions.

| AAA (xUnit tradition) | Given-When-Then (BDD tradition) |
|---|---|
| Arrange | Given |
| Act | When |
| Assert | Then |
| (Annotate) | (no equivalent; goes in step comments) |

Both express the same three phases. The team picks one and uses it consistently. **Don't mix:** if some tests use AAA comments and others use Given-When-Then helpers, the cognitive cost grows.

### When AAA is the right choice

- xUnit-family frameworks (Jest, pytest, JUnit, NUnit).
- Tests that aren't user-facing scenarios (data-quality, security, perf).
- The team prefers comment-anchored phase separation.

### When Given-When-Then is the right choice

- BDD frameworks (Cucumber, SpecFlow, Reqnroll, Behave) where the syntax is enforced.
- Tests that are user-facing scenarios (E2E, integration).
- The team wants product stakeholders to read the tests.

### The phase-separation rule

Whatever vocabulary the team uses, the phases must be **visually separable**. The pattern from [`test-code-conventions §1`](../test-code-conventions/SKILL.md):

```typescript
test('places an order', async () => {
  // Arrange
  const customer = await aCustomer().withCartItem('sku-001').build();

  // Act
  const order = await customer.placesOrder();

  // Assert
  expect(order.status).toBe('confirmed');
});
```

Or, with blank-line separation (no comments needed):

```typescript
test('places an order', async () => {
  const customer = await aCustomer().withCartItem('sku-001').build();

  const order = await customer.placesOrder();

  expect(order.status).toBe('confirmed');
});
```

Either works; lacking either fails [`test-code-critic`](../../agents/test-code-critic.md) §1 AAA review.

## Pattern 6 - Declarative vs imperative step phrasing

Even at the business layer, two phrasings exist:

| Imperative | Declarative |
|---|---|
| "The customer enters the email and password and clicks submit" | "The customer signs in" |
| "The customer adds 5 items to the cart and proceeds to checkout" | "The customer initiates checkout with a 5-item cart" |
| "The customer is created with role=admin and org_id=42" | "An admin customer in org 42" |

The declarative form is **preferred** per [Cucumber's better-Gherkin guidance](https://cucumber.io/docs/bdd/better-gherkin/) (which applies broadly, not just to Gherkin): "scenarios should describe the intended behaviour of the system, not the implementation."

**The test:** *would the wording need to change if the implementation changed?* If yes, the step is imperative; rewrite declaratively.

### When imperative is correct

- Tests that test the imperative mechanic (e.g., "the form submits on Enter key press" - Enter is the mechanic under test).
- Accessibility tests where the keyboard sequence IS the test.

### Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Declarative step that hides a critical mechanic (`customer.signsIn()` when the test is about SSO redirect) | The test no longer tests what it claims to test |
| Imperative step that re-describes the system internals | Brittle to refactors; the test breaks when the implementation changes for unrelated reasons |
| Mixing imperative and declarative within one test | Reader can't tell what abstraction level they're operating at |

## Pattern 7 - Step naming

Per [Roy Osherove's *The Art of Unit Testing* (2013)](https://www.artofunittesting.com/), test names follow the pattern `<system_under_test>_<scenario>_<expected_outcome>`. Step naming (within the test) follows similar discipline:

| Smell | Refactor |
|---|---|
| `await doThing()` | Name what the thing is: `await customer.signsIn()` |
| `await test1()` | Helpers don't get numeric names; describe what they do |
| `await x = await getX()` | Single-letter variables hide what's being created |
| `await page.click('#submit')` | Wrap in a named Page Object method: `await loginPage.submit()` |

### The reader test

A reviewer should be able to read the test body aloud and have it sound like a specification:

> "A customer signs in. They add SKU-001 to their cart. They place an order with default shipping. The order is confirmed."

If reading aloud doesn't produce a specification - if it produces "click, type, click, click, navigate, click, expect-truthy" - the steps are at the wrong abstraction.

## Pattern selection guide

| Scenario | Pattern |
|---|---|
| Test reads as 20 clicks-and-types | Extract to Page Objects / Tasks (Pattern 4) and rewrite at business layer (Pattern 3) |
| Test does Arrange and Act in the same line | Split (Pattern 2 single-purpose rule) |
| Three tests share the same first 4 lines | Extract to fixture / helper (Pattern 4 rule of three) |
| Test phases not visually separable | Add blank lines or AAA comments (Pattern 5) |
| Step name reads as implementation detail | Rewrite declaratively (Pattern 6) |
| Step requires explanatory comment to understand | The abstraction is missing - extract (Pattern 4) |
| Test mixes business and mechanical vocabulary | Pick one layer per test (Pattern 3) |

## Cross-cutting anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Tests with 30+ steps (one logical thing per "step" but the whole test does 10 logical things) | Per [`test-code-critic`](../../agents/test-code-critic.md) §2, single-responsibility violation; split into multiple tests |
| Helpers that wrap one framework call (`async function click(sel) { await page.click(sel); }`) | Wrapping for the sake of wrapping; adds no abstraction |
| Step extracted into a helper but the helper takes a `boolean` flag that branches behavior | Two helpers masquerading as one |
| Step that does retry / wait / fallback inside | Hides flakiness; the test passes when it should fail |
| Tests that read top-down look fine but the helpers contain hidden assertions | The test seems to assert one thing; actually asserts more (or different things) |
| Tests where the assertion is inside the Page Object method | Violates [`object-model-patterns`](../object-model-patterns/SKILL.md) no-assertion rule |

## Hand-off targets

- **Audit a framework's test-step quality at the codebase level** → [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md) (preloads this skill).
- **Per-file AAA / naming review** → [`test-code-critic`](../../agents/test-code-critic.md).
- **Codegen → business-layer refactor** → [`playwright-codegen-reviewer`](../../../qa-web-e2e/agents/playwright-codegen-reviewer.md).
- **Translate manual test steps to Gherkin** → [`manual-step-to-gherkin`](../../../qa-bdd/skills/manual-step-to-gherkin/SKILL.md).
- **Object-model architecture patterns (where extracted steps live)** → [`object-model-patterns`](../object-model-patterns/SKILL.md) (sister catalog).
- **Test isolation / fixture lifecycle** → [`test-isolation-patterns`](../test-isolation-patterns/SKILL.md) (sister catalog).
- **Test data construction patterns** → [`test-data-patterns`](../../../qa-test-data/skills/test-data-patterns/SKILL.md) (sister catalog).
- **Cross-file file-level conventions** → [`test-code-conventions`](../test-code-conventions/SKILL.md).

## References

- Robert C. Martin - *Clean Code: A Handbook of Agile Software Craftsmanship* (2008), chapter 9 "Unit Tests" (the FIRST principles): ISBN 978-0132350884. The canonical reference for the FIRST mnemonic. https://www.oreilly.com/library/view/clean-code-a/9780136083238/
- Roy Osherove - *The Art of Unit Testing* (2nd ed. 2013) (the `<sut>_<scenario>_<expected>` naming pattern cited in [`test-code-conventions §3`](../test-code-conventions/SKILL.md)): ISBN 978-1617290893.
- Kent Beck - *Test-Driven Development by Example* (2002) - the canonical TDD reference for step / test design rhythm: ISBN 978-0321146533.
- Martin Fowler - *Refactoring: Improving the Design of Existing Code* (2nd ed. 2018) - the "rule of three" for extraction (Pattern 4): https://martinfowler.com/books/refactoring.html
- Martin Fowler - *Eradicating Non-Determinism in Tests* (cited for the Independent principle): https://martinfowler.com/articles/nonDeterminism.html
- Cucumber documentation - *Better Gherkin* (declarative vs imperative phrasing rule, Pattern 6): https://cucumber.io/docs/bdd/better-gherkin/
- Gerard Meszaros - *xUnit Test Patterns* (2007) - the named-pattern catalog for `Test Method`, `Assertion Method`, `Custom Assertion`, `Inline Resource`: ISBN 978-0131495050.
- ISTQB glossary - test step: https://glossary.istqb.org/en_US/term/test-step
- ISTQB glossary - test procedure (the imperative form, by ISTQB convention): https://glossary.istqb.org/en_US/term/test-procedure-1
- [`test-code-conventions`](../test-code-conventions/SKILL.md), [`test-code-critic`](../../agents/test-code-critic.md), [`framework-architecture-auditor`](../../agents/framework-architecture-auditor.md), [`playwright-codegen-reviewer`](../../../qa-web-e2e/agents/playwright-codegen-reviewer.md), [`manual-step-to-gherkin`](../../../qa-bdd/skills/manual-step-to-gherkin/SKILL.md) - the related-tier components.
- [`object-model-patterns`](../object-model-patterns/SKILL.md), [`test-isolation-patterns`](../test-isolation-patterns/SKILL.md), [`test-data-patterns`](../../../qa-test-data/skills/test-data-patterns/SKILL.md) - sister architecture-tier pattern catalogs.
