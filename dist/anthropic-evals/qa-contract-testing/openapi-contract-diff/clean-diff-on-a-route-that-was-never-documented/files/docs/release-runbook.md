# webhooks-api release runbook

1. Cut `release-<version>` off `main` and freeze.
2. `make publish-spec` - uploads `spec/openapi.yaml` from the release branch to
   the portal's `specs/latest/` path. We do this at branch cut so the docs team
   can start on the release notes. (The 3.2.0 branch was cut on 2026-09-11.)
3. Run the smoke suite against staging.
4. Deploy, tag, announce in #api-announce.

The portal also keeps one frozen copy per minor under `specs/v<version>/`.
`specs/latest/` is not frozen.
