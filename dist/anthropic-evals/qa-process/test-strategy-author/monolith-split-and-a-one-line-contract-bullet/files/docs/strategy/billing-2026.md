# Test Strategy - Billing

**Author:** Haruki Sato   **Date:** 2026-02-11
**Status:** Approved
**Stakeholders:** Engineering, Product, QA, Finance

## 1. Scope

### In scope
- Invoicing, dunning, ledger posting, tax, statement export.

### Out of scope
- Payment capture (Payments team).
- Revenue recognition reporting (Finance's own tooling).

### Assumptions
- Billing is one deployable against one database.

## 2. Risk basis

Per docs/risk-matrices/2026-Q1-billing.md:

| Risk class | Top risks                                    | Test investment          |
|------------|----------------------------------------------|--------------------------|
| Business    | Tax rounding, proration on mid-cycle changes | Unit + property-based    |
| Technical   | Invoice posting partial writes               | Integration              |
| Regulatory  | Invoice immutability after posting           | Integration + Finance UAT|

## 3. Test types per layer

| Layer        | Coverage target              | Tools          | Owner |
|--------------|------------------------------|----------------|-------|
| Unit          | 80% line                     | node --test    | Devs  |
| Integration   | 60% of module boundaries     | node --test    | Devs  |
| Contract      | n/a - single deployable      | -              | -     |
| E2E           | 7 critical flows             | Playwright     | QA    |
| Performance   | Statement export p95 under 2s| k6             | QA    |

## 4. Tooling

node --test, Playwright, k6.

## 5. Environments

Local docker compose; shared staging; production. Deploys on merge to main.

## 6. Test data

All suites load `db/seed.sql` into the single billing database. `npm run
db:reset` truncates and reloads it before every integration run, and CI starts
one MariaDB container per job. Fixtures reference the seeded identifiers
directly - accounts `acct_1000` to `acct_1099`, invoices `inv_5000` upward - so
a test in any module can assume any other module's rows are present.

## 7. Exit criteria

Release ships when:

- All acceptance criteria pass.
- Unit and integration suites green.
- The 7 E2E critical flows green.
- Statement export p95 under 2s.
- No posting defect open at severity 2 or above.

## 8. Ownership

| Activity               | Owner       | Backup      |
|------------------------|-------------|-------------|
| Unit test review        | Devs        | Tech lead   |
| Integration suite       | Devs        | QA          |
| E2E suite maintenance   | QA          | Dev TPM     |
| Perf budget approval    | SRE         | QA          |

## 9. Cadence

- Per-PR: lint, unit, integration.
- Per-merge to main: full E2E, perf gate.
- Quarterly: re-review this document.

## 10. Risk register snapshot

Top rows as of 2026-02-11.

## 11. Open questions

- None outstanding at approval.

## Approval

- [x] Engineering manager
- [x] QA lead
- [x] Product manager
