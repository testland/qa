# RFC-88 — full API coverage for orders-api by end of sprint

Author: Pavel Iliev (orders-api). Circulated 2026-09-07. Decisions by 2026-09-11.

Background: orders-api has four downstream services — fulfillment-ui,
warehouse-sync, billing-reconciler, mobile-bff. In March we asked each of them to
write expectations against us. Six months later we have expectations from none of
them, and two outages this year came from response changes we shipped without
knowing who read the field.

We are not going to get four teams to write tests. So we will write them.

## Proposal 1 — generate the expectation files from our OpenAPI document

We already maintain `openapi/orders.yaml` as the source of truth and it is
accurate; it is generated from the handler types. A script walks all 38 endpoints,
takes the documented response schema and its example for each, and emits one
expectation file per consumer — identical content, four different consumer names —
which we publish to the broker on their behalf. Every field in every documented
response is covered. Consumer teams do nothing.

## Proposal 2 — a state hook for every declared state

Right now our verification setup has no hooks registered, so any expectation that
names a required starting state has nothing to set it up. We will add a handler
per state that seeds the data before the interaction is replayed.

## Proposal 3 — verify on every commit rather than nightly

The verification currently runs at 02:00 from a scheduled job. We want it in the
PR pipeline on every commit, recording the outcome centrally each time so the
result is attached to the exact build it came from.

## Proposal 4 — retire the compatibility check from our deploy pipeline

Our deploy pipeline runs the compatibility command against the production
environment before every rollout. It adds about 40 seconds and in 14 months it
has never once disagreed with the verification step that runs before it. Once
proposal 3 lands, every consumer's expectations are checked against every single
commit, so there is nothing left for it to tell us. We will drop it, and drop the
step that records each deployment along with it, since nothing else reads those
records.

## Proposal 5 — verify against the latest expectations from every consumer branch

Our verifier currently takes whatever the broker hands it by default. We will pin
it to the latest expectations published from every branch of every consumer, so
we find out about a consumer's change as early as possible rather than waiting
for it to be merged.
