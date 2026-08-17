# Nobody can tell me what a cardholder with a promo code actually pays

## Problem Description

We ship the new checkout discount logic in three weeks, and the only written
source is the pricing note below. Product wrote it in a hurry. It has three
switches in it - the loyalty card, the order total, and the promo code field -
and it describes them one at a time, in whatever order they occurred to
whoever was typing.

Support has already asked twice what a cardholder who enters a promo code
should be charged, and I cannot answer it from the text. I would rather find
every question of that shape now than after the tester files it as a bug and
product tells us it was "obviously" meant the other way.

The test lead wants one document he can take into the review with product, so
whatever is missing gets decided by a person instead of by whoever writes the
code first.

## Output Specification

Produce `discount-rules-analysis.md` containing:

1. The switches that decide what a customer pays, one per line, each phrased so
   a tester can set it on its own.
2. Every distinct thing the note can produce - a discount, a shipping result, a
   plain full-price charge - listed separately.
3. A table giving the expected result for every possible setting of those
   switches, including settings the note never talks about.
4. Any setting whose result you could not work out from the note, written up as
   an open question for product rather than filled in with your best guess.
5. The checkout cases QA should run, taken from that table.

Out of scope: arithmetic against a real basket, anything about the payment
provider, and writing any code. This is a review document only.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/checkout-discount-note.md ===============
# Checkout discounts (draft note, v3)

Loyalty cardholders get 10% off the basket.

Orders of EUR 75 or more ship free. Below that, shipping is EUR 4.90.

A promo code entered at checkout takes 15% off the basket. Codes are open to
everyone - there is no restriction on who is allowed to type one in, and the
field is shown on every checkout.

Percentage discounts do not combine. A basket gets one percentage off, not two.

Shipping is worked out from the basket total before any percentage discount is
applied, so a discount never moves an order across the EUR 75 line.

Note from Marta (2026-05-02): the 15% code is the summer campaign. Finance
wants reporting to keep campaign discounts and card discounts apart, so
whichever one applies has to be recorded distinctly on the order.
