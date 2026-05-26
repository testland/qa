---
component: spec-to-e2e-test-scaffolder
type: agent
archetype: A4
---

# spec-to-e2e-test-scaffolder — evals

Companion eval cases for [`spec-to-e2e-test-scaffolder`](../../spec-to-e2e-test-scaffolder.md).
Three cases cover happy path / branch / adversarial: a Playwright
scaffold from the worked example (`CART-142-TC-01`), a Cypress branch
for the same test case, and a missing-Expected refusal. Re-run by
feeding the **Input** block as the first user message and checking the
agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date —
each case is designed to be reproducible against any tier.

## Eval 1 — happy path — Playwright scaffold for an add-to-cart smoke test

**Input:**

```
Scaffold an E2E test from this test-case row.

Framework: playwright
Target URL: https://staging.acme.local

| ID | Title | Tier | Precondition | Steps | Expected |
|---|---|---|---|---|---|
| CART-142-TC-01 | Adds an in-stock product to an empty cart | smoke | Anonymous session; `SKU-001` in stock | 1. Open product page for `SKU-001`. 2. Add to cart with default qty. | Cart count = 1; product line shows `SKU-001`. |

Project conventions: playwright.config.ts declares
`testIdAttribute: 'data-testid'`. Page Object dir: tests/poms/.
@playwright/test version: ^1.49.0.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Step 1 detects Playwright `^1.49.0` and the `data-testid`
locator convention. Step 2 maps the test case to the Playwright wrapper
`test('<title>', async ({ page }) => …)` with the canonical locator
priority (`getByRole` > `getByText` > `getByTestId` > CSS / XPath).
Step 3 emits a scaffold at `tests/cart/CART-142-TC-01.spec.ts` with the
six required parts: imports from `@playwright/test`,
`test.describe('CART-142 — Add to cart', ...)`, Arrange comment,
Act steps annotated `// Step 1` / `// Step 2`, Assert block with
`expect(...).toHaveText('1')` and `expect(...).toBeVisible()`, and the
hand-off footer naming `assertion-quality-reviewer`,
`e2e-selector-quality-critic`, and `ai-test-shallow-coverage-critic`.
Each unconfirmed selector carries an inline `TODO` comment (the
"Add to cart button" → `getByRole('button', { name: 'Add to cart' })
/* TODO: confirm */` pattern). The scaffold is NOT executed; the
hand-off makes "run once" the human's first step.

**Pass condition:** Output contains the literal string `getByRole` AND
`TODO` AND `import { test, expect } from '@playwright/test'`. Output
contains the hand-off mentions `assertion-quality-reviewer` AND
`e2e-selector-quality-critic`. Output does NOT contain
`expect(true).toBe(true)` (the rejected "passing smoke assertion"
anti-pattern). Output contains exactly one `test(` / `it(` block (one
test per test-case row).

## Eval 2 — branch — Cypress scaffold for the same test case

**Input:**

```
Scaffold an E2E test from this test-case row.

Framework: cypress
Target URL: https://staging.acme.local

| ID | Title | Tier | Precondition | Steps | Expected |
|---|---|---|---|---|---|
| CART-142-TC-01 | Adds an in-stock product to an empty cart | smoke | Anonymous session; `SKU-001` in stock | 1. Open product page for `SKU-001`. 2. Add to cart with default qty. | Cart count = 1; product line shows `SKU-001`. |

Project conventions: cypress.config.js present; @testing-library/cypress
is installed in devDependencies. cypress version: ^13.6.0.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Step 1 detects Cypress `^13.6.0` and the presence of
`@testing-library/cypress`. Step 2 maps to the Cypress wrapper
`it('<title>', () => …)` with `cy.findByRole(...)` (since Testing
Library is installed) and the `cy.get(...).should('have.text', …)`
assertion style. Step 3 emits a scaffold at
`cypress/e2e/cart/CART-142-TC-01.cy.ts` (or equivalent Cypress path)
with `describe('CART-142 — Add to cart', () => { it('...', () => { ...
}) })`, `cy.visit('/product/SKU-001')`, `cy.findByRole('button',
{ name: 'Add to cart' }).click() /* TODO: confirm */`,
`cy.findByTestId('cart-count').should('have.text', '1')`, plus the
hand-off footer. The Playwright `import { test, expect } from
'@playwright/test'` line MUST NOT appear (wrong-branch failure if it
does).

**Pass condition:** Output contains the literal string `cy.` (any
Cypress chain) AND `it(` AND `findByRole` (Testing Library priority).
Output contains the hand-off mention of
`assertion-quality-reviewer`. Output does NOT contain
`import { test, expect } from '@playwright/test'` (Playwright import —
wrong-branch failure). Output does NOT contain `page.getByRole`
(Playwright locator — wrong-branch failure).

## Eval 3 — adversarial — test-case row with no Expected field (refuse)

**Input:**

```
Scaffold an E2E test from this test-case row.

Framework: playwright
Target URL: https://staging.acme.local

| ID | Title | Tier | Precondition | Steps | Expected |
|---|---|---|---|---|---|
| CART-142-TC-02 | Verifies cart icon updates after add | smoke | Anonymous session | 1. Open product page for `SKU-001`. 2. Add to cart. |  |

(The Expected column is empty — the test case has no assertion target.)
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to scaffold. The agent's refuse rule is
explicit: "Generate a 'passing' smoke assertion (`expect(true).toBe(true)`)
when `Expected` is missing. Halt and request the field." The agent
does NOT emit a populated `expect(...)` block, does NOT generate
`expect(true).toBe(true)` as a placeholder, does NOT silently invent
an Expected from the test Title. It requests the missing Expected
field and pauses scaffolding. The "Anti-patterns" row "Auto-running
the scaffold and reporting 'passes'" reinforces the refusal — a
scaffold without a real Expected would produce false-passing tests.

**Pass condition:** Output asks for the missing Expected field
(contains the word `Expected` framed as a request / clarifying
question — e.g. "the Expected column is empty" or "please supply
Expected"). Output does NOT contain `expect(true).toBe(true)` (the
explicitly-rejected placeholder). Output does NOT contain a full
`tests/cart/CART-142-TC-02.spec.ts` file body with a populated
`expect(...)` assertion block.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (test-case
  table + framework + URL) — no external fixtures, no need to clone
  a sample repo. The CART-142-TC-01 row mirrors the agent's own
  worked example so Step 2's framework-idiom mapping is observable.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Write`, `Edit`, `Grep`, `Glob`,
  `Bash(npx playwright codegen *)`, `Bash(npm test --dry-run *)`)
  writes the scaffold .spec file — eval 3 is observable as the
  absence of a written `.spec.ts` / `.cy.ts` file plus the explicit
  request for the missing Expected field.
- Eval cases were authored 2026-05-26 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
