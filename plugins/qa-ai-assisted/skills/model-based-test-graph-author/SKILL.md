---
name: model-based-test-graph-author
description: "Build-an-X workflow for model-based testing (MBT) per the canonical definition - authors a state-machine model of the SUT (states + transitions + guards + actions), validates the model is connected and complete, and feeds the model to a test generator (manual / AI / dedicated MBT tool) that produces test paths covering each transition. Per Wikipedia (en.wikipedia.org/wiki/Model-based_testing): MBT \"leverages model-based design for designing and possibly executing tests.\" Use when a complex stateful flow (checkout, onboarding, multi-step wizard) needs systematic coverage that ad-hoc tests miss."
---

# model-based-test-graph-author

## Overview

Per [mbt-wiki][mbt]:

[mbt]: https://en.wikipedia.org/wiki/Model-based_testing

> "**Model-based testing** is an approach to testing that
> leverages model-based design for designing and possibly executing
> tests. A model typically represents either the desired behavior
> of a system under test or testing strategies themselves."

> "Often the model is translated to or interpreted as a
> finite-state automaton or a state transition system." ([mbt-wiki][mbt])

The state machine is the artifact; test paths are derived from it.
This skill produces the state-machine model (input to MBT tools or
AI test generators).

## When to use

- A complex stateful flow exists (multi-step wizard, checkout
  funnel, onboarding flow, payment state machine).
- Ad-hoc test authoring keeps missing edge cases.
- The team wants exhaustive transition coverage that manual tests
  can't provide.

## How to use

1. **Identify the state space** - list every state and every
   transition (event + guard + action) of one flow. One model per
   flow, never one giant model for the whole app.
2. **Author the model** in a portable YAML format - states carry
   `initial` / `final` flags; transitions carry `from` / `to` /
   `event` / `guard` / `action`.
3. **Validate the model** - every transition references a real state,
   every state is reachable from the initial state, and every state
   can reach a final state. Validator + coverage-criteria detail in
   [references/model-validation-and-coverage.md](references/model-validation-and-coverage.md).
4. **Pick a coverage criterion** (transition / state / all-pairs) and
   generate the test paths that satisfy it.
5. **Convert each path to a test**, or feed the model + paths to
   `ai-test-generator` for code generation.

## Worked example - checkout flow

### State space

List the states and the transitions between them. Each transition
names the event that fires it plus any guard and action:

```
States:
  - empty_cart
  - cart_with_items
  - shipping_entered
  - payment_entered
  - confirmed
  - failed_payment
  - abandoned

Transitions:
  empty_cart        -> cart_with_items     [add_item]
  cart_with_items   -> empty_cart          [remove_all_items]
  cart_with_items   -> shipping_entered    [enter_shipping]
  shipping_entered  -> payment_entered     [enter_payment]
  payment_entered   -> confirmed           [submit; payment_succeeds]
  payment_entered   -> failed_payment      [submit; payment_fails]
  failed_payment    -> payment_entered     [retry_payment]
  failed_payment    -> abandoned           [give_up]
  cart_with_items   -> abandoned           [close_browser]
```

Per [mbt-wiki][mbt]: "The automaton represents possible system
configurations, and a possible execution path can serve as a test
case."

### Portable model

Author the same machine in tool-agnostic YAML - this is the artifact
MBT tools and AI generators consume:

```yaml
# models/checkout.yaml
states:
  - id: empty_cart
    initial: true
  - id: cart_with_items
  - id: shipping_entered
  - id: payment_entered
  - id: confirmed
    final: true
  - id: failed_payment
  - id: abandoned
    final: true

transitions:
  - from: empty_cart
    to: cart_with_items
    event: add_item
    guard: "item.in_stock"
    action: "cart.add(item)"

  - from: cart_with_items
    to: shipping_entered
    event: enter_shipping
    guard: "valid_address"
    action: "session.shipping = address"

  - from: shipping_entered
    to: payment_entered
    event: enter_payment
    guard: "valid_card"

  - from: payment_entered
    to: confirmed
    event: submit
    guard: "payment_succeeds"

  - from: payment_entered
    to: failed_payment
    event: submit
    guard: "payment_fails"

  - from: failed_payment
    to: payment_entered
    event: retry_payment

  - from: failed_payment
    to: abandoned
    event: give_up

  - from: cart_with_items
    to: abandoned
    event: close_browser
```

