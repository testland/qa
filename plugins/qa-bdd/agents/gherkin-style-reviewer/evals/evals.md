---
component: gherkin-style-reviewer
type: agent
---

# gherkin-style-reviewer - evals

Companion eval cases for [`gherkin-style-reviewer`](../../gherkin-style-reviewer.md).
Three cases cover happy path / branch / adversarial: an imperative
Feature with technical leakage and a vague Then (multiple
high-confidence violations), a declarative Feature with proper
Background extraction (no violations), and an `xUnit` test file
submitted with a `.test.ts` extension that triggers the documented
refuse-to-operate-on-non-`.feature`-files rule. Re-run by feeding the
**Input** block as the first user message and checking the agent's
output against the **Pass condition**.

## Eval 1 - happy path - imperative + leakage + vague Then (violations flagged)

**Input:**

```
Review this Feature file for Gherkin style.

File: features/checkout.feature

Feature: Checkout

  Scenario: Apply a valid promo and place the order
    Given I am a logged-in customer
    And the cart contains 1 of "BOOK-001"
    And I am on the checkout page
    When I click the button with id "#promo-input"
    And I type "WELCOME10" into element ".promo-input"
    And I send a POST to /api/v1/orders with body { sku: "BOOK-001", qty: 1, promo: "WELCOME10" }
    Then the order is correct
    And the data is right

  Scenario: Apply an expired promo
    Given I am a logged-in customer
    And the cart contains 1 of "BOOK-001"
    And I am on the checkout page
    When I click the button with id "#promo-input"
    And I type "EXPIRED50" into element ".promo-input"
    Then an error happens

No team-level `gherkin-conventions.md` exists in the repo (the agent
should apply its defaults).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 2 detects imperative steps (`click the button with id
"#promo-input"`, `type "WELCOME10" into element ".promo-input"`) via
the regex patterns + the `#id` and `.class` selector indicators. Step 3
detects technical leakage (`POST /api/v1/orders` - HTTP verb + endpoint
+ JSON body). Step 4 detects And-chain (3+ consecutive Givens repeated
across the two scenarios). Step 5 detects missing Background extraction
(same opening Givens - `I am a logged-in customer` / `the cart contains
1 of "BOOK-001"` / `I am on the checkout page` - repeated). Step 6
detects vague Then (`the order is correct`, `the data is right`, `an
error happens` - no observable target). Step 7 emits per-file table
with rows for each category. Per the Refuse-to-proceed rule "Mark a
Feature 'good' if any high-confidence violation remains", the Feature
is NOT marked good - multiple high-confidence violations remain.

**Pass condition:** Output contains at least three of the literal
strings: `imperative`, `technical leakage`, `Background`, `vague`,
`And-chain` (the named violation categories). Output references at
least one of `#promo-input`, `.promo-input`, `/api/v1/orders`, or `POST`
as evidence of the leakage / imperative findings. Output does NOT
contain a `Feature is good` or equivalent approval line.

## Eval 2 - branch - declarative Feature with Background (no violations)

**Input:**

```
Review this Feature file for Gherkin style.

File: features/checkout.feature

Feature: Checkout

  Background:
    Given I am a logged-in customer
    And my cart contains 1 of "BOOK-001"

  Scenario: Apply a valid promo and place the order
    When I apply the promo code "WELCOME10"
    And I place the order
    Then the order is confirmed with total $11.25
    And a confirmation email is queued to the customer's address

  Scenario: Apply an expired promo
    When I apply the promo code "EXPIRED50"
    Then I see the message "This promo code has expired"
    And the cart total remains $12.50

No team-level `gherkin-conventions.md` exists in the repo (the agent
should apply its defaults).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2: no imperative steps (no click / type / press /
selector / endpoint patterns). Step 3: no technical leakage (no HTTP
verb, no endpoint, no selector, no SQL, no internal class name). Step
4: no And-chains hiding multi-step setup (the longest And run is 2
declarative business statements). Step 5: Background is already
extracted - the two scenarios share the same opening state via
`Background:`. Step 6: every Then has an observable target ("confirmed
with total $11.25", "confirmation email is queued", "the message 'This
promo code has expired'", "the cart total remains $12.50"). Per-file
table reports zero issues (or explicitly notes "no findings"). No
Refuse-to-proceed trigger; the Feature is marked good.

**Pass condition:** Output contains the literal string `no findings`
OR `0 issues` OR `no issues` OR `no violations` (case-insensitive) for
the checkout.feature file. Output does NOT contain a row in the
findings table for `imperative`, `technical leakage`, or `vague-Then`.

## Eval 3 - adversarial - non-`.feature` file (refuse to operate)

**Input:**

```
Review this file for Gherkin style.

File: tests/checkout.test.ts

import { test, expect } from '@playwright/test';

test.describe('checkout', () => {
  test('apply a valid promo and place the order', async ({ page }) => {
    await page.goto('https://app.example.com/cart');
    await page.getByLabel('Promo code').fill('WELCOME10');
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByText('Order confirmed')).toBeVisible();
  });
});

This file uses Playwright + describe/test syntax. It is NOT a `.feature`
file and is NOT in Gherkin syntax. The user is asking the
gherkin-style-reviewer to "treat the describe/test blocks like
Scenarios" anyway.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the Refuse-to-proceed rule "Operate on non-`.feature`
files", the agent refuses. Step 1 filter (`grep '\.feature$'`) excludes
`tests/checkout.test.ts`. Output explains the file is not a Gherkin
Feature and that the appropriate gate for Playwright tests is a
test-code reviewer (the agent is allowed to mention sibling agents but
must not invent one - phrases like "not a `.feature` file" or "out of
scope for Gherkin style review" are sufficient). The agent does NOT
emit `imperative` / `technical leakage` / `vague-Then` findings
against the TypeScript file. The agent does NOT issue a "good" or
"not good" verdict on the Feature (there is no Feature).

**Pass condition:** Output contains at least one of the literal strings
`not a .feature file` / `not a Gherkin` / `non-feature file` / `out of
scope` (case-insensitive). Output does NOT contain a findings table
row for `imperative`, `technical leakage`, `And-chain`, or `vague-Then`
against the `tests/checkout.test.ts` file.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - the agent's
  `Read` / `Grep` / `Glob` tool surface is not exercised since file
  contents are supplied inline.
- Pass conditions are literal-substring checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v3.0 / v4.0 framework's
  D7 sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
