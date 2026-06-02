---
component: observability-to-test
type: agent
archetype: A2
---

# observability-to-test - evals

Companion eval cases for [`observability-to-test`](../../observability-to-test.md).
Three cases cover happy path (Sentry pure-logic exception → unit test at
the cheapest catching layer + fix), branch (Pact contract failure →
contract regression test instead of unit), and adversarial (incident is
180 days old with no recent reproduction - refuse). Re-run by feeding the
**Input** block as the first user message and checking the agent's
transcript against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates below are the eval-authoring date - each case
is designed to be reproducible against any tier.

## Eval 1 - happy path - Sentry pure-logic bug (unit test layer)

**Input:**

```
Convert this production incident into a regression test + PR.

Source: Sentry exception ID `PROJ-42abc`.

Sentry payload (excerpt — pretend the agent already fetched this via
`curl https://sentry.io/api/0/organizations/$ORG/issues/PROJ-42abc/`):

  type:            NullPointerException
  culprit:         Cart.addItem
  location:        src/checkout/cart.ts:42
  message:         "Cannot read properties of null (reading 'qty')"
  trigger input:   { sku: 'BOOK-001', qty: -1 }
  release:         v2.14.3
  first seen:      2026-05-22 14:08 UTC (4 days ago)
  events:          47 in the last 24h
  resolved:        no

Existing test inventory:
  tests/checkout/cart.unit.spec.ts        present (covers Cart.addItem positive path)
  tests/checkout/cart.integration.spec.ts present (covers Stripe flow)
  tests/e2e/checkout.spec.ts              present (full purchase flow)

There is no existing test for the negative-qty / null-qty inputs.

Code under test: src/checkout/cart.ts — Cart.addItem currently does NOT
validate `qty > 0`.

Postmortem: docs/postmortems/2026-05-22-cart-npe.md — present.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1: agent reads the Sentry payload and extracts trigger
input `{ sku: 'BOOK-001', qty: -1 }`, location `src/checkout/cart.ts:42`,
release `v2.14.3`, frequency 47/day. Step 2 classifies as **Pure-logic
bug** (specific input → wrong output; no infra involved) → **unit** test
layer per the Step 2 table. Step 3 proposes a Jest unit test in
`tests/checkout/cart.unit.spec.ts` (NOT a Playwright E2E, NOT an
integration test - those would violate the layer-down rule). The test
pins the EXACT failing input (`{ sku: 'BOOK-001', qty: -1 }`) and uses
`toThrow` with a specific message. Step 3 also pairs the test with a
fix in `src/checkout/cart.ts` validating `qty > 0`. Step 4: PR body has
the 5 named sections (Production signal, Class, Proposed regression
test, Proposed fix, Verification) AND appends a "Prevention - 
regression test added" section to `docs/postmortems/2026-05-22-cart-npe.md`.

**Pass condition:** Output contains the literal strings `unit` (test
layer) AND `src/checkout/cart` AND `qty` (the failing input dimension)
AND `Pure-logic bug` (the classification - case-sensitive). Output
proposes a test under `tests/checkout/cart.unit.spec.ts` or
`src/checkout/cart.spec.ts` - NOT under `tests/e2e/` or
`tests/integration/`. Output proposes a fix in `src/checkout/cart.ts`
that validates `qty` is positive (substring `qty > 0` OR
`Quantity must be positive` OR `qty <= 0`). Output mentions appending
to `docs/postmortems/2026-05-22-cart-npe.md`.

## Eval 2 - branch - Pact contract failure (contract test layer)

**Input:**

```
Convert this production incident into a regression test + PR.

Source: Datadog incident ID `INC-2026-05-24-payments-002`.

Datadog payload (excerpt — pretend the agent already fetched this via
`curl https://api.datadoghq.com/api/v1/incidents/INC-2026-05-24-payments-002`):

  title:           "Payments API: schema mismatch from provider"
  service:         payments-api
  trace:           consumer expected { amount: number, currency: string }
                   provider returned   { amount: number, currency_code: string }
  failure point:   POST /v1/charges response body
  release:         payments-api@v3.7.1 (provider); checkout-svc@v2.18.0 (consumer)
  first seen:      2026-05-23 09:14 UTC (3 days ago)
  events:          312 in the last 24h
  resolved:        no

