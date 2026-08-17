# Support keeps promising refunds finance then refuses to pay

## Problem Description

The refund policy note below is what support reads off when a customer
cancels, and it is also what the billing service was built from. Twice this
month a support agent promised money back to a card and finance issued account
credit instead, which the customer then complained about publicly.

Reading it again, the note describes several different things that can happen
to a cancelling customer, and they are not all refunds - one of them is not a
payment at all. Support has been treating anything that is not money back as
"no refund", which is how we got here.

Three things about a cancellation seem to matter: how long ago the customer
bought, which plan they are on, and how much compute they burned since buying.
I want every combination of those written down with what the customer should
actually get, so support can be retrained off one page and QA can check the
billing service against the same page.

## Output Specification

Produce `refund-rules-analysis.md` containing:

1. The three things about a cancellation that decide the result, one per line.
2. Every distinct thing that can happen to a cancelling customer, listed
   separately - if two of them leave the customer with different money in
   different places, they are two results, not one.
3. A table giving the expected result for every combination of the three.
4. Any combination the note does not settle, or settles in two conflicting
   ways, raised as an open question for finance rather than decided here.
5. The cancellations QA should run against the billing service.

Out of scope: the refund timing (finance runs refunds on Fridays), tax
treatment, and any code change.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/refund-policy-note.md ===============
# Subscription refunds (policy note for support)

A cancellation made within 14 days of purchase is refunded in full.

An annual plan cancelled after 14 days is refunded pro rata for the whole
months remaining.

A monthly plan cancelled after 14 days is not refunded. The subscription keeps
running until the end of the paid period and then stops.

Where the customer has used more than 10 hours of compute since purchase, the
list value of that usage is deducted and the balance is issued as account
credit rather than returned to the card.

Support should not promise a date. Finance runs refunds on Fridays.

Account credit does not expire and can be spent on any plan, but it cannot be
withdrawn.
