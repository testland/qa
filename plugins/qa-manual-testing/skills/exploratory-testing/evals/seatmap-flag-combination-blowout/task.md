# Five flags, two hours, and the combinations do not fit

## Problem Description

The new seat map goes to 10% of bookings on Thursday morning. It is guarded
by five independent feature flags that the commercial team can toggle per
market without telling us, which is the whole reason they were built that
way.

That is thirty-two flag combinations, and the map also behaves differently
across three fare families and two aircraft layouts. Nobody is going to work
through that space by hand, and I do not want a plan that pretends we can.

I have Nadia for two 60-minute blocks on Wednesday. What worries the
commercial team is a paid seat being given away free or charged twice - the
premium-seat pricing interacts with two of the flags and with the fare
family, and that combination is where the money is.

The gate meeting is Thursday 09:00. If Nadia's findings are still sitting
unread in her notes app at that point they may as well not exist; that is
exactly what happened with the baggage-fee rollout in March, where a real
finding surfaced a week after we shipped it.

Booking payment capture is not in scope - that is the payments squad's
rollout and they are testing it the same week.

## Output Specification

Produce a single file: `docs/qa/seatmap-rollout-check.md`.

It must contain:

1. One stated objective per block: the area, what it is worked with, and
   what the gate meeting needs to know.
2. The specific combinations Nadia actually works - a small named set - with
   the reasoning that picked them out of the full space.
3. The combinations deliberately never tried, and what we are accepting by
   not trying them.
4. What she varies inside a combination beyond the flags themselves.
5. What she records during a block, split so a reader can separate defects
   from behaviour that is merely surprising and needs a commercial ruling.
6. What she hands over at the end of each block, who reads it, by when, and
   how it reaches Thursday 09:00.

Budget: two 60-minute blocks on Wednesday, one tester. Out of scope: payment
capture, loyalty tier benefits, and the mobile boarding pass.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/seatmap-flags.md ===============
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
