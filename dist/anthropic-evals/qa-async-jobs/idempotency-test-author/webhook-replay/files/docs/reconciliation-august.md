# August reconciliation - acc_4102

Two numbers are produced for this account each month. The ledger is written when
a payment is applied. `billed_usage_cents` is written at the webhook edge; it was
added in May when usage plans launched.

| provider event_id | deliveries received | ledger credits | amount per event |
|---|---|---|---|
| evt_8801 | 1 | 1 | 2,400 |
| evt_8814 | 3 | 1 | 3,000 |
| evt_8822 | 1 | 1 | 2,000 |
| **total** | **5** | **3** | |

Ledger balance for the month: **7,400**. Billed usage recorded for the month:
**13,400**. The invoice went out on the billed-usage figure.

The delivery count of 5 is what ops reads on the ingest dashboard. It is meant
to count every delivery, redeliveries included, and 5 is the correct value for
August - we did receive five.

Two other accounts show the same shape.
