# INC-4471 — reflected XSS, gift-card redemption

- Reported 2026-09-09 by an external researcher.
- Affected: `POST /gift-cards/redeem`. The `code` parameter is echoed into the
  error partial unescaped when the card lookup fails.
- Fix merged 2026-09-11 (PR #8812), deployed to production 2026-09-11 18:40 UTC.

## What these endpoints do when they are exercised

Confirmed with the billing team on 2026-09-10, because we needed to know what a
scanner would do to them.

`POST /gift-cards/redeem`

- Writes a row to `giftcard_redemption_log` on every submission, successful or
  not. No dry-run mode, no test flag.
- A successful redemption debits the card balance and writes a `store_credit`
  ledger entry. Balance changes are not reversible from the admin UI; finance
  raises a correction by hand.
- Six failed attempts against the same card within an hour lock that card and
  send a "someone is trying to use your gift card" email to the registered
  address.
- Does not call any external service. The ledger write is local.

`POST /orders` and `POST /orders/:id/pay`

- Every submission creates a real order record and a real ledger entry.
- Every submission makes exactly one call to Sentinel, our fraud-screening
  provider, before the order is accepted. The call happens whether or not the
  order later validates.

## Scanning history

- The nightly crawl of `staging.harlowgoods.dev` has run since February. It
  reported nothing on the redemption form.
- The daily crawl of the live store has run since March. It reported nothing on
  the redemption form either.
- Neither run submitted any form. We do not currently know whether the staging
  run reached `/gift-cards/redeem` at all — the reports list the URLs visited
  but nobody has read them.
