# Getting realtime coverage back before 6 October

Author: @npatel (SRE)  ·  2026-09-11

## Context

Runner egress is 80/443 to an allowlist. `wss://gateway.internal:8443` is not on
it and will not be before the freeze lifts. The browser e2e job runs on the
shared runner pool and cannot reach the gateway. The in-cluster node job can -
it runs as a pod in the same namespace and talks to the service directly.

## Proposal 1 - move the protocol checks into the in-cluster job

The handshake check and the connection-ending checks do not need a browser. They
drive our own upgrade handler directly. Moving them into the in-cluster node job
gets them running again this week at no behavioural cost, and the browser job
keeps the UI-level assertions it is actually for.

## Proposal 2 - cover the streaming path through the long-poll fallback

`/api/poll` is the fallback every client already drops to when a corporate proxy
blocks the stream port. It is plain HTTPS on 443, so the runners can reach it
today with no network change at all. It carries the same events, so a suite that
polls it and asserts the events arrive gives us end-to-end coverage of realtime
delivery. I would mark the streaming path covered on that basis and revisit when
the port opens.

## Proposal 3 - point the browser job at the HTTP/2 endpoint on 443

The gateway already answers `/stream` on 443 as well, and 443 is allowed from
the runner pool today. Repointing `tests-e2e/realtime.spec.ts` at
`wss://gateway.internal/stream` gets the browser job running this afternoon with
no network ticket at all - same gateway, same session code, same events. When
8443 opens we can point it back, or leave it where it is.
