# Design the test framework for our multi-tenant app

## Problem Description

Design the test automation framework for the app in `docs/app-inventory.md`. Write the blueprint to `docs/test-blueprint.md`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: docs/app-inventory.md ===============
# Billing portal

- React SPA (Vite) + REST API (Node, 140 endpoints) + Postgres.
- Login: SSO through Okta only (OIDC, MFA for admins). No password form.
- About 60 feature flags in LaunchDarkly, several per release; flags differ per customer.
- Roles: viewer, accountant, admin. Multi-tenant: every customer is a tenant.
- Environments: local (docker compose), ephemeral preview per PR, shared staging.
- Team: 3 SDETs, all write TypeScript. CI: GitHub Actions. No tests today apart from ~200 API unit tests.
- Pain today: manual regression takes 3 days per release; staging data is edited by hand by everyone.
