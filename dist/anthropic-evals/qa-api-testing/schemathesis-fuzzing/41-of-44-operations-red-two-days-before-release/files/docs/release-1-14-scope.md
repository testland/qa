# Release 1.14 - scope and open items

Ships Thursday 2026-09-12, 14:00 UTC. Payments-facing.

In scope: mandate creation UI, payout cancellation, and the tax-breakdown fields
on invoices (shipped behind a flag in July with the v3 handler rewrite; the flag
comes off in 1.14).

Open items carried from earlier releases:

- API-903 - regenerate the OpenAPI document from the v3 handlers. Owner
  @api-platform (@sofia-r). Deferred out of 1.12 and again out of 1.13.
  Estimated half a day; the generator that produced the current document still
  runs in the build image, it has simply not been re-run since January, and the
  document has been hand-edited twice since.

Notes:

- The document in this repository is what the docs portal renders and what three
  partner integrators generate their client SDKs from. It is the published
  contract.
- Release gate: the api-fuzz job must be green on release/1.14 before the tag is
  cut. Any exception has to be written down, dated, and signed off by the
  release manager.
