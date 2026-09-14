# Production release log (maintained by hand by the platform team)

| Date       | Service        | Version | Note                                       |
|------------|----------------|---------|--------------------------------------------|
| 2026-06-02 | refunds-worker | 6d10b4e | idempotency keys                           |
| 2026-07-30 | payments-api   | 7b2d914 | fee rounding                               |
| 2026-08-27 | checkout-web   | a91f3c2 | checkout rewrite - current                 |
| 2026-09-01 | payments-api   | 3c0ab41 | webhook signature rotation                 |
| 2026-09-09 | payments-api   | 9c22f10 | ledger batching - smoke failed, rolled back to 3c0ab41 at 15:10 the same day |
| 2026-09-12 | payments-api   | e55c108 | webhook retry fix - current                |

`checkout-web` ships from its own repository on a weekly train; next window
Wednesday 2026-09-17. `refunds-worker` has not shipped since June.
