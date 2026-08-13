---
name: model-based-test-graph-author
description: "Build-an-X workflow for model-based testing (MBT) per the canonical definition - authors a state-machine model of the SUT (states + transitions + guards + actions), validates the model is connected and complete, and runs the full graph-to-suite pipeline: pick a coverage criterion, generate covering paths, bridge each path into an acceptance-criterion entry ai-test-generator consumes, and assemble the generated tests into a suite file with confidence tiers and a curation note routing to ai-test-curator before merge. Per Wikipedia (en.wikipedia.org/wiki/Model-based_testing): MBT \"leverages model-based design for designing and possibly executing tests.\" Use when a complex stateful flow (checkout, onboarding, multi-step wizard) needs systematic coverage that ad-hoc tests miss, or when the whole model-to-suite pipeline should run in one coordinated pass."
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

## Pipeline - graph to assembled suite in one pass

To run the whole MBT pipeline in one coordinated pass (model, paths,
generated tests, assembled suite), follow these steps. Required inputs: a
stateful SUT description (flow name + observable states + trigger events),
an acceptance-criteria source (spec file, user stories, or inline list),
and the target test framework (`playwright`, `jest`, `pytest`, etc.).
Missing any of the three - stop and ask; a state machine cannot be built
from nothing, and generation without structured input is unacceptable
hallucination risk.

Per [GraphWalker](https://graphwalker.github.io/): "A model is a graph,
which is a set of vertices and edges. From a model, GraphWalker will
generate a path through it. A model has a start element, and a generator
which rules how the path is generated, and associated stop condition."
The pipeline automates that full cycle.

1. **Build and validate the model** (steps 1-3 above). Write it to
   `models/<flow>.yaml`. If validation fails - unreachable states or
   dead-end non-final states remain - fix the model before generating
   anything.
2. **Choose a coverage criterion.** Per [mbt-wiki][mbt]: "test criteria
   are needed to guide the selection of a finite, appropriate number of
   test cases." Default to transition coverage; honor a stricter request
   (`state`, `all-pairs`) and document the choice in the suite header.
3. **Bridge the paths into generator input.** The path list
   (`generated/paths.json`) and `ai-test-generator` do not share a format:
   the generator consumes an `acceptance_criteria` list (entries with
   `id`, `description`, `inputs`, `expected`), not a model or path list.
   Skipping this bridge is the most common way the pipeline silently
   produces nothing. Map each path to exactly one entry: `id` is the path
   id, `description` is the transition sequence as a sentence, `inputs`
   are the trigger events and guard values along the path, and
   `expected.final_state` is the path's terminal observable state:

   ```yaml
   # input/<flow>-mbt.yaml  (derived from generated/paths.json)
   spec_source: "models/<flow>.yaml"
   acceptance_criteria:
     - id: AC-PATH-1
       description: "empty_cart -> add_item -> ... -> confirmed (happy path)"
       inputs:
         events: [add_item, enter_shipping, enter_payment, place_order]
         guards: { item_in_stock: true, payment_valid: true }
       expected:
         final_state: confirmed
     - id: AC-PATH-2
       description: "... -> payment_fails -> retry_payment -> confirmed"
       inputs:
         events: [add_item, enter_shipping, enter_payment, place_order, retry_payment]
         guards: { payment_valid: false }
       expected:
         final_state: confirmed
   ```

   Feed the bridged file to `ai-test-generator` and tier the output by
   confidence score (high / medium / low).
4. **Assemble the suite.** Write `tests/mbt-<flow>.spec.<ext>` with a
   header comment recording: model file path, coverage criterion, path
   count, confidence breakdown (N high / M medium / K low), generation
   date, and status `PENDING curation`. Emit low-confidence tests with an
   inline `// REVIEW: low confidence` marker.
5. **Close with the curation note.** Never treat the generated tests as
   merge-ready: print the suite path, model path, criterion, path count,
   and confidence breakdown, then route to `ai-test-curator` before merge -
   low-confidence tests (score below 50) require manual review or rewrite.

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
