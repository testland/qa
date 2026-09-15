# Data policy reconciliation - billing against network

Four facts decide the outcome: unlimited plan, past the 100 GB threshold, roaming
in the EU, Speed Pass held. Sixteen combinations.

Speed Pass is marked `-` throughout. The note is explicit that it "does not change
what data costs", so it cannot move the outcome and the sixteen combinations
reduce to eight.

| # | unlimited | past 100 GB | roaming EU | Speed Pass | outcome |
|---|---|---|---|---|---|
| 1 | yes | no | no | - | no charge |
| 2 | yes | yes | no | - | no charge |
| 3 | yes | no | yes | - | no charge (domestic rate) |
| 4 | yes | yes | yes | - | EUR 3 per GB above 100 |
| 5 | no | no | no | - | EUR 0.02 per MB outside bundle |
| 6 | no | yes | no | - | EUR 0.02 per MB outside bundle |
| 7 | no | no | yes | - | EUR 0.02 per MB outside bundle (domestic rate) |
| 8 | no | yes | yes | - | EUR 3 per GB above 100 |

**Finding.** I ran the billing service against all eight and it produces exactly
this column. I then read the network team's throttle rule and it keys off the same
100 GB threshold from the same tariff record. The two implementations agree on
every combination. No code change; the roaming question is answered by row 4.

- Owen
