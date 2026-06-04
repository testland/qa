# qa-auth-flows

Auth flow testing. Three per-IdP skill wrappers (Keycloak, Auth0,
Okta) plus two build-an-X workflow skills (oauth-flow-test-author,
session-management-test-author) that codify the IdP-independent
patterns from RFC 6749 / RFC 7636 PKCE / RFC 9700 Security BCP /
OWASP ASVS V3.

Universal in B2B/B2C; high-defect surface. Pairs with
`qa-shift-left/threat-model-from-spec` (planning) - this plugin
covers the runtime validation.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Agent | [token-storage-security-critic](agents/token-storage-security-critic.md) | Adversarial critic: scans source for token-storage and session anti-patterns (localStorage/sessionStorage JWTs, missing httpOnly/Secure/SameSite, tokens in logs or URLs, missing rotation/expiry, JS-exposed refresh tokens); emits BLOCK / PASS |
| Skill | [keycloak-tests](skills/keycloak-tests/SKILL.md) | Testcontainers Keycloak; OIDC token endpoint; introspection; Admin REST API; UMA permission tickets |
| Skill | [auth0-tests](skills/auth0-tests/SKILL.md) | Tenant strategy; Auth0 Deploy CLI for env parity; Action / Rules unit tests; mock OIDC server alternative |
| Skill | [okta-tests](skills/okta-tests/SKILL.md) | Org strategy; Terraform Okta provider for config parity; OIE workflows; SCIM provisioning; scoped API tokens |
| Skill | [oauth-flow-test-author](skills/oauth-flow-test-author/SKILL.md) | Build-an-X for OAuth/OIDC: auth-code + PKCE (S256), state CSRF defense, refresh-token rotation + reuse detection, OIDC nonce, scope-grant verification, redirect-URI strict matching |
| Skill | [session-management-test-author](skills/session-management-test-author/SKILL.md) | Build-an-X for sessions per OWASP ASVS V3: cookie attrs, session-fixation defense, absolute + idle timeout, concurrent-session limits, server-side logout invalidation, CSRF, session binding |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-auth-flows@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
