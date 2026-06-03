---
name: test-case-ideation-from-story
description: "Takes a user story or feature spec and emits a markdown test-case matrix - one row per case (id, title, precondition, steps, expected, tier) covering happy path, alternate paths, boundaries, and negative paths - before any test code is written. Output is the human-reviewable matrix that goes into TestRail / Qase / Xray. Distinct from `gherkin-from-stories` (which assumes the AC layer is already locked and emits Gherkin) and from `ai-test-generator` (which emits executable code, not a case matrix). Use as the first artifact a manual tester or three-amigos session produces from a story, ahead of automation."
rating: 24
d6: 4
---

# test-case-ideation-from-story

## Overview

A user story is not a test plan. The "three amigos" hand-off from product to QA needs an intermediate artifact: a human-reviewable **test-case matrix** that enumerates the cases the story implies, before anyone writes Gherkin or test code. This skill produces that matrix.

The matrix is what manual testers paste into TestRail / Qase / Xray. It is also the contract that the downstream automation engineer reads when picking up the story - `gherkin-from-stories` (in `qa-bdd`) needs a stable AC layer, and the AC layer is derived from this matrix, not the other way around.

The PractiTest 2026 State of Testing Report finds 70% of teams already use AI for test-case creation but only 40.7% report achieving "more diverse and complex test cases" (https://www.practitest.com/state-of-testing/) - the dominant failure mode is shallow output (one happy path × three trivial restatements). This skill exists to constrain the output shape so that the matrix is forced through equivalence-partitioning, boundary, and negative-path lenses.

## When to use

- A new user story has been accepted by the team and needs initial QA breakdown.
- A three-amigos session is about to start and needs a case-list straw-man.
- A test-management tool (TestRail, Qase, Xray, Zephyr, TestCollab) needs cases populated before the next sprint.
- A manual tester has been handed a feature spec and is opening a blank document.

Do **not** use this skill when:

- The acceptance criteria are already locked and the team is past the matrix stage - go straight to `gherkin-from-stories` or `manual-test-script-author`.
- The story is a one-line bug fix; the matrix overhead exceeds the value.

## Step 1 - Extract the story's testable claims

Read the user story (and any attached AC, mockups, or rejection notes) and extract:

1. **Actor** - who is performing the action? (logged-in user / anonymous / admin / system).
2. **Action** - the verb the actor performs (clicks "Add to cart", submits form, calls API).
3. **Object** - the thing being acted on (a product, a form, a record).
4. **Preconditions** - system state needed before the action (logged in, has X items in cart, feature flag on).
5. **Postconditions** - observable outcomes (cart shows item, email sent, audit log written, redirect occurred).
6. **Constraints** - bounded values, rate limits, role permissions.

If any of (1) - (5) is missing from the story, **stop and request clarification**. A matrix derived from incomplete input will mask the gap rather than surface it. ISTQB's [test analysis](https://glossary.istqb.org/en_US/term/test-analysis-2) step is explicit that test conditions must trace to identified test bases; an unclear story is not a test basis.

## Step 2 - Enumerate cases per ISTQB test design technique

For each (action, object) pair, generate cases by walking three lenses ([equivalence partitioning](https://glossary.istqb.org/en_US/term/equivalence-partitioning-1), [boundary value analysis](https://glossary.istqb.org/en_US/term/boundary-value-analysis-1), [decision table testing](https://glossary.istqb.org/en_US/term/decision-table-testing)):

### Lens 1 - Equivalence classes (one row per class)

For each input parameter, identify the valid and invalid equivalence classes. One representative case per class.

| If parameter is… | Valid classes | Invalid classes |
|---|---|---|
| String with format constraint (email, URL, phone) | Conformant | Empty / wrong format / null / oversized |
| Numeric with range | Min ≤ x ≤ max | x < min, x > max, NaN, negative, zero (if not in range) |
| Enum | Each documented value | Undocumented value, mixed case |
| Reference (foreign key, file path) | Existing | Missing, deleted, belongs-to-other-tenant |

### Lens 2 - Boundaries (one row per boundary)

For numeric / length-bounded parameters, add cases at `min`, `min-1`, `max`, `max+1`. Skip if the parameter is unbounded (free-text comment, etc.).

### Lens 3 - Decision conditions (one row per branch)

If the story implies decision logic (role-based access, plan tier, feature flag, A/B variant), add one case per condition combination. Use a decision table to be exhaustive; collapse rows that have the same outcome.

## Step 3 - Emit the matrix

Output is a markdown table. Required columns:

| Field | Notes |
|---|---|
| **ID** | `<story-key>-TC-<n>`, e.g. `CART-142-TC-03`. Stable across iterations. |
| **Title** | Imperative single sentence: "Adds a product to the cart as an anonymous user". No "should". |
| **Tier** | `smoke` / `regression` / `edge` / `negative`. Tier rationale belongs in the next column. |
| **Precondition** | One sentence; references fixtures by name where possible. |
| **Steps** | Numbered. Declarative (per [Cucumber better-gherkin guidance](https://cucumber.io/docs/bdd/better-gherkin/)) - describe behavior, not UI mechanics. |
| **Expected** | One sentence per observable post-condition. |
| **Source claim** | Which sentence in the story / AC this case traces to. Forces traceability. |

### Worked example

Story: *"As an anonymous shopper, I want to add a product to my cart, so that I can check out without signing in first."*

| ID | Title | Tier | Precondition | Steps | Expected | Source claim |
|---|---|---|---|---|---|---|
| CART-142-TC-01 | Adds an in-stock product to an empty cart | smoke | Anonymous session; product `SKU-001` in stock | 1. Open product page for `SKU-001`. 2. Add to cart with default qty. | Cart count = 1; product line shows `SKU-001`. | Story sentence 1 |
| CART-142-TC-02 | Adds a second product to a cart that already has one | regression | Anonymous session; cart already contains `SKU-001` | 1. Open product page for `SKU-002`. 2. Add to cart. | Cart count = 2; both SKUs present. | Implied by "add" semantics |
| CART-142-TC-03 | Rejects adding an out-of-stock product | negative | Anonymous session; `SKU-099` is out of stock | 1. Open product page for `SKU-099`. 2. Attempt to add to cart. | Add-to-cart control disabled or 409 returned. Cart count unchanged. | Story constraint (implicit) |
| CART-142-TC-04 | Rejects adding when cart is at the per-session limit | boundary | Anonymous session; cart has the maximum number of items per the documented `MAX_CART_ITEMS` | 1. Open any product page. 2. Attempt to add to cart. | 409 / cart-full message. Cart count unchanged. | Constraint: `MAX_CART_ITEMS` |
| CART-142-TC-05 | Persists cart across page refresh | regression | Anonymous session; cart has 1 item | 1. Refresh the page. | Cart still shows the same item. | Implied by "without signing in" |

The matrix is the authoring artifact. The next steps in the workflow are:

1. Hand the matrix to a manual tester for execution (TestRail / Qase / Xray import).
2. Hand the same matrix to `gherkin-from-stories` (in `qa-bdd`) which converts the rows the team wants to automate into Gherkin scenarios.
3. After implementation, run `ai-test-shallow-coverage-critic` (in `qa-ai-assisted`) over the resulting test code to confirm the matrix's negative / boundary cases actually made it into executable tests.

## Step 4 - CI / tracker integration

The matrix is plain markdown. Common integrations:

- **TestRail**: import as CSV using TestRail's bulk-import endpoint (https://support.testrail.com/hc/en-us/articles/7077871398036-Importing-test-cases). Map `ID` → `TestRail ID`, `Tier` → `Section`, the rest to standard fields.
- **Qase**: import via the Qase API `cases/bulk` endpoint or the Qase CLI; the markdown table maps row-by-row.
- **Xray (Jira)**: copy the table into a Jira Test issue's description; Xray's "test cases as Gherkin" view ignores the matrix but it remains the human-readable source of truth.
- **PR review** (lightweight): commit the matrix as `docs/test-cases/<story-key>.md` for review alongside the implementation PR.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One row per UI step ("user clicks button", "user types email") | Matrix becomes a script, not a case list. ISTQB calls these procedures, not cases. | One row per **case**; UI mechanics live in `manual-test-script-author` (in `qa-manual-testing`). |
| Five rows that all assert the same happy-path outcome with cosmetic variation | Same equivalence class repeated; doesn't add coverage. | One row per equivalence class (Step 2 Lens 1). |
| No negative cases at all | This is the [PractiTest 2026 "test factory"](https://www.practitest.com/state-of-testing/) failure mode. | Mandate at least one `negative`-tier row per story unless the story has no error contract. |
| Source-claim column blank or "Story" | Blocks traceability; if the story changes, you can't tell which rows need re-review. | Cite the specific sentence / AC bullet. |
| Cases that depend on implementation choices ("user clicks the React `<AddToCartButton>` component") | Implementation-coupled cases churn with refactors. | Declarative phrasing per [Cucumber better-gherkin](https://cucumber.io/docs/bdd/better-gherkin/). |
| Matrix produced from a story missing actor / postconditions | The matrix masks the gap; downstream sees noise. | Step 1 explicitly halts on missing fields. |

## Limitations

- **Coverage is not exhaustive.** Equivalence-partitioning + boundary + decision-table reduce the case set to a tractable size; pairwise / model-based testing produces tighter coverage but at higher authoring cost. For high-stakes features, escalate to `model-based-test-graph-author` (in `qa-ai-assisted`).
- **Matrix ≠ tests.** A row in the matrix is not a runnable test. Conversion to executable tests is the job of `gherkin-from-stories` (BDD path), `manual-test-script-author` (manual execution path), or `ai-test-generator` (code generation path).
- **Story quality is upstream.** Stories with vague or missing acceptance criteria produce thin matrices. The skill flags missing fields in Step 1 but cannot author the missing AC - that is product's job.
- **No automatic dedupe.** The skill does not check whether a similar case already exists for a previous story; the team is expected to deduplicate at the test-management-tool layer.

## Hand-off targets

- **Convert matrix rows to Gherkin** → [`gherkin-from-stories`](../../../qa-bdd/skills/gherkin-from-stories/SKILL.md).
- **Convert matrix rows to a manual execution script** → [`manual-test-script-author`](../../../qa-manual-testing/skills/manual-test-script-author/SKILL.md).
- **Generate test code from matrix rows** → [`ai-test-generator`](../../../qa-ai-assisted/skills/ai-test-generator/SKILL.md). Always pair with [`ai-test-curator`](../../../qa-ai-assisted/agents/ai-test-curator.md) and [`ai-test-shallow-coverage-critic`](../../../qa-ai-assisted/agents/ai-test-shallow-coverage-critic.md) downstream.
- **Generate negative-path companions for an already-written happy-path test** → [`negative-test-generator`](../../../qa-test-data/skills/negative-test-generator/SKILL.md).
- **Generate boundary cases** → [`boundary-value-generator`](../../../qa-test-data/skills/boundary-value-generator/SKILL.md).

## References

- ISTQB glossary - test analysis: https://glossary.istqb.org/en_US/term/test-analysis-2
- ISTQB glossary - equivalence partitioning: https://glossary.istqb.org/en_US/term/equivalence-partitioning-1
- ISTQB glossary - boundary value analysis: https://glossary.istqb.org/en_US/term/boundary-value-analysis-1
- ISTQB glossary - decision table testing: https://glossary.istqb.org/en_US/term/decision-table-testing
- Cucumber documentation - Better Gherkin (declarative vs imperative): https://cucumber.io/docs/bdd/better-gherkin/
- PractiTest 2026 State of Testing Report - 70% use AI for test-case creation, 40.7% achieve "more diverse and complex test cases": https://www.practitest.com/state-of-testing/
- TestRail CSV import documentation: https://support.testrail.com/hc/en-us/articles/7077871398036-Importing-test-cases
