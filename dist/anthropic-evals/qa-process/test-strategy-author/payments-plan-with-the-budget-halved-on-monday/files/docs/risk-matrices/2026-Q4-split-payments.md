# Risk matrix - Split payments v2 (2026-Q4)

**Date:** 2026-09-29   **Owner:** Priya Nandakumar   **Reviewers:** Tom Osei, Lena Brandt
**Scale:** impact 1-5 x likelihood 1-5   **Block threshold:** 15

| ID  | Risk                                                                   | Category   | Impact | Likelihood | Score | Mitigation                                          | Owner            |
|-----|------------------------------------------------------------------------|------------|-------:|-----------:|------:|-----------------------------------------------------|------------------|
| R-1 | Retried charge reuses the idempotency key and captures twice            | Technical  |   5    |     4      |  20   | Idempotency ledger + fault injection on retry        | Tom Osei         |
| R-2 | Three-way split rounding loses a cent on odd totals                     | Business   |   4    |     4      |  16   | Property-based rounding tests + finance UAT          | Lena Brandt      |
| R-3 | Payout released to a seller suspended for sanctions review              | Regulatory |   5    |     3      |  15   | Compliance review + UAT with the sanctions team      | Priya Nandakumar |
| R-8 | Split payout webhook accepted without verifying the provider signature  | Security   |   5    |     3      |  15   | Threat model session + signature verification tests  | Tom Osei         |
| R-4 | Ledger reconciliation drifts across timezone boundaries                 | Technical  |   4    |     3      |  12   | Integration test on the nightly reconcile job        | Tom Osei         |
| R-5 | Split dashboard mislabels the currency on mixed-currency splits         | UX         |   3    |     2      |   6   | Visual regression baseline                            | Lena Brandt      |
| R-7 | Seller onboarding form loses state on browser back                      | UX         |   2    |     2      |   4   | Manual exploratory pass                               | Lena Brandt      |
| R-6 | Payout CSV export changes column order between releases                 | UX         |   1    |     3      |   3   | Snapshot test on the export header                    | Lena Brandt      |

Retired 2026-08-14: R-9 legacy per-seller payout page (page removed in v6.2).
