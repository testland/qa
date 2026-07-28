# Worked example - "Ledgerly", a B2B invoicing web app

A full walk of the seven-step `test-framework-blueprint` on one product, ending
with the implementation order. The steps themselves are in `SKILL.md`.

**The product:** Ledgerly lets accountants create, send, and reconcile
invoices. Node/Express API + Postgres, React (Vite) frontend, Stripe for
payments, one monorepo, full stack runs locally via Docker Compose. Team of
four: three TypeScript-fluent product engineers, one SDET. No test suite
beyond scattered React unit tests.

**Step 1 - Inventory.** Change shape: 70% of PRs touch the API or API + UI
together; UI-only PRs are rare. External dependency: Stripe. Coverage
decision: API integration layer (primary), thin web E2E for the five critical
journeys (create invoice, send, pay via Stripe redirect, reconcile, export),
unit stays with the packages, contract testing deferred (one team owns both
sides).

**Step 2 - Runner.** Team language is TypeScript; one runner can cover both
chosen layers, so Playwright Test takes the API tier (built-in `request`
fixture, isolated per test per the
[test-fixtures docs](https://playwright.dev/docs/test-fixtures)) and the E2E
tier. Rejected: Cypress (would still need a second runner for the API tier),
Jest + supertest (second runner for E2E).

**Step 3 - Layout + fixtures.**

```
tests/
  api/
    invoices/
    payments/
  e2e/
    invoicing/
    reconciliation/
  fixtures/
    db.ts
    auth.ts
    stripe-stub.ts
    index.ts
  pages/
  builders/
playwright.config.ts
docs/test-conventions.md
```

Fixture list (the blueprint's core table):

| Fixture | Scope | Provides | Mutated by tests? |
|---|---|---|---|
| `workerDb` | worker | Database-per-worker (`ledgerly_test_w${workerIndex}`), migrated once per worker | yes, via test-scoped children |
| `seededAccount` | test | One fresh accountant account + org in the worker DB | yes |
| `authedPage` | test | `page` logged in as `seededAccount` | yes |
| `api` | test | `request` context pre-authenticated against the API | yes |
| `stripeStub` | worker, `auto: true` | Asserts the Stripe stub container is up; fails fast if a test would hit real Stripe | no |

`db.ts`, `auth.ts`, and `stripe-stub.ts` are separate `test.extend()` modules
combined with `mergeTests()` into `fixtures/index.ts`, per the
[test-fixtures docs](https://playwright.dev/docs/test-fixtures).

**Step 4 - Object model.** POM + Component Objects: the SUT is a React SPA
with page-shaped flows and a shared nav/sidebar, suite projected well under
200 tests, so Screenplay overhead is not justified per the selection matrix
in `object-model-patterns`. App Actions
rejected (not Cypress; no exposed store API). POM construction is deferred in
the implementation order until ~10 specs exist.

**Step 5 - Data + mocking.** Seed: empty DB + per-test creation through one
`invoiceBuilder` and one `accountBuilder` (Test Data Builder per
`test-data-patterns` in qa-test-data);
no shared seed set yet. Isolation: database-per-worker
(`test-isolation-patterns` Pattern 4b)
because invoice tests are mutation-heavy. Dependencies: Postgres real (in
compose), Stripe stubbed by a stub container in `docker-compose.test.yml`
(stub tooling chosen per the detected runtime),
email captured by a local SMTP sink.

**Step 6 - CI matrix.** Reporters per the
[test-reporters docs](https://playwright.dev/docs/test-reporters):
`junit` + `blob` on CI, `html` locally.

| Trigger | Suite | Shards | Retry |
|---|---|---|---|
| Per-PR | `tests/api` + `tests/e2e/invoicing` (smoke) | none (est. < 5 min) | 0 |
| Merge to main | full `tests/` | none until runtime > 10 min, then 2-4 per `ci-test-job-conventions` §1 | 1 on runner failure only |
| Nightly | full `tests/` against staging | as merge | 1, failures auto-filed |

**Step 7 - Conventions + gates.** `docs/test-conventions.md` holds all six
decision outputs above. A test-code critic wired as a PR check on `tests/**`;
a framework-architecture audit scheduled quarterly.

**Implementation order** (each step waits on the previous):

1. Scaffold the harness from the blueprint (stack `react+vite`, runner
   `playwright`).
2. `db.ts` worker fixtures + migrations + one API smoke test.
3. `auth.ts` + `stripe-stub.ts` fixtures; first E2E journey, raw locators.
4. CI: per-PR job with junit output.
5. After ~10 specs: extract `pages/` (POM) and `builders/` where duplication
   actually appeared.
6. Merge-to-main + nightly jobs; revisit sharding only when runtime crosses
   the §1 threshold.
