# Step grouping and phrasing

Reference detail for `test-code-conventions` §11 (step design): how test steps are grouped into phases and how they are phrased. The SKILL.md spine summarizes and links here; this file holds the full tables, guidance, and code.

## AAA / Given-When-Then mapping (Pattern 5)

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

Whatever vocabulary the team uses, the phases must be **visually separable**. The pattern from `test-code-conventions §1`:

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

Either works; lacking either fails the §1 AAA review.

## Declarative vs imperative step phrasing (Pattern 6)

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
