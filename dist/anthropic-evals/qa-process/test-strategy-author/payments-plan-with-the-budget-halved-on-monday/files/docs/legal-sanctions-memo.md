# Sanctions screening - change of control

**From:** Legal (Halima Farouk)   **Date:** 2026-07-03

As of 2026-07-01 sanctions screening for seller payouts is performed by the
payment provider under their own licence, before funds are released. We no
longer hold a screening list, no longer run a match, and no longer make a
release decision on a flagged seller - the provider rejects the payout and we
surface their rejection code.

Split payments v2 changes how a payout is divided between sellers. It does not
touch release, screening or the provider rejection path, none of which is in the
v2 change set.

Our compliance obligation now runs through the provider agreement and their
annual attestation, not through our own testing. Register rows that assume we
screen in-house are stale and should be re-scored by the register owner.
