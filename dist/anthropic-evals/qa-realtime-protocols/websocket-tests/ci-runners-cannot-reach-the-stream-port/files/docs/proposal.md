# Getting realtime coverage back before 6 October

Author: @npatel (SRE)  ·  2026-09-11

## Context

Runner egress is 80/443 to an allowlist. `wss://gateway.internal:8443` is not on
it and will not be before the freeze lifts. The browser e2e job cannot reach the
gateway. The in-cluster node job can - it runs as a pod in the same namespace
and talks to the service directly, no proxy in the path.

## Proposal 1 - move the protocol checks into the in-cluster job

The handshake check and the connection-ending checks do not need a browser. They
drive our own upgrade handler over the same protocol on the same port. Moving
them into the in-cluster node job gets them running again this week at no
behavioural cost. The browser job keeps the UI-level assertions it is actually
for.

## Proposal 2 - cover the streaming path through the long-poll fallback

`/api/poll` is the fallback every client already drops to when a corporate proxy
blocks the stream port. It is plain HTTPS on 443, so the runners can reach it
today with no network change at all. It carries the same events, so a suite that
polls it and asserts the events arrive gives us end-to-end coverage of realtime
delivery. I would mark the streaming path covered on that basis and revisit when
the port opens.

## Proposal 3 - drop the handshake assertions

Whatever we do with the rest, the handshake assertions should go. The browser
opens the connection and the client library speaks the protocol; the handshake
is handled for us by code we did not write and cannot break. Testing it is
testing someone else's library, and it is the fiddliest part of the suite to
move.
