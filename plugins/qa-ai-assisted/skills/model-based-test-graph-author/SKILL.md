---
name: model-based-test-graph-author
description: "Build-an-X workflow for model-based testing (MBT) per the canonical definition - authors a state-machine model of the SUT (states + transitions + guards + actions), validates the model is connected and complete, and feeds the model to a test generator (manual / AI / dedicated MBT tool) that produces test paths covering each transition. Per [Wikipedia](https://en.wikipedia.org/wiki/Model-based_testing): MBT \"leverages model-based design for designing and possibly executing tests.\" Use when a complex stateful flow (checkout, onboarding, multi-step wizard) needs systematic coverage that ad-hoc tests miss."
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

## Step 1 - Identify the SUT's state space

For a checkout flow:

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
  empty_cart        → cart_with_items     [add_item]
  cart_with_items   → empty_cart          [remove_all_items]
  cart_with_items   → shipping_entered    [enter_shipping]
  shipping_entered  → payment_entered     [enter_payment]
  payment_entered   → confirmed           [submit; payment_succeeds]
  payment_entered   → failed_payment      [submit; payment_fails]
  failed_payment    → payment_entered     [retry_payment]
  failed_payment    → abandoned           [give_up]
  cart_with_items   → abandoned           [close_browser]
```

Per [mbt-wiki][mbt]: "The automaton represents possible system
configurations, and a possible execution path can serve as a test
case."

## Step 2 - Author in a portable format

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
    to: empty_cart
    event: remove_all_items
    action: "cart.clear()"

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

## Step 3 - Validate the model

```python
# scripts/validate-model.py
import yaml

model = yaml.safe_load(open('models/checkout.yaml'))
states = {s['id'] for s in model['states']}
initial = next(s['id'] for s in model['states'] if s.get('initial'))
finals = {s['id'] for s in model['states'] if s.get('final')}

# Check 1: every transition references valid states
for t in model['transitions']:
    assert t['from'] in states, f"Unknown from-state: {t['from']}"
    assert t['to'] in states, f"Unknown to-state: {t['to']}"

# Check 2: every state is reachable from initial
reachable = {initial}
changed = True
while changed:
    changed = False
    for t in model['transitions']:
        if t['from'] in reachable and t['to'] not in reachable:
            reachable.add(t['to'])
            changed = True
unreachable = states - reachable
assert not unreachable, f"Unreachable states: {unreachable}"

# Check 3: every state can reach a final state
for s in states - finals:
    if not can_reach_final(s, model, finals):
        print(f"Warning: state {s} cannot reach a final state (deadlock)")

# Check 4: per [mbt-wiki]: "test criteria are needed to guide the
# selection" of paths. Define coverage criteria.
print(f"States: {len(states)}; Transitions: {len(model['transitions'])}")
print(f"Possible test paths (transition coverage): {len(model['transitions'])}")
```

## Step 4 - Generate test paths

Coverage criterion: **every transition is exercised at least
once** (transition coverage).

```python
def generate_paths(model, criterion='transition'):
    """Returns list of paths (each a list of transitions)."""
    if criterion == 'transition':
        # Greedy: walk the graph, prefer untraversed edges
        return greedy_transition_cover(model)
    elif criterion == 'state':
        return paths_visiting_each_state(model)
    elif criterion == 'all_pairs':
        return all_2_step_pairs(model)
    # ...
```

For the checkout model, transition coverage might produce 3 paths:

```
Path 1: empty_cart → add_item → cart_with_items → enter_shipping → ... → confirmed
Path 2: empty_cart → add_item → cart_with_items → ... → submit → payment_fails → failed_payment → retry_payment → ... → confirmed
Path 3: empty_cart → add_item → cart_with_items → close_browser → abandoned
```

Each path is one test scenario.

## Step 5 - Convert to test code

For each path, generate a test:

```typescript
// e2e/checkout/path-1.spec.ts (auto-generated from model)
test('Path 1 - happy path', async ({ page }) => {
  // empty_cart → cart_with_items
  await page.goto('/products/BOOK-001');
  await page.getByRole('button', { name: /add to cart/i }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  // cart_with_items → shipping_entered
  await page.goto('/checkout');
  await page.getByLabel(/address/i).fill('123 Main St');
  await page.getByRole('button', { name: /continue/i }).click();

  // shipping_entered → payment_entered
  await page.getByLabel(/card/i).fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: /continue/i }).click();

  // payment_entered → confirmed
  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
});
```

## Step 6 - Pair with AI test generator

The model + paths can feed [`ai-test-generator`](../ai-test-generator/SKILL.md):

```yaml
input:
  model: models/checkout.yaml
  paths: generated/paths.json
  framework: playwright
  page_objects: src/page-objects/
```

The LLM generates test code per path; review each generated test
before merge. The model provides structure that constrains the LLM - 
better than free-form generation.

## Step 7 - Per [mbt-wiki][mbt] caveats

> "Because systems can have enormous numbers of possible
> configurations, finding all paths is impractical. Instead, test
> criteria are needed to guide the selection of a finite,
> appropriate number of test cases." ([mbt-wiki][mbt])

> "Model-based testing qualifies as black-box testing since test
> suites are derived from models and not from source code."
> ([mbt-wiki][mbt])

The team picks the coverage criterion (transition, state, all
2-step pairs, all paths up to length N); MBT generates the matching
paths.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Modeling the entire app as one giant state machine                     | Unmanageable; combinatorial explosion.                                   | One model per major flow (checkout, onboarding, etc.). |
| Skipping model validation                                              | Unreachable states / dead-end states; tests waste time.                  | Validate (Step 3). |
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
- [`ai-test-generator`](../ai-test-generator/SKILL.md) - 
  downstream consumer of the generated paths.
