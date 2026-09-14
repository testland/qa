# Nightly job history

## storefront-nightly (.lighthouserc.js) - since 2026-03-02

| Month  | Runs | Red | On-call log                                      |
|--------|------|-----|--------------------------------------------------|
| March  | 29   | 3   | hero image regression on /, reverted same night   |
| April  | 30   | 1   | category LCP 2.4s after the filter rewrite        |
| May    | 31   | 2   | product LCP 2.9s, fixed in #4402                  |
| June   | 30   | 0   |                                                   |
| July   | 31   | 2   | category LCP 2.3s twice, no deploy either night   |
| August | 31   | 6   | five of the six fell after 6 August               |

## storefront-staging (.lighthouserc.staging.js) - 2026-04-08 to 2026-05-14

| Month | Runs | Red |
|-------|------|-----|
| April | 23   | 0   |
| May   | 14   | 0   |

Retired on 2026-05-14; the thread in #eng-platform says "it never told us
anything, the nightly against prod catches everything it would have".
