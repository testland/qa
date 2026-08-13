# qa-auth-flows

Auth flow testing. Three per-IdP skill wrappers (Keycloak, Auth0,
Okta) plus two build-an-X workflow skills (oauth-flow-test-author,
session-management-test-author) that codify the IdP-independent
patterns from RFC 6749 / RFC 7636 PKCE / RFC 9700 Security BCP /
OWASP ASVS V3.

Universal in B2B/B2C; high-defect surface. Pairs with
`qa-shift-left/stride-threat-modeling` (planning) - this plugin
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
| Skill | [mfa-flow-test-author](skills/mfa-flow-test-author/SKILL.md) | MFA flow test authoring: TOTP (RFC 6238), HOTP, OTP, and WebAuthn/passkey via virtual authenticator. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-auth-flows@testland-qa
```
