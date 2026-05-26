---
component: framework-architecture-auditor
type: agent
archetype: A3
---

# framework-architecture-auditor — evals

Companion eval cases for [`framework-architecture-auditor`](../../framework-architecture-auditor.md).
Three cases cover happy path / branch / adversarial: a Playwright framework
with deep POM hierarchy + hardcoded sleeps producing FAIL verdicts on
multiple axes, a healthy framework with all-PASS axes, and a single-file
"framework" that triggers the refuse-to-proceed corpus-minimum rule.
Re-run by pasting the **Input** block as the first user message and
checking the agent's output against the **Pass condition**.

## Eval 1 — happy path — deep hierarchy + hardcoded sleeps (FAIL on §A2 + §A6)

**Input:**

```
Audit our test framework architecture. Here is the inventory the
orchestrator collected for you:

package.json:
  devDependencies:
    "@playwright/test": "1.49.0"
    typescript: "5.4.0"

Test directory: tests/

Inventory (from `find tests -type f ...`):
  tests/ — 312 test files (*.spec.ts)
  tests/pages/ — 38 Page Object files
  tests/fixtures/ — 14 fixture files
  tests/helpers/ — 47 helper files
  CI: .github/workflows/e2e.yml (parallel sharded 4-way, retries: 1, traces on first retry)

POM hierarchy graph (from walking `extends` clauses):
  BasePage (tests/pages/BasePage.ts)
    ↑ extends
  EcommercePage (tests/pages/EcommercePage.ts)  — adds: header, footer, navMenu
    ↑ extends
  CartFlowPage (tests/pages/CartFlowPage.ts)  — adds: minicart, cartIcon
    ↑ extends
  CheckoutPage (tests/pages/CheckoutPage.ts)  — adds: shippingForm, paymentForm

Hardcoded sleeps found by grep (`page.waitForTimeout` / `cy.wait`):
  tests/e2e/cart/checkout.spec.ts:47   — `await page.waitForTimeout(2000);`
  tests/e2e/cart/checkout.spec.ts:89   — `await page.waitForTimeout(5000);`
  tests/e2e/auth/login.spec.ts:23      — `await page.waitForTimeout(3000);`
  (... 15 more instances across 7 files — 18 total)

Naming convention scan: 78% *.spec.ts, 15% *.test.ts, 7% *_test.ts.

POM coverage rate: 76% (tests using POMs vs inline selectors).

Conventions doc: docs/test-conventions.md exists; says "always use
getByRole" — measured codebase usage: 61%.

Helper call-site analysis (90-day git log):
  47 helpers total; 11 called from <2 files in the window.

Fixture scope analysis: all fixtures per-test or per-describe; no
globalSetup hub detected.

Audit scope: full.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 detects Playwright from package.json. Step 2 walks
all 8 axes and assigns: §A1 POM consistency = WARN (76% coverage, below
the 90% floor); §A2 base-class hierarchy depth = FAIL (depth 4:
CheckoutPage → CartFlowPage → EcommercePage → BasePage); §A3 fixture
coupling = PASS; §A4 helper sprawl = WARN (1:6.6 ratio, 11 dead
candidates); §A5 naming drift = WARN (3 file conventions); §A6
retry / wait = FAIL (18 hardcoded sleeps, cites
`flake-pattern-reference`); §A7 convention drift = WARN (61% vs the
"always getByRole" rule); §A8 CI integration = PASS. Step 3 emits a
ranked Recommendations section putting §A6 and §A2 at the top by
blast-radius. Output cites Fowler's Page Object definition for §A1 and
the TestDino 2026 flake benchmark for §A6.

**Pass condition:** Output contains the literal string `FAIL` AND
at least two of `§A2` / `§A6` / `depth 4` / `hardcoded sleep` /
`waitForTimeout`. Output does NOT issue a top-line PASS verdict for
the suite.

## Eval 2 — branch — healthy framework (all axes PASS or WARN-only)

**Input:**

```
Audit our test framework architecture.

package.json:
  devDependencies:
    "@playwright/test": "1.49.0"

Inventory:
  tests/ — 180 test files (*.spec.ts, single convention)
  tests/pages/ — 22 Page Object files
  tests/fixtures/ — 6 fixture files
  tests/helpers/ — 12 helper files
  CI: .github/workflows/e2e.yml (parallel sharded 4-way, retries: 1,
      traces on first retry, secrets via GitHub Actions, JUnit XML output)

POM hierarchy: BasePage ← *Page (depth 2 maximum across all 22 POMs).
POM coverage rate: 94%.
POM purity: 0 POMs contain `expect(` / `.toBe` / `should(`.

Hardcoded sleeps found by grep: 0 instances of `page.waitForTimeout` /
`cy.wait` across the entire tests/ tree.

Naming convention scan: 100% *.spec.ts.

Wait-timeout consistency: all explicit timeouts use the framework
default; no per-file overrides.

Conventions doc: docs/test-conventions.md exists; says "always use
getByRole" — measured codebase usage: 96%.

Helper call-site analysis (90-day git log):
  12 helpers total; all called from ≥2 files in the window.

Fixture scope: all per-test (`test.use({ ... })`).

Audit scope: full.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 assigns PASS to every axis: §A1 (94% POM
coverage, 0 impure POMs), §A2 (depth 2), §A3 (per-test fixtures only),
§A4 (1:15 ratio, 0 dead candidates), §A5 (single naming convention),
§A6 (0 hardcoded sleeps, consistent timeouts), §A7 (96% vs the 80%
threshold), §A8 (all CI patterns present). The Recommendations section
is either empty or contains only keep-the-current-state items. No
verdict line reads FAIL.

**Pass condition:** Output contains the literal string `PASS` AND does
NOT contain `FAIL` on any axis row. The Recommendations section does
NOT call for a refactor / hierarchy collapse / sleep removal as a top-3
item.

## Eval 3 — adversarial — refuse on single-file framework

**Input:**

```
Audit our test framework architecture. We're a small startup, here is
everything we have:

package.json:
  devDependencies:
    "@playwright/test": "1.49.0"

Inventory:
  tests/ — 4 test files (*.spec.ts)
  tests/pages/ — 1 Page Object file (LoginPage.ts)
  tests/fixtures/ — 0 files
  tests/helpers/ — 0 files
  CI: none

POM hierarchy: LoginPage → BasePage (1 chain, depth 2).
POM coverage rate: 100% (the 4 tests all import LoginPage).
Hardcoded sleeps: 0.

Audit scope: full.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the Refuse-to-proceed rule "Operate on a 'test
framework' of one file. Cross-file pattern detection requires a
corpus — minimum 10 test files, 3 POMs," the agent refuses to issue
the 8-axis audit. The input has 4 test files (below the 10-file floor)
and 1 POM (below the 3-POM floor). The agent emits the corpus-minimum
refusal, names the thresholds, and does NOT emit a per-axis verdict
table with WARN / FAIL / PASS rows for §A1-§A8.

**Pass condition:** Output contains one of `minimum 10 test files` /
`corpus` / `too small` / `not a corpus` / `cross-file pattern detection`
(case-insensitive) AND does NOT contain a per-axis verdict for §A2
(`depth`) or §A6 (`hardcoded sleep` / `retry / wait`). The agent must
not claim to audit a one-POM, four-test framework — that is the entire
adversarial point of the eval.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (the orchestrator
  pre-collects the inventory the agent's Step 1 bash commands would
  otherwise build). No external fixtures, no need to clone a sample
  repo.
- Pass conditions are literal-substring checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
