# Returns portal v2 - release brief

**Ship date:** Monday
**Freeze:** Friday 09:00
**Owning squad:** Post-purchase

## What changed in v2

- A customer can now return individual items from an order instead of the
  whole order.
- Refunds are split across the original tenders: card, store credit, and
  gift card, in that order of repayment.
- Shipping fees are refunded only when every item in the order is returned.
- The refund amount shown in the portal is calculated in the browser from
  the order payload; the authoritative amount is recalculated server-side
  when the return is submitted.
- Returns for orders older than 30 days require an agent override code.

## Known open items

- REF-1187: staging shows a 3.40 discrepancy on a two-item order where one
  item was bought with 10.00 of store credit. Not reproduced on demand.
- REF-1191: finance reported a second mismatch, order not identified.
- The server-side recalculation was added late and has no unit coverage
  for the mixed-tender path.
- Agent override codes are seeded manually in staging; there are currently
  four valid codes.

## Environment notes

- Staging: returns-stg.internal, seeded nightly at 02:00.
- Payment sandbox is shared. Mobile squad holds it from 15:00 daily.
- Test accounts with store-credit balances: three exist, balances 5.00,
  10.00, 50.00. Credit is not automatically restored after a test run.
- Card-capture screens are served from the vendor's domain and are covered
  by the vendor's own certification, not by us.
