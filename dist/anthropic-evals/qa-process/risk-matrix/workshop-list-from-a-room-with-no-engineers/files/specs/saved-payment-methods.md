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
