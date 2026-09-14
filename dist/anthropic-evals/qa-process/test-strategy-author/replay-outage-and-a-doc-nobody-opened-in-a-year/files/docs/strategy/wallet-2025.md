# Test Strategy - Wallet

**Author:** Kadia Owusu   **Date:** 2025-06-30
**Status:** Approved
**Stakeholders:** Engineering, Product, QA, Finance

## 1. Scope

### In scope
- Wallet balance, credits, debits, holds, statement export.
- Settlement callbacks from the payment provider.

### Out of scope
- Card issuing (separate team).
- FX conversion, not yet built.

### Assumptions
- The provider delivers each settlement callback exactly once.

## 2. Risk basis

Per docs/risk-matrices/2026-Q3-wallet.md:

| Risk class  | Top risks                                      | Test investment           |
|-------------|------------------------------------------------|---------------------------|
| Business     | Balance drift on concurrent debits             | Unit + property-based     |
| Technical    | Provider callback delivery                      | Integration               |
| Regulatory   | Statement accuracy for the annual audit         | Finance UAT               |
| Performance  | Statement export on large wallets               | Load                      |

## 3. Test types per layer

| Layer        | Coverage target       | Tools            | Owner |
|--------------|-----------------------|------------------|-------|
| Unit          | 80% line              | node --test      | Devs  |
| Integration   | 60% of boundaries     | Testcontainers   | Devs  |
| E2E           | 6 critical flows      | Playwright       | QA    |
| Performance   | Statement export p95  | k6               | QA    |

## 4. Tooling

node --test, Testcontainers, Playwright, k6.

## 5. Environments

Local dev, shared staging, production. No canary on wallet.

## 6. Test data

Synthetic wallets seeded per test; no production data in lower environments.

## 7. Exit criteria

Release ships when:

- All acceptance criteria pass.
- Unit and integration suites green.
- The 6 E2E critical flows green.
- Statement export p95 under 2s for a 10k-line wallet.
- Finance is happy with the statement output.
- No known blocking issues.

## 8. Ownership

| Activity                | Owner          | Backup         |
|-------------------------|----------------|----------------|
| Unit test review         | Kadia Owusu    | Sam Prentice   |
| E2E suite maintenance    | Sam Prentice   | Kadia Owusu    |
| Perf budget approval     | SRE            | Kadia Owusu    |
| Risk register updates    | Kadia Owusu    | Product        |

## 9. Cadence

- Per-PR: lint, unit, integration.
- Per-merge to main: full E2E.
- Nightly: full regression.

## 10. Risk register snapshot

Top rows as of 2025-06-30.

## 11. Open questions

- None outstanding at approval.

## Approval

- [x] Engineering manager
- [x] QA lead
- [x] Product manager
