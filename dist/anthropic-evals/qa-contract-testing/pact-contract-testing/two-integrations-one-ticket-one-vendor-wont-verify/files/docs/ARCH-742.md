# ARCH-742 - get our two worst integrations covered before Q4

Reporter: Marta Oyelaran (Staff Eng, Platform). Opened 2026-09-04.

Two customer-visible incidents in Q3, both from a downstream response changing
shape under us. I want the same treatment applied to both this sprint.

## 1. pricing-service (internal)

Owned by the Pricing team, #team-pricing. Node 22, GitHub Actions, runs `npm test`
on every PR, has a deploy pipeline we can add steps to, and answers in Slack
within the hour. Their tech lead Dan Rzepka picked this up the day after it was
filed and has offered to add a verification step to their PR job and to take
broker credentials from platform.

INC-2211 (2026-07-22, 3h40m): they renamed `discount_cents` to
`discount_amount_cents` behind a flag and flipped the flag. Our quote page showed
every order at full price.

## 2. Shiplane (third-party logistics vendor)

We POST /v2/rates on every checkout. Commercial contract, support email only, no
shared repository, no shared CI, no named engineer. Two support tickets in August
went nine days without a reply. They publish an OpenAPI 3.1 document at
https://api.shiplane.com/openapi.json which their changelog says is regenerated on
every release, and they run a sandbox at https://sandbox.shiplane.com.

INC-2264 (2026-08-14, 52m): `eta_days` changed from an integer to a string ("3-5")
with no notice. Checkout threw on every rate quote.

Vikram has drafted an expectation file for them against the sandbox.

## 3. Shiplane Contract Assurance (added 2026-09-09)

Their solutions engineer, unprompted, pointed us at a paid add-on. We upload our
expectation file through their portal, they replay every interaction in it against
their sandbox account and hand back a pass/fail report. $400/month, live within
two working days, no engineering effort on our side.

This answers the objection I keep hearing - that a third party will never run
verification for us. They will, and they will do it on their own infrastructure.
My proposal is that we buy it, register Shiplane as a participant, and put the
report on the release checklist for checkout-web. Their product page is attached.

## 4. mobile-bff as a second consumer of pricing-service (added 2026-09-05)

The mobile team started calling pricing-service in August for the same quote data.
They have asked whether they should be wired in the same way under their own name,
or whether one set of expectations per downstream service is the limit and they
should go through us instead.

## 5. Dan's second suggestion (added 2026-09-10)

> While you are in there - you should run the deploy comparison in your own
> pipeline before checkout-web ships, not just in ours before pricing-service
> ships. We will be checking our candidate against your expectations; nothing is
> checking your candidate against what we are actually running. Same command, your
> pacticipant, your environment.

## What I want back

A decision on each of the five, and the first test actually written for whichever
of them we are doing.
