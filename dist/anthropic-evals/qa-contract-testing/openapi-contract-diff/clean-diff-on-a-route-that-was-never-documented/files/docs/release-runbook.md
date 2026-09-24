# webhooks-api release runbook

1. Cut `release-<version>` off `main` and freeze. The 3.2.0 branch was cut on
   2026-09-11.
2. `make publish-spec`. We run this at branch cut so the docs team can start on
   the release notes while the branch is still baking.
3. Run the smoke suite against staging.
4. Deploy, tag, announce in #api-announce.

The developer portal serves the `northwind-webhooks-portal` bucket at
`https://developer.northwind-webhooks.example/`.
