---
component: risk-based-test-selector
type: agent
---

# risk-based-test-selector - evals

Companion eval cases for [`risk-based-test-selector`](../../risk-based-test-selector.md).
Three cases cover happy path (PR touches matrix-mapped paths → stack-ranked
selection emitted), branch (PR touches a different risk cluster → different
test files selected), and adversarial (non-trivial change but zero risks
implicated - refuse to recommend, defer to coverage-based). Re-run by
feeding the **Input** block as the first user message and checking the
agent's transcript against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates below are the eval-authoring date - each case
is designed to be reproducible against any tier.

## Eval 1 - happy path - Stripe + promo change

**Input:**

```
Select tests for this PR.

PR diff (`git diff --name-only origin/main...HEAD`):

  src/checkout/promo/calculator.ts
  src/checkout/promo/calculator.spec.ts
  src/payments/stripe-webhook.ts
  src/payments/stripe-webhook.spec.ts
  README.md

Risk matrix (`docs/risk-matrix.yaml` — 23 risks total; relevant excerpt):

  R-1   Promo discount math       score=15   source_paths=["src/checkout/promo/*"]
  R-2   Stripe webhook delivery   score=16   source_paths=["src/payments/stripe-webhook.ts"]
  R-3   EU tax calc               score=10   source_paths=["src/tax/eu-vat.ts"]
  R-7   A11y on promo banner      score=6    source_paths=["src/checkout/promo/banner.tsx"]
  R-15  Old CMS migration         score=3    source_paths=["src/legacy-cms/*"]

Risk-test mapping (`.matrix/risk-test-mapping.yaml`):

  R-1: test_paths: ["tests/checkout/promo*.spec.ts", "tests/checkout/discount-math.spec.ts"]
  R-2: test_paths: ["tests/integration/stripe-webhook*.spec.ts", "tests/chaos/stripe-resilience.spec.ts"]
  R-3: test_paths: ["tests/eu-tax/*.spec.ts", "tests/uat/eu-checkout.uat.ts"]
  R-7: test_paths: ["tests/a11y/promo-banner.spec.ts"]
  R-15: test_paths: ["tests/legacy-cms/migration.spec.ts"]
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 2 intersects changes with `source_paths`:
`src/checkout/promo/calculator.ts` hits R-1; `src/payments/stripe-webhook.ts`
hits R-2. R-3 / R-7 / R-15 are NOT implicated (no file in their
`source_paths` was touched). Output stack-ranks R-2 (score 16) above
R-1 (score 15) - descending by score per the agent body. Selection
includes both `tests/integration/stripe-webhook*.spec.ts` AND
`tests/chaos/stripe-resilience.spec.ts` (R-2's mapped tests), plus
`tests/checkout/promo*.spec.ts` AND `tests/checkout/discount-math.spec.ts`
(R-1's mapped tests). Output explicitly notes that R-3, R-7, R-15 were
NOT implicated (so their tests are deferred to periodic full-regression).
Step 5: the agent recommends a selection but does NOT auto-execute.

**Pass condition:** Output stack-ranks `R-2` before `R-1` (R-2 appears
ABOVE R-1 in the ranked list). Output contains all of
`tests/integration/stripe-webhook`, `tests/chaos/stripe-resilience`,
`tests/checkout/promo`, `tests/checkout/discount-math`. Output does NOT
include `tests/eu-tax/`, `tests/a11y/promo-banner.spec.ts`, OR
`tests/legacy-cms/migration.spec.ts` (those risks weren't implicated).
Output does NOT contain the literal `npx jest --run` or any phrasing
indicating the agent itself executed the suite.

## Eval 2 - branch - different risk cluster (EU tax + a11y)

**Input:**

```
Select tests for this PR.

PR diff (`git diff --name-only origin/main...HEAD`):

  src/tax/eu-vat.ts
  src/tax/eu-vat.spec.ts
  src/checkout/promo/banner.tsx
  src/checkout/promo/banner.spec.tsx

Risk matrix (`docs/risk-matrix.yaml`):

  R-1   Promo discount math       score=15   source_paths=["src/checkout/promo/*"]
  R-2   Stripe webhook delivery   score=16   source_paths=["src/payments/stripe-webhook.ts"]
  R-3   EU tax calc               score=10   source_paths=["src/tax/eu-vat.ts"]
  R-7   A11y on promo banner      score=6    source_paths=["src/checkout/promo/banner.tsx"]

