# INC-4471 — reflected XSS, gift-card redemption

- Reported 2026-09-09 by an external researcher.
- Affected: `POST /gift-cards/redeem`. The `code` parameter is echoed into the
  error partial unescaped when the card lookup fails.
- Fix merged 2026-09-11 (PR #8812), deployed to production 2026-09-11 18:40 UTC.

## What the endpoint does when it is exercised

Confirmed with the billing team on 2026-09-10, because we needed to know what a
scanner would do to it:

- Every POST to `/gift-cards/redeem` writes a row to `giftcard_redemption_log`,
  successful or not. There is no dry-run mode and no test flag.
- A successful redemption debits the card balance and writes a `store_credit`
  ledger entry against the customer account. Balance changes are not reversible
  from the admin UI; finance has to raise a correction by hand.
- Six failed attempts against the same card within an hour lock that card and
  send a "someone is trying to use your gift card" email to the registered
  customer address. Production mail goes to real customers.
- Checkout shares the same ledger. `POST /orders` and `POST /orders/:id/pay`
  behave the same way: every submission creates a real record.

## Scanning history

- The nightly staging job has run against `staging.harlowgoods.dev` since
  February. It reported nothing on the redemption form.
- The daily crawl of the live store has run since March. It reported nothing on
  the redemption form either.
- Neither run submitted the redemption form. We do not currently know whether
  the staging run reached `/gift-cards/redeem` at all — the reports list the
  URLs visited but nobody has read them.
