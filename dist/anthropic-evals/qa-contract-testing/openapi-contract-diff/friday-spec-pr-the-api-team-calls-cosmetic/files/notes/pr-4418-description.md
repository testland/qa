# PR #4418 - spec tidy-up ahead of v3.0.0

Four changes, all cosmetic. Please approve today, we are two sprints late.

1. `Payout.status` - dropped `returned` from the enum. Returns moved to their
   own resource in July and we have not emitted `returned` on a payout since
   the 12th.

2. `Payout.rail` - dropped `wire` from the enum. Same situation: wire payouts
   moved over to the treasury product on 2026-08-03 and nothing in the payouts
   service can produce `rail: wire` any more.

3. Deleted `components.schemas.LegacyPayoutEvent`. Dead weight - nothing in the
   file points at it, nothing in the service points at it. See the grep.

4. `GET /v1/payouts/{payoutId}` - added `settledAt` as a new optional property
   on the 200 response. Purely additive.

Last thing. `status` already carries `x-extensible-enum: true`. Add the same
line to `rail` while you are in there - one line, it changes nothing about what
we actually return, and then the compatibility step stops arguing with us every
time we tidy an enum.
