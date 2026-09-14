# Gate history — last 40 builds, 2026-08-14 to 2026-09-11

| Test                                      | Red at attempt 1 | Red after all attempts | Signature |
|-------------------------------------------|-----------------:|-----------------------:|-----------|
| smoke: search returns results             | 6                | 0                      | click timeout on the search button; passes on attempt 2 every single time |
| smoke: sign in -> add to cart -> checkout | 1                | 1                      | both on build 2026.9.11-a41c0b9 — this one |
| the other nine                            | 0                | 0                      | — |

Notes:

- Commit `a41c0b9` is the only commit in build 2026.9.11-a41c0b9. It is hotfix
  #4471 and it touches one file: `src/payments/authorize.js`, the BIN-range
  branch that decides which processor a card is sent to.
- The same build was deployed to staging by hand at 17:20, before the gate ran.
  `sign in -> add to cart -> checkout` failed there too, with the same
  "Payment declined" message, on a Visa test card.
- `smoke: search returns results` has been doing the attempt-1 timeout since at
  least May. Ticket #3611, owner @discovery (lead @okereke). Untouched this
  quarter.
- Before tonight, the gate has blocked four deploys in 2026. Three of the four
  were real regressions.
