Test-mode payment intents, night of 2026-09-11

41 pairs. One pair reproduced in full below; the other 40 have the same shape.

  pi_3RmT4a2eZvKYlo2C  created 02:14:08  4500 eur  ord_5501  succeeded
    request.idempotency_key = order-ord_5501-attempt-1
  pi_3RmT4h2eZvKYlo2C  created 02:14:13  4500 eur  ord_5501  succeeded
    request.idempotency_key = order-ord_5501-attempt-2

Refund objects from the same night: 78 refunds against 41 intents. None of the
refund requests carried an idempotency key at all.

Reconciliation test `finance/daily-intent-count` for the last fourteen nights:

  fail fail pass fail fail fail pass pass fail fail fail pass fail fail

It compares the count of intents created in the window with the count of orders
in the fixture set, and it started failing the night after the retry wrapper
went in.
