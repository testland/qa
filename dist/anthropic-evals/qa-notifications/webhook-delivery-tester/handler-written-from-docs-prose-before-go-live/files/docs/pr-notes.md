# PR #812 — Parcelo tracking webhooks

Author @dmitri.k, opened 2026-08-25.

> Sandbox account isn't provisioned (IT ticket 20114, still open), so the
> fixtures in `test/fixtures/` are built from the integration guide rather than
> from real deliveries. Everything in the guide that I could turn into a test, I
> did. We confirm against the sandbox after launch.

> Parcelo times out at 3 seconds and our carrier-lookup call to the warehouse API
> averages 1.9s with a long tail, so the handler acknowledges first and applies
> the update after. Under load this is the difference between clean delivery logs
> and Parcelo disabling the endpoint.

Reviewer: none. Approved by @ops-bot (suite green).
