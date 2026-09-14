# Staging capture proxy

Runs in front of the staging payments endpoint. Writes every inbound delivery to
`s3://pay-captures-staging/<date>/<svix-id>/` as two files:

- `body` — the request body, byte for byte as received
- `headers.json` — the full inbound header set

Retention 90 days. Access is granted to the whole engineering group.

The March pull that seeded `test/replay/fixtures/` was two deliveries from
2026-03-18. There are sixty more from 2026-08-11 in the same bucket, taken during
the load test, that we intended to add before the audit.

Nothing in this pipeline alters the bodies. What the customer sent is what lands
in the bucket and what lands in the bucket is what Ravi copied into the repo.
