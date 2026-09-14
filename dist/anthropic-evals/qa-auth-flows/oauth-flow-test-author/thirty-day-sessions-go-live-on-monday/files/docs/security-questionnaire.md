# Pre-launch questionnaire — portal-spa long session (SEC-1184)

Return answered, in writing, before the flag moves off 5%. One line per item
plus the evidence you relied on.

| # | Question |
|---|---|
| 1 | When a refresh token is used, does the client receive a different refresh token back? |
| 2 | If a refresh token that has already been used is presented a second time, is it rejected? |
| 3 | If a refresh token the server never issued is presented, is it rejected? |

We are not asking for a design review and we are not asking what you plan to do
next quarter. We are asking whether these three hold today, against the
configuration that goes to 100% on Monday.

— L. Okafor, Security Engineering, 22 Oct
