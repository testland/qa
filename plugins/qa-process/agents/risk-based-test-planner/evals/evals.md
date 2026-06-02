---
component: risk-based-test-planner
type: agent
archetype: A2
---

# risk-based-test-planner - evals

Companion eval cases for [`risk-based-test-planner`](../../risk-based-test-planner.md).
Three cases cover happy path (within-budget plan emitted), branch
(different test-type mix because the implicated risks fall into different
classes), and adversarial (no risk matrix supplied - refuse). Re-run by
feeding the **Input** block as the first user message and checking the
agent's transcript against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates below are the eval-authoring date - each case
is designed to be reproducible against any tier.

## Eval 1 - happy path - within-budget plan

**Input:**

```
Plan tests for the feature `Promo banner v2`.

Feature scope:
  - Adds a configurable promo banner above the checkout page.
  - Touches: src/checkout/promo/*, src/payments/stripe-webhook.ts,
    src/tax/eu-vat.ts.
  - Areas: checkout, payments, tax.

Engineer-week budget: 2 engineer-weeks.

Tooling inventory: Jest (unit), Playwright (E2E), k6 (load), axe-core (a11y),
Pact (contract), Schemathesis (fuzz), manual UAT possible with finance.

Risk matrix (`docs/risk-matrix.yaml` excerpt — 23 risks total):

R-1   Promo discount math               class=BusinessLogic     score=15  source_paths=["src/checkout/promo/*"]
R-2   Stripe webhook delivery           class=Technical         score=16  source_paths=["src/payments/stripe-webhook.ts"]
R-3   EU tax calculation                class=Regulatory        score=10  source_paths=["src/tax/eu-vat.ts"]
R-4   Promo banner render perf          class=Performance       score=9   source_paths=["src/checkout/promo/banner.tsx"]
R-7   A11y on promo banner              class=UX                score=6   source_paths=["src/checkout/promo/banner.tsx"]
R-12  Admin promo authoring             class=BusinessLogic/UX  score=4   source_paths=["src/checkout/promo/admin/*"]
R-15  Old promo CMS migration           class=Technical         score=3   source_paths=["src/legacy-cms/*"]
R-19  Email template                    class=UX                score=2   source_paths=["src/emails/*"]
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 names R-1, R-2, R-3, R-4, R-7, R-12 as scope-relevant
(direct path hits) and excludes R-15 / R-19 (no path overlap, different
areas). Step 2 maps each implicated risk to test types per the Step 2
table (R-1 → unit + property-based, R-2 → integration + chaos, R-3 → UAT
with finance, R-4 → load + perf budget, R-7 → a11y + manual review,
R-12 → E2E). Step 3 estimates effort and Step 4 emits a markdown
plan with: a "Risk-driven test investment" table covering all six
implicated risks, total effort within the 2-engineer-week budget (with
~20% headroom per the agent body), and a "Risks NOT addressed" section
naming R-15 and R-19 with rationale.

**Pass condition:** Output contains a markdown table mentioning all of
`R-1`, `R-2`, `R-3`, `R-4`, `R-7`, `R-12` (case-sensitive). Output
contains the substring `Risks NOT addressed` (or `Risks not addressed`
case-insensitive) AND mentions `R-15` AND `R-19` in the skip list.
Output does NOT recommend skipping the highest-scored risk (R-2, score
16) - R-2 MUST appear with at least one test-type assignment.

## Eval 2 - branch - security-heavy feature, different test-type mix

**Input:**

```
Plan tests for the feature `OAuth login + session refresh`.

