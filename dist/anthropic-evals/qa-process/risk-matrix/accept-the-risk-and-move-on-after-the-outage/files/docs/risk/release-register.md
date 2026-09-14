# Release risk register - orders platform

**Owner:** Priyanka Raghunathan (QA lead)
**Reviewers:** Dov Aarons (Head of Engineering), Ingrid Sollberger (CTO)
**Cadence:** weekly during a release train
**Escalation:** score 15-19 to the Head of Engineering; score 20-25 to the CTO, recorded in the review log

Scale: impact 1-5 by likelihood 1-5. Block threshold 15.

## Active

| ID   | Risk                                                   | Category    | Impact | Likelihood | Score | Strategy  | Mitigation                          | Owner       | Last review |
|------|--------------------------------------------------------|-------------|-------:|-----------:|------:|-----------|-------------------------------------|-------------|-------------|
| R-001| Checkout totals disagree with the invoice PDF          | Business    |   5    |     3      |  15   | Mitigate  | Golden-file tests on invoice render | Priyanka    | 2026-03-11  |
| R-002| Inventory oversell during flash sales                  | Business    |   4    |     4      |  16   | Mitigate  | Reservation lock plus soak test     | Halim       | 2026-03-11  |
| R-005| Address validation rejects valid Irish Eircodes         | UX          |   2    |     3      |   6   | Accept    | See decision note                   | Halim       | 2026-03-11  |
| R-006| Refund issued twice on a retried cancellation           | Business    |   5    |     2      |  10   | Mitigate  | Idempotency key on refund           | Priyanka    | 2026-03-11  |
| R-008| Search index lags catalogue by over an hour             | Technical   |   3    |     3      |   9   | Mitigate  | Lag alert at 20 minutes             | Nils        | 2026-03-11  |
| R-010| Carrier rate API deprecates v2 in Q4                   | Integration |   4    |     3      |  12   | Mitigate  | Migrate to v3 in Q3                 | Nils        | 2026-03-11  |
| R-012| GDPR erasure misses order attachments                  | Regulatory  |   4    |     2      |   8   | Mitigate  | Attachment sweep in erasure job     | Priyanka    | 2026-03-11  |
| R-015| Guest checkout session lost on network change          | UX          |   3    |     3      |   9   | Mitigate  | Session handoff on reconnect        | Halim       | 2026-03-11  |
| R-017| Promo code brute force on the public endpoint          | Security    |   4    |     3      |  12   | Mitigate  | Rate limit plus lockout             | Nils        | 2026-03-11  |

## Mitigated

Rows move here once the mitigation has shipped. They stay for one year, then retire.

| ID   | Risk                                                   | Impact | Likelihood | Score | Mitigation that shipped               | Shipped in | Moved here  |
|------|--------------------------------------------------------|-------:|-----------:|------:|---------------------------------------|------------|-------------|
| R-003| Payment provider callback delivery failure not retried |   4    |     4      |  16   | Retry with backoff plus dead-letter queue | v4.2   | 2026-03-11  |
| R-004| Tax rate cache serves stale rates after a rate change  |   4    |     3      |  12   | Cache bust on rate publish            | v4.0       | 2026-02-04  |
| R-007| Order confirmation email sent before payment capture   |   3    |     3      |   9   | Reordered the capture step            | v3.9       | 2026-01-21  |

## Retired

| ID   | Risk                                    | Retired    | Why                             |
|------|-----------------------------------------|------------|---------------------------------|
| R-009| Legacy PayPal Express flow              | 2026-01-21 | Flow removed in v3.8            |