Risk-test mapping (`.matrix/risk-test-mapping.yaml`):

  R-1: test_paths: ["tests/checkout/promo*.spec.ts"]
  R-2: test_paths: ["tests/integration/stripe-webhook*.spec.ts"]
  R-3: test_paths: ["tests/eu-tax/*.spec.ts", "tests/uat/eu-checkout.uat.ts"]
  R-7: test_paths: ["tests/a11y/promo-banner.spec.ts"]
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Intersection: `src/tax/eu-vat.ts` → R-3; `src/checkout/promo/banner.tsx`
→ R-1 (via `src/checkout/promo/*`) AND R-7 (via exact file match). R-2
is NOT implicated (no file in `src/payments/` was touched). Stack-rank
descending by score: R-1 (15) → R-3 (10) → R-7 (6). Selection includes
`tests/checkout/promo*.spec.ts`, `tests/eu-tax/*.spec.ts`,
`tests/uat/eu-checkout.uat.ts`, AND `tests/a11y/promo-banner.spec.ts`.
Notably the Stripe webhook tests are NOT selected (the source file
wasn't touched).

**Pass condition:** Output contains all of `R-1`, `R-3`, `R-7` in the
ranked output AND `tests/eu-tax/`, `tests/a11y/promo-banner.spec.ts`,
`tests/uat/eu-checkout.uat.ts`. Output does NOT contain `R-2` as an
implicated risk (R-2 may appear in "not implicated" framing only).
Output does NOT include `tests/integration/stripe-webhook` in the
selected set. Stack ranking has R-1 above R-3 above R-7.

## Eval 3 - adversarial - non-trivial change, 0 risks implicated (refuse)

**Input:**

```
Select tests for this PR.

PR diff (`git diff --name-only origin/main...HEAD`) — 14 files changed:

  src/marketing/landing-page.tsx
  src/marketing/landing-hero.tsx
  src/marketing/landing-footer.tsx
  src/marketing/copy.ts
  src/marketing/analytics.ts
  src/marketing/utm.ts
  src/marketing/og-image.ts
  src/marketing/pricing-section.tsx
  src/marketing/faq-section.tsx
  src/marketing/cta-section.tsx
  src/marketing/testimonials.tsx
  src/marketing/featured-logos.tsx
  src/marketing/styles.css
  src/marketing/robots.ts

Risk matrix (`docs/risk-matrix.yaml`):

  R-1   Promo discount math       source_paths=["src/checkout/promo/*"]
  R-2   Stripe webhook delivery   source_paths=["src/payments/stripe-webhook.ts"]
  R-3   EU tax calc               source_paths=["src/tax/eu-vat.ts"]

(No risk in the matrix references `src/marketing/*`.)
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 2 intersects the 14 changed files with each risk's
`source_paths` - every intersection is empty (no risk lists
`src/marketing/*`). Per Step 5, the agent refuses to recommend a
selection because "0 risks are implicated AND the change is non-trivial
(>10 files)" - both conditions hold (14 files, 0 risks). Output defers
to coverage-based selection per the same Step 5 rule. Output does NOT
emit a "Critical-risk tests" / "High-risk tests" table claiming risk
coverage.

**Pass condition:** Output does NOT contain a markdown table titled
`Critical-risk tests` or `High-risk tests`. Output does NOT name any
of R-1, R-2, R-3 as implicated. Output contains at least one of
`0 risks` / `no risks` / `zero risks` / `not implicated` AND at least
one of `coverage-based` / `regression-suite-selector` / `coverage map`
(the deferred selector). Output does NOT emit a final `npx jest`
selection command treating the 14 marketing files as risk-covered.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no live git
  repo or risk-matrix file required. The diff list + matrix excerpt +
  mapping are inlined.
- Pass conditions are literal-string checks against the transcript;
  a reviewer can grep for each substring (`R-1`, `R-2`,
  `tests/eu-tax/`, `not implicated`).
- The agent's tool surface (`Read`, `Grep`, `Glob`,
  `Bash(git diff *)`, `Bash(npx jest --listTests)`,
  `Bash(pytest --collect-only *)`) is bounded - eval re-runs cannot
  modify the test suite or execute it.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
