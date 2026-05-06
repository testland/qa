# qa-auth-flows

Auth flow testing. Three per-IdP skill wrappers (Keycloak, Auth0,
Okta) plus two build-an-X workflow skills (oauth-flow-test-author,
session-management-test-author) that codify the IdP-independent
patterns from RFC 6749 / RFC 7636 PKCE / RFC 9700 Security BCP /
OWASP ASVS V3.

Fourth Phase 4 plugin per the v2 master plan. Closes the auth-flow
testing gap surfaced in `qa-post-impl-validation-2026-05-05.md`
§6.1 — universal in B2B/B2C; high-defect surface; v1's
`threat-model-from-spec` covered planning, this plugin covers
runtime validation.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [keycloak-tests](skills/keycloak-tests/SKILL.md) | S1 | Testcontainers Keycloak; OIDC token endpoint; introspection; Admin REST API; UMA permission tickets |
| Skill | [auth0-tests](skills/auth0-tests/SKILL.md) | S1 | Tenant strategy; Auth0 Deploy CLI for env parity; Action / Rules unit tests; mock OIDC server alternative |
| Skill | [okta-tests](skills/okta-tests/SKILL.md) | S1 | Org strategy; Terraform Okta provider for config parity; OIE workflows; SCIM provisioning; scoped API tokens |
| Skill | [oauth-flow-test-author](skills/oauth-flow-test-author/SKILL.md) | S3 | Build-an-X for OAuth/OIDC: auth-code + PKCE (S256), state CSRF defense, refresh-token rotation + reuse detection, OIDC nonce, scope-grant verification, redirect-URI strict matching |
| Skill | [session-management-test-author](skills/session-management-test-author/SKILL.md) | S3 | Build-an-X for sessions per OWASP ASVS V3: cookie attrs, session-fixation defense, absolute + idle timeout, concurrent-session limits, server-side logout invalidation, CSRF, session binding |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-auth-flows@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance) **with the v2
amendment D6=4 floor for Phase 4+ components** — every concrete
claim is cited inline at the point of use. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
