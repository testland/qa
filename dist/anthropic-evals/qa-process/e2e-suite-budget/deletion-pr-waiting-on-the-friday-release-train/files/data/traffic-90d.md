# Edge traffic, 90 days to 2026-09-08

Pulled for the navigation rework, filtered to the routes PR #884 touches.
"Accounts" is distinct signed-in accounts that hit the route at least once in the
window. "Status mix" is the share of responses by status class.

| Route                     | Requests | Accounts | Status mix                     |
|---------------------------|---------:|---------:|--------------------------------|
| `/checkout/payment`        |  418,330 |   61,204 | 2xx 99.4%                      |
| `/checkout/confirmation`   |  392,004 |   59,880 | 2xx 99.9%                      |
| `/search`                  |  204,881 |   38,117 | 2xx 99.9%                      |
| `/onboarding`              |   14,620 |    9,880 | 2xx 99.8%                      |
| `/promo/seasonal`          |   12,406 |        0 | 404 100%                       |
| `/orders/packing-slip`     |    9,742 |      214 | 302 100% to `/labels/print`    |
| `/checkout/3ds-challenge`  |    6,204 |    5,980 | 2xx 99.6%                      |
| `/referrals/invite`        |    3,118 |        0 | 404 100%                       |
| `/reports/export`          |    2,904 |      731 | 2xx 98.1%                      |
| `/account/privacy`         |      842 |      609 | 2xx 100%                       |
| `/auth/sso`                |       74 |        9 | 2xx 98.6%                      |
| `/auth/sso/callback`       |       71 |        9 | 2xx 97.2%                      |
| `/account/export`          |       41 |       41 | 2xx 100%                       |

Same window, requests split by month. June is from the 11th; September is to the
8th.

| Route                     |    Jun |     Jul |     Aug |    Sep |
|---------------------------|-------:|--------:|--------:|-------:|
| `/checkout/payment`        | 89,400 | 138,900 | 152,030 | 38,000 |
| `/checkout/confirmation`   | 83,600 | 130,200 | 142,704 | 35,500 |
| `/search`                  | 43,900 |  67,800 |  74,181 | 19,000 |
| `/onboarding`              |  3,120 |   4,880 |   5,220 |  1,400 |
| `/promo/seasonal`          |  2,700 |   4,100 |   4,406 |  1,200 |
| `/orders/packing-slip`     |  2,180 |   3,240 |   3,422 |    900 |
| `/checkout/3ds-challenge`  |  1,310 |   2,040 |   2,254 |    600 |
| `/referrals/invite`        |    690 |   1,020 |   1,108 |    300 |
| `/reports/export`          |    620 |     950 |   1,024 |    310 |
| `/account/privacy`         |    181 |     274 |     293 |     94 |
| `/auth/sso`                |      0 |       0 |      31 |     43 |
| `/auth/sso/callback`       |      0 |       0 |      30 |     41 |
| `/account/export`          |      9 |      13 |      14 |      5 |
