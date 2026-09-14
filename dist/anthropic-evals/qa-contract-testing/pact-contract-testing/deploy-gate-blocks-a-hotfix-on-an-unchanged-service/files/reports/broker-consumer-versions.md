# broker.internal - versions on record for the two consumers of payments-api

## checkout-web

| Version | Branch | Published  | Environments            |
|---------|--------|------------|-------------------------|
| d77a01e | main   | 2026-09-10 | staging (2026-09-10)    |
| a91f3c2 | main   | 2026-08-26 | production (2026-08-27) |
| 2a77b01 | main   | 2026-06-18 | -                       |

checkout-web merged their side of the `legacy_id` removal on 2026-09-10 (their
PR #6612, "stop reading charge.legacy_id"). It is on their `main` and it is on
staging. Their production release train runs weekly and the next window is
Wednesday 2026-09-17.

## refunds-worker

| Version | Branch | Published  | Environments            |
|---------|--------|------------|-------------------------|
| 4c9ee21 | main   | 2026-09-05 | -                       |
| 6d10b4e | main   | 2026-06-01 | production (2026-06-02) |
