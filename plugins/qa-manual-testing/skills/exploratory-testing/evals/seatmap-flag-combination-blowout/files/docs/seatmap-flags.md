# Seat map v3 - flags and behaviour

**Rollout:** 10% of bookings, Thursday 09:00.

## Flags (independent, per market, toggled by commercial)

| Flag | Effect when on |
|---|---|
| `seatmap.v3` | Renders the new map. Off = old map. |
| `seatmap.premium_pricing` | Premium rows priced individually rather than one flat premium fee. |
| `seatmap.free_for_bundle` | Seats included free when the fare bundle includes seat selection. |
| `seatmap.hold_seat` | Seat is held for 20 minutes before payment. |
| `seatmap.infant_block` | Blocks seats in rows without infant oxygen masks. |

## Other dimensions

- Fare families: Basic, Standard, Flex. Standard and Flex include seat
  selection in the bundle; Basic does not.
- Aircraft layouts: narrow-body (30 rows, 1 premium block) and wide-body
  (52 rows, 2 premium blocks plus a bassinet row).

## Known interactions

- `free_for_bundle` and `premium_pricing` both on: a Flex passenger picking
  a premium seat should get it free. Implemented three weeks ago; the
  pricing service still returns a line item that the UI is expected to
  suppress.
- `hold_seat` releases the seat after 20 minutes. If the passenger pays at
  minute 21 the seat may already be resold.
- `infant_block` is evaluated from the passenger list at map load, not at
  seat selection, so adding an infant after loading the map does not
  re-block rows.
- Wide-body bassinet row is priced as premium on some markets by data
  configuration, independent of the flags.

## Environment

- Staging supports per-booking flag overrides via a query parameter.
- Test bookings can be created for any fare family in either layout.
- Pricing service staging returns real line items; no payment is taken.
