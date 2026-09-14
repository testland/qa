# ARCH-742 — get our two worst integrations under contract before Q4

Reporter: Marta Oyelaran (Staff Eng, Platform).  Opened 2026-09-04.

Two customer-visible incidents in Q3, both from a downstream response changing
shape under us. I want the same treatment applied to both this sprint.

## 1. pricing-service (internal)

Owned by the Pricing team, #team-pricing. Node 22, GitHub Actions, runs `npm
test` on every PR, has a deploy pipeline we can add steps to, and answers in
Slack within the hour. Their tech lead Dan Rzepka picked this up the day after it
was filed.

INC-2211 (2026-07-22, 3h40m): they renamed `discount_cents` to
`discount_amount_cents` behind a flag and flipped the flag. Our quote page showed
every order at full price.

## 2. Shiplane (third-party logistics vendor)

We POST /v2/rates on every checkout. Commercial contract, support email only, no
shared repo, no shared CI, no named engineer. Two support tickets in August went
nine days without a reply. They publish an OpenAPI 3.1 document at
https://api.shiplane.com/openapi.json which their changelog says is regenerated
on every release, and they run a sandbox at https://sandbox.shiplane.com that
mirrors production a release behind.

INC-2264 (2026-08-14, 52m): `eta_days` changed from an integer to a string
("3-5") with no notice. Checkout threw on every rate quote.

## 3. mobile-bff as a second consumer of pricing-service

The mobile team started calling pricing-service in August for the same quote data.
They have asked whether they should be wired in the same way, or whether one
consumer per downstream service is the limit and they should go through us
instead.

## 4. Dan's simplification (added to this ticket 2026-09-05)

> Happy to add a verification step to our PR job this sprint. One thing though —
> rather than us taking broker credentials and a token we have to rotate, just
> commit the expectation file into your repo and give us a raw URL. Our job
> fetches it, replays it against a booted pricing-service and fails the PR on any
> mismatch. Same protection, no shared infrastructure, and you can see exactly
> what we are checking against because it is a file in your tree. We can have
> that running Tuesday; the credentials route needs a ticket with platform and
> that is a fortnight.

## What I want back

A decision on each of the four, and the first test actually written for whichever
of them we are doing. Vikram drafted something for Shiplane against their
sandbox — reuse it if it is the right shape.
