# Manual test steps to declarative Gherkin - classification and rewrite rules

Deep reference for `gherkin-from-stories` ("from manual test steps" input
shape). Consult when migrating manual scripts (TestRail / Qase / Xray
exports) to BDD or handing a manual script to an automation engineer.

A manual test script and a Gherkin scenario describe the same behavior at
different abstraction levels. Manual scripts are imperative ("click the Add
to Cart button, then verify the cart count is 1"); Gherkin steps should be
declarative ("the customer adds a product to their cart, then their cart
shows one item"). The conversion goes wrong in a predictable way: one-for-one
translation of UI mechanics produces brittle, implementation-coupled
scenarios that Cucumber's own guidance warns against
(https://cucumber.io/docs/bdd/better-gherkin/).

## Step 1 - Classify each manual step

| Tag | Pattern | Example |
|---|---|---|
| **UI mechanic** | Verbs like "click", "tap", "type", "press", "select from dropdown", "navigate to", "scroll" combined with a UI element. | "Click the *Add to Cart* button" |
| **State assertion** | "Verify", "check", "confirm", "ensure" combined with an observable property. | "Verify the cart count is 1" |
| **Business action** | A domain-level verb already (signs in, places order, cancels subscription). | "User signs in with valid credentials" |
| **Setup / precondition** | "Given that…", "Assuming…", "Pre-requisite:". | "Given the user is logged in" |
| **Observation / data inspection** | "Note the order ID for later use", "record the timestamp". | "Capture the response time" |

UI mechanics and state assertions are the two types to rewrite. Business
actions are already declarative - pass them through. Setup converts to
`Given`. Observations are typically dropped from Gherkin and lifted into
step-definition implementation details.

## Step 2 - Declarative-rewrite rules

The test for whether a step is too imperative: would the wording need to
change if the implementation changed (e.g., the UI moved from a button to a
voice command)? If yes, rewrite
(https://cucumber.io/docs/bdd/better-gherkin/).

### Rule R1 - Remove UI mechanics

| Imperative | Declarative |
|---|---|
| "Click the *Add to Cart* button" | "the customer adds a product to their cart" |
| "Type `user@example.com` in the email field" | "the customer signs in as `user@example.com`" |
| "Press the *Submit* button" | "the customer submits the form" |
| "Select *USA* from the country dropdown" | "the customer chooses USA as their country" |
| "Scroll to the bottom of the page" | (drop - implementation detail; Gherkin should not require it) |

### Rule R2 - Collapse multi-step UI sequences into one business action

A manual script that says "type email; type password; click Submit" becomes
one Gherkin step: `When the customer signs in with valid credentials`. The
business action is "signing in", not "clicking, typing, clicking". The
mechanics live in the step definition.

### Rule R3 - Replace UI properties with observable outcomes

| Imperative | Declarative |
|---|---|
| "Verify the cart count is 1" | "their cart contains one item" |
| "Confirm the *Submit* button is disabled" | "the form cannot be submitted" |
| "Check that the URL is `/dashboard`" | "the customer is on the dashboard" |
| "Verify that the green checkmark appears" | "the operation is confirmed" |

### Rule R4 - Choose the right keyword

| Manual step intent | Gherkin keyword |
|---|---|
| Setup state that exists before the user acts in this scenario | `Given` |
| The user (or system) takes an action under test | `When` |
| An observable consequence is asserted | `Then` |
| Add detail to a previous step (same keyword type) | `And` |
| Negate / contrast a previous step | `But` |

`And` and `But` inherit the type of the previous keyword - they are not
interchangeable with `Given`/`When`/`Then`
(https://cucumber.io/docs/gherkin/reference/).

### Rule R5 - Preserve the project's existing vocabulary

Before emitting the rewrite, scan the project's existing Gherkin for the
same business action. If "the customer signs in" is already used, do not
introduce "the user logs in" - vocabulary drift fragments the step library
and forces step-definition duplication. `bdd-step-library-curator` audits
and consolidates that vocabulary.

## Step 3 - Emit a side-by-side rewrite table

Output is a markdown table so a reviewer can confirm semantic equivalence:

| Manual step (input) | Gherkin step (output) | Keyword | Justification |
|---|---|---|---|
| Click the *Add to Cart* button on the `SKU-001` product page | the customer adds `SKU-001` to their cart | `When` | R1 strips UI mechanic; business action elevated |
| Verify the cart count is 1 | their cart contains one item | `Then` | R3 swaps UI property for observable outcome |
| Type email; type password; click *Submit* | the customer signs in as `user@example.com` | `When` | R2 collapses three UI mechanics to one business action |
| Pre-requisite: User is logged in | the customer is signed in | `Given` | R4 chooses Given for setup |
| Note the order ID | (dropped - implementation detail) | - | Out-of-scope for Gherkin per R1 |

The surviving rows assemble into a Scenario:

```gherkin
Scenario: Customer adds an in-stock product to their cart
  Given the customer is signed in
  When the customer adds SKU-001 to their cart
  Then their cart contains one item
```

## Step 4 - Validate against project conventions

1. **Check the project step library** for matching existing steps; flag new
   steps for `bdd-step-library-curator` review.
2. **Confirm the scenario has at most one `When`.** Multiple `When`s
   indicate two scenarios were collapsed; split them.
3. **Lint with the project's Gherkin linter** (gherkin-lint, picklesdoc, or
   the IDE's built-in).
4. **Diff the rewrite against the manual step's expected outcome** -
   semantic equivalence is the bar. If the manual step asserts "cart count
   is 1" but the rewrite asserts "cart is non-empty", that is a regression
   in specificity, not a successful abstraction.

## Migration-specific anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One-for-one translation that keeps "the customer clicks the button" | Brittle to UI changes; Cucumber explicitly warns against it | Apply R1 strictly |
| Multiple `When`s in one scenario after collapsing | The scenario contains two business actions | Split into two scenarios |
| Inventing new vocabulary when matching steps exist | Vocabulary drift; duplicate step definitions | Cross-reference the existing library (R5) |
| Dropping all `Then` assertions because they "look like UI checks" | The scenario becomes unverifiable | R3 rewrites assertions; doesn't drop them |
| Translating *every* UI mechanic, including business-relevant ones | "Selects USA as country" may be load-bearing; "scrolls to footer" is not | Preserve domain-meaningful selections |
| Gherkin that needs a comment to explain | The rewrite is wrong | Make the scenario self-explanatory |

## Migration-specific limitations

- **Vocabulary alignment is the bottleneck, not translation.** For large
  projects, run `bdd-step-library-curator` first to canonicalize vocabulary.
- **Some manual steps are inherently UI-mechanical.** A11y tests asserting
  "the *Skip to main* link is the first focusable element" cannot be
  rewritten into business language without losing the spec - pass through
  with R1 disabled and tag `@a11y` for the team to decide.
- **Numerical specificity is preserved, not abstracted.** "Cart count is 1"
  stays "cart contains one item" - not "cart is non-empty".
- **Output is a draft.** A human reviews the side-by-side before merging.

## Sources

- Cucumber - Better Gherkin (declarative vs imperative):
  https://cucumber.io/docs/bdd/better-gherkin/
- Cucumber - Gherkin reference (keyword semantics):
  https://cucumber.io/docs/gherkin/reference/
- ISTQB glossary - test procedure (the imperative form abstracted away
  from): https://glossary.istqb.org/en_US/term/test-procedure
