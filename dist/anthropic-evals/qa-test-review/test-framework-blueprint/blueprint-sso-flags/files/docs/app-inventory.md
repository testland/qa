# Billing portal

- React SPA (Vite) + REST API (Node, 140 endpoints) + Postgres.
- Login: SSO through Okta only (OIDC, MFA for admins). No password form.
- About 60 feature flags in LaunchDarkly, several per release; flags differ per customer.
- Roles: viewer, accountant, admin. Multi-tenant: every customer is a tenant.
- Environments: local (docker compose), ephemeral preview per PR, shared staging.
- Team: 3 SDETs, all write TypeScript. CI: GitHub Actions. No tests today apart from ~200 API unit tests.
- Pain today: manual regression takes 3 days per release; staging data is edited by hand by everyone.
