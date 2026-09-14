# orders-api scheduled verification job - Q3 summary

61 runs. 23 red.

| Consumer            | Consumer version / branch     | Red runs | Merged? |
|---------------------|-------------------------------|----------|---------|
| mobile-bff          | spike/offline-queue           | 14       | no      |
| billing-reconciler  | chore/try-decimal-amounts     | 5        | no      |
| warehouse-sync      | feat/pick-wave-v2             | 3        | yes, 2026-08-30 |
| fulfillment-ui      | -                             | 0        | -       |
| mobile-bff          | main                          | 1        | yes, 2026-07-08 |

The 2026-08-30 one is the only red that ever corresponded to a change that shipped.

Deploy comparisons run by consumer teams in the same quarter: 0. Neither
billing-reconciler nor mobile-bff has been able to get a verdict out of the
comparison step since they added it in July; both have it behind an `if: false`.
