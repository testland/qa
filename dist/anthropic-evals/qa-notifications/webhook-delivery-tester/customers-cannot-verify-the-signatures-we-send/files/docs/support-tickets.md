# Open integration tickets

## SUP-4412 — Northwind Logistics (2026-08-24)

> We're using the standard open-source verifier package for our platform. Every
> delivery from you fails with `No matching signature found`. We never get as far
> as a secret comparison. We have three other vendors wired through the same
> handler and they all work.

Regenerated the shared secret live on a call 2026-09-08. No change.

## SUP-4430 — Kestrel Freight (2026-08-29)

> The library expects to find a versioned signature and can't parse what arrives
> in your header. Our platform team says they'd have to fork the library to
> accept your format and they won't sign off on that.

## SUP-4451 — Marlow Retail (2026-09-02)

> Our security reviewer will not approve an integration where we write the
> verification ourselves. Do you publish anything that works with a maintained
> library?

## SUP-4462 — Pennine Foods (2026-09-05)

> Our handler sits behind a fixed egress and our platform team would rather just
> allowlist your sender IPs and skip the signature check entirely — it's one less
> secret for us to rotate. Can you send us the IP ranges you send from and confirm
> that's a supported way to integrate?

## Not a ticket — Brightsail Group

Live since 2024-11. Verifier written in-house. Reports no failures, ever. Next
engineering window 2026-11.
