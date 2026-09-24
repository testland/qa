#checkout-declines, week of 2026-09-07. Five asks, numbered by Ade so we can
keep track of which ones got done.

1. Nadia (support), 2026-09-08
   SUP-9912. Her card expired on 31 July. We told her to contact her bank for
   more information. She rang them, they said the account is fine and the card
   was simply replaced, and she wants to know why we did not just say the card
   had expired. This is her second contact; the first was closed as "bank
   issue". Ask: when the card has expired, say the card has expired.

2. Nadia (support), 2026-09-08
   SUP-9930. He typed the wrong three digits off the back of the card. We told
   him to contact his bank. He tried twice, decided our payment page was
   broken, and completed the order through another channel at a worse rate for
   us. Ask: when the security code is wrong, say the security code is wrong.
   Both of these are ten-second fixes for the customer if we just tell them.

3. Tom (risk), 2026-09-09
   Following RISK-441. When the issuer comes back lost or stolen, put that in
   front of the customer - something like "this card has been reported lost or
   stolen, please contact your card issuer's fraud line and use another card".
   Ask: say it plainly. Rationale: they will thank us for it, it is true, and
   it is the only message that actually stops them sitting there retrying the
   same card all evening, which is what generated four attempts on ord_77120.

4. Priya (growth), 2026-09-10
   Our dunning job gives up on anything checkout marks non-retryable. I pulled
   the numbers on the ones the processor blocks outright as high risk: 31% of
   them go through on a later attempt within five days. On last quarter's
   volume that is EUR 41k we simply did not collect. Ask: mark those retryable
   like the rest, and let dunning do its four nights.

5. Priya (growth), 2026-09-10
   Separate and much smaller: when the card has insufficient funds we currently
   stop after one attempt, which is silly - people get paid. Ask: let dunning
   retry that one for up to three nights before it gives up.
