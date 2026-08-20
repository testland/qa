# Customer incidents, last 30 days (billing only)

| ID       | Opened     | Summary                                                  | Status |
|----------|------------|----------------------------------------------------------|--------|
| INC-2291 | 2026-07-24 | 3 customers report "payment failed" then card charged     | open   |
| INC-2340 | 2026-08-06 | Batch of 11 declined captures, all 18:40–19:20 UTC        | open   |
| INC-2355 | 2026-08-12 | Customer charged twice for one order                      | open   |
| INC-2361 | 2026-08-14 | Checkout error at peak hours, resolved on customer retry   | open   |

Support note on INC-2340: "acquirer returned a timeout; our side surfaced a
generic failure. Volume was ~4% of captures in that window."
