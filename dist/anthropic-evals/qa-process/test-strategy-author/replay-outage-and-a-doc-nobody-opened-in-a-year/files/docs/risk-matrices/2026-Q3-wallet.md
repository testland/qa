# Risk matrix - Wallet (2026-Q3)

**Date:** 2026-07-02   **Owner:** Rafa Ibanez   **Block threshold:** 15

| ID  | Risk                                                    | Category   | Impact | Likelihood | Score | Owner       |
|-----|---------------------------------------------------------|------------|-------:|-----------:|------:|-------------|
| W-1 | Balance drifts when two debits land in the same tick      | Business   |   4    |     3      |  12   | Rafa Ibanez |
| W-2 | Statement export times out on wallets over 50k lines      | Performance|   3    |     3      |   9   | Rafa Ibanez |
| W-3 | Hold released before the merchant capture arrives         | Technical  |   4    |     2      |   8   | Nina Braga  |
| W-4 | Statement rounding disagrees with the provider's figures  | Regulatory |   4    |     2      |   8   | Rafa Ibanez |

No row covers replayed or duplicated provider callbacks.
