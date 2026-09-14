# Test Strategy - Checkout (FY26)

**Author:** Dana Whitfield   **Date:** 2026-01-14
**Status:** Approved
**Stakeholders:** Engineering, Product, QA, Security, Compliance

## 1. Scope

### In scope
- Cart, checkout, payment capture, promotions, tax, receipts, refunds-at-POS.
- Web (desktop + mobile web) and the iOS/Android checkout webview.

### Out of scope
- Marketplace seller payouts (separate strategy, owned by Payments).
- The legacy v4 checkout, frozen and removed 2026-03.

### Assumptions
- Traffic peaks at 4.1k checkouts/min on the Black Friday window.
- The payment provider's sandbox mirrors production behaviour for 3DS.

## 2. Risk basis

Per the release risk matrix at docs/risk-matrices/2026-Q1-checkout.md:

| Risk class  | Top risks                                  | Test investment            |
|-------------|--------------------------------------------|----------------------------|
| Business     | Promo stacking, currency rounding          | Property-based + finance UAT |
| Technical    | Provider webhook loss, DB migration        | Chaos + integration         |
| Regulatory   | EU VAT, PSD2 SCA exemptions                | Compliance review + UAT     |
| Performance  | Checkout latency at peak                   | Load + canary               |
| Security     | Card data handling, PCI scope              | Threat model + annual pen test |

## 3. Test types per layer

| Layer        | Coverage target                      | Tools                        | Owner    |
|--------------|--------------------------------------|------------------------------|----------|
| Unit          | 80% line                             | node --test                  | Devs     |
| Integration   | 60% of service boundaries            | Testcontainers               | Devs     |
| Contract      | 100% of the 9 consumer-provider pairs| Pact broker                  | Devs     |
| E2E           | 10 critical flows                    | Playwright                   | QA       |
| Performance   | p95 < 400ms on POST /checkout at 4k/min | k6 Cloud                  | QA + SRE |
| Security      | OWASP Top 10; annual external pen test | Snyk + third-party pen test| Security |
| A11y          | WCAG 2.2 AA on every checkout step    | axe-core in CI + manual pass | QA       |
| Visual        | 41 baselines across 3 viewports       | Percy                        | QA       |

## 4. Tooling

Pact broker (self-hosted, 9 pairs registered), k6 Cloud (8 seats), Percy,
axe-core CI action, Snyk, Testcontainers, Playwright grid (12 shards).

## 5. Environments

- **Local dev** - per-engineer, Testcontainers backing services.
- **Staging** - shared; smoke + UAT; refreshed nightly from a scrubbed prod dump.
- **Canary** - 5% of production traffic, 30-minute observation window before the
  rollout continues; automatic rollback on error-rate breach.
- **Prod** - synthetic monitors from 4 regions, every 60 seconds.

## 6. Test data

Scrubbed production dump refreshed nightly into staging; synthetic card numbers
per the provider's test-card matrix; PII generator for names and addresses.

## 7. Exit criteria

Release ships when:

- All acceptance criteria for in-scope features pass.
- Unit and integration suites green; no flake in the last 3 main runs.
- All 10 E2E critical flows green.
- Coverage targets in Section 3 met.
- p95 for POST /checkout under 400ms at 4k/min in the load run.
- axe-core CI reports zero new WCAG 2.2 AA violations.
- Threat model reviewed for any change touching card data.
- The QA lead is comfortable that regression coverage is adequate.
- Risk matrix rows scoring 15 or above are all mitigated.

## 8. Ownership

| Activity                 | Owner    | Backup     |
|--------------------------|----------|------------|
| Unit test review          | Devs     | Tech lead  |
| E2E suite maintenance     | QA       | Dev TPM    |
| Perf budget approval      | SRE      | QA         |
| Threat model authorship   | Security | Dev TPM    |
| Synthetic monitors        | SRE      | QA         |
| Risk matrix updates       | QA       | Product    |

## 9. Cadence

- Per-PR: lint, unit, integration, smoke E2E, coverage delta.
- Per-merge to main: full E2E, perf gate.
- Nightly: full regression; mutation testing weekly.
- Pre-release: manual UAT sign-off, full security scan.

## 10. Risk register snapshot

Top 10 rows as of 2026-01-14; see the matrix for the live version.

## 11. Open questions

- None outstanding at approval.

## Approval

- [x] Engineering manager
- [x] QA lead
- [x] Product manager
- [x] Security
