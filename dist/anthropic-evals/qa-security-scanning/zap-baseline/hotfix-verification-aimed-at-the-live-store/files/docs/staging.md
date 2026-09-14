# staging.harlowgoods.dev

Full application stack, same Rails release as production, deployed from `main`
on every merge.

## Data

- The database is restored weekly from an anonymised production dump. Customer
  names, emails and addresses are replaced; order and ledger structure is kept.
- Gift cards are **not** in the anonymised dump — the dump script excludes
  `gift_cards` and `giftcard_redemption_log` over a historical PII concern that
  no longer applies.
- `bin/seed-giftcards` exists and is maintained. It creates N redeemable cards
  with known codes and balances. It is run by hand before manual QA of the
  billing flows and has never been wired into an automated job.

## Mail

- All outbound mail on staging is captured by a local mail sink
  (`mailsink.staging.harlowgoods.dev`). Nothing leaves the VPC. This has been
  true since the environment was built.

## Third-party services

- Stripe is in test mode. No real charge is possible.
- Sentinel (fraud screening) has no sandbox tier and never has. Staging calls
  the same Sentinel account as production, using the production key from the
  shared secret store as `SENTINEL_KEY`. Sentinel bills per decision and applies
  per-account rate limiting; our contract is 40 decisions per minute, counted
  across every caller on the account. Requests over the limit are rejected for
  the rest of the minute and repeated bursts trigger a manual review of the
  account by Sentinel's risk team.
- Shipping rates come from a vendored fixture file on staging, not the live
  carrier API.
