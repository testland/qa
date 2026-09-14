# RFC-88 - full API coverage for orders-api by end of sprint

Author: Pavel Iliev (orders-api). Circulated 2026-09-07. Decisions by 2026-09-11.

Background: orders-api has four downstream services - fulfillment-ui,
warehouse-sync, billing-reconciler, mobile-bff. In March we asked each of them to
write expectations against us. Six months later we have expectations from none of
them, and two outages this year came from response changes we shipped without
knowing who read the field.

We are not going to get four teams to write tests. So we will write them.

## Proposal 1 - generate the expectation files from our OpenAPI document

We already maintain `openapi/orders.yaml` as the source of truth and it is
accurate; it is generated from the handler types. A script walks all 38 endpoints,
takes the documented response schema and its example for each, and emits one
expectation file per consumer - identical content, four different consumer names -
which we publish to the broker on their behalf. Every field in every documented
response is covered. Consumer teams do nothing.

## Proposal 2 - a state hook for every declared state

Right now our verifier has no hooks registered, so any expectation that names a
required starting state has nothing to set it up. We will add a handler per state
that seeds the data before the interaction is replayed.

## Proposal 3 - verify in the PR pipeline rather than nightly

Verification currently runs at 02:00 from a scheduled job against whatever is on
`main`. We want it in the PR pipeline on every commit, with the outcome recorded
against the exact build it came from.

## Proposal 4 - check only the consumer versions that are actually deployed

Our verifier takes whatever the broker hands it by default, which turns out to
include every consumer version anyone has ever published. We have gone red 23
times this quarter on consumer work that was never merged - mobile-bff's
`spike/offline-queue` branch alone accounts for 14 of them - and people have
stopped reading the result.

Fix: pin the selection to the versions recorded as deployed or released. That is
the only pairing the deploy comparison ever asks about, so it is the only pairing
worth spending a build on, and it makes an unmerged experiment in someone else's
repository incapable of turning our pipeline red. One line.

## Proposal 5 - only record a verification result when it passes

Publishing every red result leaves the matrix full of failures from builds that
were fixed ten minutes later, and the failures outlive the branch they came from.
We will keep publishing results on a pass and skip publishing on a failure - the
failure is still on the build, still red, still blocks the PR under proposal 3, so
nothing is lost. The matrix then shows the state of things rather than a history of
every bad five minutes anyone has had.