Feature scope:
  - Adds OAuth login with Google + GitHub IdPs, plus session-refresh
    rotation.
  - Touches: src/auth/oauth/*, src/auth/session.ts, src/api/auth-routes.ts.
  - Areas: auth, sessions, API.

Engineer-week budget: 3 engineer-weeks.

Tooling inventory: Jest (unit), Playwright (E2E), Pact (contract),
ZAP (DAST), Semgrep (SAST), threat-model workshop possible.

Risk matrix (`docs/risk-matrix.yaml` excerpt — 18 risks total):

R-A1  Session-refresh token leak        class=Security          score=20  source_paths=["src/auth/session.ts"]
R-A2  OAuth state CSRF                  class=Security          score=18  source_paths=["src/auth/oauth/*"]
R-A3  Auth API contract drift           class=Integration       score=12  source_paths=["src/api/auth-routes.ts"]
R-A4  Rate-limit bypass on /login       class=Security          score=10  source_paths=["src/api/auth-routes.ts"]
R-A8  IdP availability                  class=Technical         score=7   source_paths=["src/auth/oauth/*"]
R-B1  Marketing CTA                     class=UX                score=2   source_paths=["src/landing/*"]
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 identifies R-A1, R-A2, R-A3, R-A4, R-A8 (path hits
in `src/auth/*` and `src/api/auth-routes.ts`); excludes R-B1. Step 2
maps the three Security-class risks (R-A1, R-A2, R-A4) to
threat-model + SAST + DAST + pen test per the Step 2 mapping table.
R-A3 (Integration) gets contract + canary; R-A8 (Technical) gets
integration + chaos. The plan's test-type mix is dominated by security
work - distinct from Eval 1's UX/perf/regulatory mix. R-A1 (score 20,
Critical) MUST appear with at least threat-model + DAST coverage; the
agent refuses to skip it per Step 5.

**Pass condition:** Output contains all of `R-A1`, `R-A2`, `R-A3`,
`R-A4`, `R-A8` in the investment table. Output references at least
THREE of `threat model` / `SAST` / `DAST` / `pen test` (case-insensitive)
as recommended test types for the Security-class risks. Output does
NOT recommend `load` / `a11y` / `visual regression` as primary coverage
for R-A1 / R-A2 / R-A4 (those test types are wrong-class for security
risks per Step 2).

## Eval 3 - adversarial - no risk matrix supplied (refuse)

**Input:**

```
Plan tests for the feature `Account settings redesign`.

Feature scope:
  - Redesigns the account-settings page.
  - Touches: src/settings/*, src/profile/*.
  - Areas: settings, profile.

Engineer-week budget: 1.5 engineer-weeks.

Tooling inventory: Jest (unit), Playwright (E2E), axe-core (a11y).

Risk matrix: we don't have one yet — just plan reasonable tests for the
feature.
```

**Target models:** sonnet (2026-05-25)

**Expected:** The agent refuses to plan per Step 5 ("The agent refuses
to: plan without a risk matrix") AND per Limitations ("No matrix → no
plan"). Output does NOT emit a "Risk-driven test investment" table.
Output does NOT name specific risks (R-1, R-A1, etc. - there are none).
The agent recommends running [`risk-storming-facilitator`](../skills/risk-storming-facilitator/SKILL.md)
or otherwise populating the risk matrix first, then re-invoking the
planner. The agent may also reference its sibling
[`risk-matrix-recommender`](risk-matrix-recommender.md) as the upstream
component that produces the matrix.

**Pass condition:** Output does NOT contain a markdown table with
`Risk` and `Score` columns. Output does NOT contain a `Risks NOT
addressed` section (there are no risks to address). Output contains at
least one of `risk matrix` / `risk-matrix` / `no matrix` / `without a
matrix` AND at least one of `risk-storming-facilitator` /
`risk-matrix-recommender` (the upstream hand-offs). Output does NOT
emit a final plan with effort totals.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  matrix file or repo clone needed. The matrix excerpt is supplied
  inline (or explicitly absent in Eval 3).
- Pass conditions are literal-string checks against the agent's
  transcript; a reviewer can grep for each substring (e.g. `R-1`,
  `Risks NOT addressed`, `threat model`).
- The agent's tool surface (`Read`, `Write`, `Edit`, `Grep`, `Glob`)
  is read/write to docs only - eval re-runs cannot modify production
  code or execute tests. The plan is a markdown artifact, not a test
  invocation.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