Existing test inventory:
  tests/contract/payments.pact.spec.ts       present (Pact consumer test, but DOES NOT
                                                       cover the `currency` field — only `amount`)
  tests/integration/payments.spec.ts         present
  tests/e2e/checkout.spec.ts                 present

Code under test: the Pact consumer expectation in
`tests/contract/payments.pact.spec.ts` — currently the consumer asserts
`amount` but not the `currency` / `currency_code` shape.

Postmortem: docs/postmortems/2026-05-23-payments-schema-drift.md — present.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 classifies as **Contract bug** (consumer expected
schema X; provider returned schema Y) → **Contract** test layer per
the Step 2 table. Step 3 emits a Pact regression - extends
`tests/contract/payments.pact.spec.ts` to assert the `currency` field
shape (per the `pact-contract-testing` skill reference) - NOT a Jest
unit test against a domain object, NOT a Playwright E2E. Output names
`pact-contract-testing` (or `schemathesis-fuzzing` as the body
mentions for the API fuzz alternative) as the framework for the
regression assertion. The fix is in whichever side owns the schema
drift (consumer-side stub update OR provider-side response shape
correction); the agent pairs test + fix.

**Pass condition:** Output contains the literal string `Contract bug`
(case-sensitive - the Step 2 classification name). Output references
`tests/contract/payments.pact.spec.ts` OR the `pact-contract-testing`
skill (substring `pact-contract-testing` OR `pact`). Output does NOT
propose a Jest unit test as the primary regression (no
`tests/*.unit.spec.ts` path under `src/checkout/` etc.). Output does
NOT propose an E2E Playwright test as the primary regression layer.
Output mentions both `currency` AND `currency_code` (the two competing
shapes).

## Eval 3 - adversarial - incident older than 90 days, no recent repro (refuse)

**Input:**

```
Convert this production incident into a regression test + PR.

Source: Sentry exception ID `OLD-99xy`.

Sentry payload:
  type:           TypeError
  culprit:        legacy/promo-engine.ts:312
  message:        "promo.expiresAt.toISOString is not a function"
  trigger input:  (no longer reproducible — the promo record format
                  changed in a 2026-01 migration)
  release:        v1.9.2
  first seen:     2025-11-04 (203 days ago)
  events:         0 in the last 90 days
  resolved:       yes (auto-closed Sentry rule: no events for 90 days)

The legacy promo engine has since been rewritten in `src/promo/v2/*`
(a different module). The agent will not be able to reproduce against
the current codebase.

There is no recent reproduction; no one has triaged this exception
since 2026-02.

Postmortem: none (the incident pre-dated postmortem practice).
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the Refuse-to-proceed rule ("Operate on incidents
older than 90 days without a recent reproduction (system likely
changed)") and the surrounding context (auto-resolved Sentry rule,
module rewritten, 203 days old), the agent refuses to generate a
regression test. Output does NOT propose a test in `legacy/` or
`src/promo/v2/`. Output does NOT propose a fix to a module that no
longer exists. Output explains the refusal (incident age + lack of
recent reproduction + module rewrite) and recommends either (a)
reproducing on the current codebase first and re-invoking, or (b)
closing the report as stale without a regression test.

**Pass condition:** Output contains at least one of `90 days` /
`older than 90` / `203 days` / `stale` (the age signal). Output
contains at least one of `refuse` / `refusing` / `not generate` /
`won't generate` / `cannot generate`. Output does NOT propose a Jest
test under `legacy/` or `src/promo/v2/`. Output does NOT contain
`### Proposed regression test` followed by a code block (no proposed
test artefact).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks. The Sentry /
  Datadog payloads are inlined so the eval is deterministic - the
  agent does not actually need to hit the Sentry / Datadog API.
- Pass conditions are literal-string checks against the agent's
  transcript; a reviewer can grep for each substring (`Pure-logic bug`,
  `Contract bug`, `pact`, `90 days`).
- The agent's tool surface (`Read`, `Write`, `Edit`, `Grep`, `Glob`,
  `Bash(gh issue view *)`, `Bash(curl *)`, `Bash(jq *)`) lets it
  fetch incident payloads and write PR bodies, but Bash invocations
  are scoped. Eval re-runs cannot push commits or open real PRs
  because the surface stops at file writes.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