### Validate

Run the validator (in
[references/model-validation-and-coverage.md](references/model-validation-and-coverage.md)).
For the checkout model it confirms no unreachable or deadlock states
and prints the counts that bound path generation:

```
States: 7; Transitions: 9
Possible test paths (transition coverage): 9
```

### Generate paths

Coverage criterion: **every transition is exercised at least once**
(transition coverage). A greedy walk that prefers untraversed edges
covers all nine transitions in 3 paths:

```
Path 1: empty_cart -> add_item -> cart_with_items -> enter_shipping -> ... -> confirmed
Path 2: empty_cart -> add_item -> cart_with_items -> ... -> submit -> payment_fails -> failed_payment -> retry_payment -> ... -> confirmed
Path 3: empty_cart -> add_item -> cart_with_items -> close_browser -> abandoned
```

Each path is one test scenario.

### Convert a path to a test

Each path becomes a test; guards on the path become the fixtures and
assertions of that test:

```typescript
// e2e/checkout/path-1.spec.ts (auto-generated from model)
test('Path 1 - happy path', async ({ page }) => {
  // empty_cart -> cart_with_items
  await page.goto('/products/BOOK-001');
  await page.getByRole('button', { name: /add to cart/i }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  // cart_with_items -> shipping_entered
  await page.goto('/checkout');
  await page.getByLabel(/address/i).fill('123 Main St');
  await page.getByRole('button', { name: /continue/i }).click();

  // shipping_entered -> payment_entered
  await page.getByLabel(/card/i).fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: /continue/i }).click();

  // payment_entered -> confirmed
  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
});
```

### Feed an AI generator (optional)

The model + paths can drive `ai-test-generator` instead of
hand-authoring each test:

```yaml
input:
  model: models/checkout.yaml
  paths: generated/paths.json
  framework: playwright
  page_objects: src/page-objects/
```

The LLM generates test code per path; review each generated test
before merge. The model constrains the LLM - better than free-form
generation.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Modeling the entire app as one giant state machine                     | Unmanageable; combinatorial explosion.                                   | One model per major flow (checkout, onboarding, etc.). |
| Skipping model validation                                              | Unreachable states / dead-end states; tests waste time.                  | Validate the model (see references + the worked example). |
| All-paths coverage on a complex model                                  | Per [mbt-wiki][mbt]: "impractical."                                      | Pick a tractable criterion (transition, all-pairs). |
| Generated tests that don't honor guards                                | Tests fail because preconditions weren't met.                            | The path includes guard checks; tests honor them. |
| One-shot model authoring; no maintenance                               | Model drifts from app behavior; tests test the wrong thing.              | Update model when the app's state machine changes; treat as code. |

## Limitations

- **Author skill required.** Modeling state machines is a craft;
  initial authoring takes practice.
- **Black-box only.** Per [mbt-wiki][mbt]: MBT is black-box; doesn't
  catch implementation bugs that don't surface in state behavior.
- **Tooling fragmentation.** MBT tools (GraphWalker, ModelJUnit,
  Spec Explorer) have varying capabilities; this skill's
  YAML format is portable but tool-agnostic.
- **Coverage criteria != correctness.** Transition coverage means
  every transition fires once; doesn't guarantee correctness in
  all parameter combinations.

## References

- [mbt][mbt] - Model-based testing definition; finite-state automata;
  abstract vs executable test suites; coverage criteria; black-box
  framing.
- [references/model-validation-and-coverage.md](references/model-validation-and-coverage.md) -
  the model validator, the path generator per criterion, and the
  coverage-criteria caveats.
- `ai-test-generator` -
  downstream consumer of the generated paths.
