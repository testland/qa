# Billing monolith split - FY27 Q2 migration plan

Four deployables when this is done. Each owns its own datastore; no shared
database, no cross-service SQL, no shared seed.

| Service      | Owns                                   | Datastore          | Cutover     |
|--------------|----------------------------------------|--------------------|-------------|
| billing-api  | accounts, subscriptions, notifications | postgres (existing)| 2026-10-06  |
| invoicing    | invoices, invoice_lines, tax lines     | postgres (new)     | 2026-10-27  |
| ledger       | ledger entries, account balances       | postgres (new)     | 2026-11-17  |
| dunning      | dunning schedules, reminder state      | postgres (new)     | 2026-12-11  |

## Consumer-provider pairs after the split

| # | Consumer     | Provider    | Interface                                  |
|---|--------------|-------------|--------------------------------------------|
| 1 | billing-api  | invoicing   | POST /invoices                              |
| 2 | billing-api  | ledger      | GET /accounts/{id}/balance                  |
| 3 | invoicing    | ledger      | POST /ledger/entries                        |
| 4 | invoicing    | billing-api | GET /subscriptions/{id}                     |
| 5 | dunning      | invoicing   | GET /invoices?status=overdue                |
| 6 | dunning      | billing-api | POST /notifications                         |

There is no message bus in scope; every pair above is synchronous HTTP.
