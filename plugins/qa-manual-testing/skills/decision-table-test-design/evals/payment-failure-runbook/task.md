# Failed-payment runbook: I cannot tell what the system should do on a single decline

## Problem Description

The runbook below is what the billing team wrote when we moved off the payment
provider's own dunning. It is what our retry service implements, and it is what
support reads when a customer calls about a suspended account.

It reads as six flat statements, but they are not the same kind of statement.
Some of them are decidable from one failed charge in front of you: the decline
reason, the plan, whether there is a backup card. Others are about where the
customer is in a longer story, and you cannot look at a single decline and say
whether they hold.

That distinction is the reason I am asking for this. Our current regression pack
treats all six as if they were switches on a single event, and it passes while
the actual behaviour we get complaints about - accounts suspended earlier than
the customer expected - is not covered by any of its cases.

I want a document that is honest about which part of this runbook a single-event
check can verify and which part it cannot, plus the part QA can start on
immediately.

## Output Specification

Produce `payment-failure-analysis.md` containing:

1. The facts about a single failed payment that decide what the system does
   next, one per line. Include only facts a tester can arrange before triggering
   one failure and observe the result of that failure.
2. Every distinct action the runbook can take, listed separately.
3. A table giving the expected action for every combination of the facts in
   point 1.
4. Any combination whose action the runbook does not settle, raised as an open
   question rather than decided here.
5. Anything in the runbook that your table does not cover, and what you would
   propose instead for that part.
6. The failed payments QA should trigger, and what each one checks.

Out of scope: the payment provider's own retry behaviour, card-network decline
codes beyond the two named, invoicing, and any code change.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/payment-failure-runbook.md ===============
# Failed subscription payments (runbook, v2)

When a charge fails because of insufficient funds, retry the card after three
days.

When a charge fails because the card has expired, do not retry. Email the
customer to ask them to update the card.

When a backup card is on file, charge the backup card immediately instead of
retrying the primary. A successful backup charge closes the incident: no grace
period runs and no dunning email is sent.

Annual plans get a 14-day grace period before the account is suspended. Monthly
plans get 5 days.

On the third failed attempt within a billing cycle the account is suspended,
whatever the plan's grace period says.

An account that was suspended in an earlier billing cycle is suspended on the
first failure instead of the third.

Only two decline reasons reach this runbook: insufficient funds and expired
card. Anything else is handled by the provider.
