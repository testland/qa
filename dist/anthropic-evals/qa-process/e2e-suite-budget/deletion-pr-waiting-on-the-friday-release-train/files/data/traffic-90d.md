# Edge traffic, 90 days to 2026-09-08

Pulled for the navigation rework, filtered to the routes PR #884 touches.
"Accounts" is distinct signed-in accounts that hit the route at least once in
the window. "Status mix" is the share of responses by status class.

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

Notes on the pull:

- Anything under 100 requests in a 90-day window is below the line we treat as
  effectively unused, and we do not build for it.
- `/auth/sso` and `/auth/sso/callback` have no traffic at all before
  2026-08-19 and do not appear in the equivalent pull for the previous quarter.
- Every account that hit `/account/export` hit it exactly once.
- `/orders/packing-slip` and `/promo/seasonal` are the two highest-volume
  routes in this pull that never return a 2xx.
