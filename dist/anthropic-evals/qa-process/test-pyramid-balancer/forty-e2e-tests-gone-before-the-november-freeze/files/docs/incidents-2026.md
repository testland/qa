# remit - production incidents, 2026 to date

| # | Date  | What broke | Unit tests | Caught by |
|---|-------|------------|------------|-----------|
| 1 | 01-19 | ledger renamed `amount_minor` to `amountMinor` in a draft schema; settlement kept reading the old key and sent 0.00 | all green | end-to-end, in staging |
| 2 | 02-27 | JPY settled as if it had two decimal places; 1999 yen went out as 19.99 | all green | end-to-end, in staging |
| 3 | 03-11 | CSS regression on the statement page | n/a | visual review |
| 4 | 04-02 | idempotency key collided when two entries shared a reference and a posting date | all green | not caught before release; duplicate payout of 38k |
| 5 | 05-30 | webhook replay applied out of order, reversing a reversal | all green | end-to-end, in staging |
| 6 | 06-14 | fx rate 40 minutes stale at the ledger boundary | all green | not caught before release; 1,100 mispriced entries |
| 7 | 07-08 | null pointer in the fee calculator | caught by a unit test before merge | unit |
| 8 | 08-21 | settlement batch cut off mid-window, splitting one payout across two files | all green | end-to-end, in staging |
| 9 | 09-03 | dependency bump broke the PDF renderer | n/a | end-to-end, in staging |
