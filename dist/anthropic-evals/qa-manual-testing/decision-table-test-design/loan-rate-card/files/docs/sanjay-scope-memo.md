# Pricing test scope - rate-card service

The card turns on five facts: score at or above 700, score at or above 780, term
longer than 60 months, current account held, loan of EUR 25,000 or more.

The list is nine applications. A price is only worth testing if a customer can be
quoted it, and since the March credit policy change nothing scoring under 700
comes out of the funnel with a straight offer. The sub-700 lines on the card are
there for historical reasons and price nothing we sell.

| # | score | term | current account | loan | expected APR |
|---|---|---|---|---|---|
| 1 | 720 | 48 | no | EUR 10,000 | 8.4 |
| 2 | 720 | 48 | yes | EUR 10,000 | 8.1 |
| 3 | 720 | 72 | no | EUR 10,000 | 9.2 |
| 4 | 740 | 48 | yes | EUR 30,000 | 7.7 |
| 5 | 740 | 72 | no | EUR 30,000 | 8.8 |
| 6 | 800 | 48 | no | EUR 10,000 | 7.4 |
| 7 | 800 | 48 | yes | EUR 10,000 | 7.1 |
| 8 | 800 | 72 | yes | EUR 30,000 | 7.5 |
| 9 | 800 | 48 | yes | EUR 30,000 | 6.7 |

Nine applications, every adjustment on the card exercised at least once, one day
of QA. - Sanjay
