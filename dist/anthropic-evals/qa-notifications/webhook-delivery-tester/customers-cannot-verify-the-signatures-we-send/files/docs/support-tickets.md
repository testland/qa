# Open integration tickets

## SUP-4412 — Northwind Logistics (2026-08-24)

> We're using the standard open-source verifier package for our platform. Every
> delivery from you fails with `No matching signature found`. We never get as far
> as a secret comparison. We have three other vendors wired through the same
> handler and they all work.

Shared secret regenerated live on a call 2026-09-08. No change. Raw request and
the endpoint secret they hold are attached — see `docs/northwind-capture.md`.

## SUP-4430 — Kestrel Freight (2026-08-29)

> Same library, same failure. Our platform team says they would have to fork it
> to accept what you send and they will not sign off on that.

## SUP-4451 — Marlow Retail (2026-09-02)

> Our security reviewer will not approve an integration where we write the
> verification ourselves. Do you publish anything that works with a maintained
> library?

## Not a ticket — Brightsail Group

Live since 2024-11. Verifier written in-house. Reports no failures, ever. Next
engineering window 2026-11.
