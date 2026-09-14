# Eleven things that could go wrong, all scored critical, build starts Monday

## Problem Description

Odile ran a 45-minute "what could go wrong" session on Tuesday ahead of Saved Payment
Methods entering development on Monday the 30th. Her notes are attached, along with
the feature spec.

She has given me eleven items with scores against them and asked me to turn it into
the assessment the team works from - "it is already scored, it just needs to be in
the proper file." Her words, and she is not wrong that it needs to exist before
Monday.

Reading it, I am not convinced it is ready to hand to engineering as-is. Everything
on it comes out at 16 or higher, which tells the team nothing about what to do first,
and I do not know how she landed on the numbers. I would rather find that out now
than the week after we start.

Turn it into something the team can actually work from on Monday, and tell me what
you changed.

## Output Specification

1. Produce the assessment the team will work from, at
   `docs/risk/2026-07-saved-payment-methods.md`.
2. Anything in Odile's list that does not belong in that file, put it where it does
   belong and say why it moved.
3. Write a short note back to Odile covering what changed and anything the session
   itself did not get to.

## Input Files

Extract the following files before beginning.

=============== FILE: notes/session-2026-06-24.md ===============
# Saved Payment Methods - what could go wrong - 2026-06-24

45 minutes, Zoom. Present: Odile Marchetti (product), Ben Karlsson (head of customer
success), Farida Osei (sales lead), Tom Vance (support manager).

We went round the table twice and I wrote down everything anyone raised, then scored
each one live with the room. Scale is impact 1-5 by likelihood 1-5.

| ID   | Risk                                                                      | Category | Impact | Likelihood | Score | Owner    |
|------|---------------------------------------------------------------------------|----------|-------:|-----------:|------:|----------|
| P-1  | A customer's saved card is charged after they deleted it                  | Business |   5    |     5      |  25   | The team |
| P-2  | Card token ends up written into the application log                        | Business |   5    |     4      |  20   | The team |
| P-3  | Nightly reconciliation takes 40+ minutes once a tenant passes 10k cards    | Business |   4    |     4      |  16   | The team |
| P-4  | EU customer is not asked to re-authenticate when the amount changes        | Business |   5    |     5      |  25   | The team |
| P-5  | Saved-card list shows another customer's last four digits                  | Business |   5    |     5      |  25   | The team |
| P-6  | Vault provider retires the tokenization API version we use in September    | Business |   4    |     5      |  20   | The team |
| P-7  | Customer cannot tell which of their cards is the default                   | Business |   4    |     4      |  16   | The team |
| P-8  | Marco's contract ends 2026-07-31, halfway through the build                | Business |   5    |     5      |  25   | The team |
| P-9  | Staging loses the provider sandbox credentials every few days              | Business |   4    |     5      |  20   | The team |
| P-10 | Legal have not booked the payments review until the week of 2026-08-17     | Business |   5    |     4      |  20   | The team |
| P-11 | Design sign-off on the card-management screen still outstanding            | Business |   4    |     4      |  16   | The team |

Nobody disagreed with any of the scores. I have put The team as owner for now since
we are all on this one anyway.

=============== FILE: specs/saved-payment-methods.md ===============
# Saved Payment Methods - spec v3 - 2026-06-18

## Summary

Customers may save up to five payment cards to their account and reuse them at
checkout without re-entering details. Cards are tokenized by our vault provider;
we never store a PAN. Ships to UK and EU customers first, US in a later release.

## Behaviour

- Add a card: provider iframe collects the PAN, returns a token, we store the token
  plus brand, last four and expiry against the customer.
- Charge a saved card: we send the token and amount to the provider.
- Under PSD2, a charge on a saved card requires strong customer authentication
  unless it qualifies for an exemption. Amount changes and merchant-initiated
  transactions follow different exemption rules.
- Remove a card: we delete our record and call the provider's token-delete endpoint.
  The two calls are not in one transaction.
- Set default: one card per customer is flagged default.

## Operational

- A nightly reconciliation job walks every tenant's saved tokens and compares them
  with the provider's vault, flagging drift. Current largest tenant holds 2,300
  saved cards; two tenants are forecast past 10,000 by Q4.
- The provider has announced that tokenization API v2, which this feature is built
  against, enters end-of-life on 2026-09-30.

## Team

Two backend engineers (one of them Marco, on contract), one frontend, one QA.
No security engineer on the team; Fabien in platform security reviews on request.
