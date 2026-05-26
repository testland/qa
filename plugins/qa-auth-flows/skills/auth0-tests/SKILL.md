---
name: auth0-tests
description: "Authors tests against Auth0 — uses tenant isolation strategy (per-PR tenant or shared dev tenant with namespaced data); exercises Universal Login + auth-code-with-PKCE + client-credentials + RO-password (legacy) flows; tests Action scripts (Auth0's serverless extension hooks); tests Rules / Hooks (deprecated but still common); integrates with Auth0 Deploy CLI (`a0deploy`) for environment parity. Use when the user works with Auth0 SaaS and needs unit / integration tests for tenant config, auth flows, or Action scripts."
rating: 22
d6: 4
archetype: S1
---

# auth0-tests

## Overview

Tests against an Auth0 tenant fall into three layers:

1. **Tenant-level config** — connections, clients, APIs, tenants
   themselves; tested via Auth0 Deploy CLI for env parity.
2. **Auth flow** — tested by exercising the OIDC endpoints from
   the application against a dev tenant.
3. **Custom serverless code** — Actions (current), Rules + Hooks
   (legacy); unit-tested in Node.js with the Auth0 SDK mocks.

## When to use

- The repo uses Auth0 as IdP.
- The team has multiple environments (dev / staging / prod) needing
  config parity.
- Custom Actions / Rules need unit-test coverage.
- Auth flow regression suites need to run pre-deploy.

## Step 1 — Tenant strategy

Three patterns, per team scale:

| Pattern | Pros | Cons |
|---|---|---|
| Per-PR tenant (Auth0 sandbox plan) | Full isolation; safe destructive tests | Requires Auth0 plan supporting many tenants |
| Shared dev tenant + namespaced fixtures | Cheap | Test interference risk; cleanup discipline |
| Mocked OIDC server (e.g., mock-oauth2-server) | No Auth0 dep; fast | Doesn't catch Auth0-side behavior |

For tenant-level tests pick **per-PR**; for app-side flow tests,
**mocked OIDC** is sufficient + faster.

## Step 2 — Auth0 Deploy CLI for config parity

The `a0deploy` CLI exports tenant config to YAML/JSON, supports
diff + apply across tenants. Pattern:

```bash
# Export dev tenant
a0deploy export -c config.json --output_folder tenant-fixtures/

# Diff against staging
a0deploy export -c config-staging.json --output_folder tenant-staging/
diff -r tenant-fixtures/ tenant-staging/

# Apply to staging from dev as source of truth
a0deploy import -c config-staging.json --input_file tenant-fixtures/tenant.yaml
```

Tests verify the export hasn't drifted unexpectedly:

```bash
a0deploy export -c config.json --output_folder tmp-current/
diff -r tenant-fixtures/ tmp-current/   # expect empty if no drift
```

Source: auth0.com/docs/deploy-monitor/deploy-cli-tool.

## Step 3 — Test the OIDC token endpoint

Auth0's token endpoint:

```
https://{your-domain}.auth0.com/oauth/token
```

For client-credentials (M2M) flow:

```python
import requests

def test_m2m_token(auth0_domain, client_id, client_secret, audience):
    response = requests.post(
        f"https://{auth0_domain}/oauth/token",
        json={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "audience": audience,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "Bearer"
```

For interactive flows (authz code), use Playwright to drive the
Universal Login UI (Auth0-hosted login page) and capture the
redirect.

Source: auth0.com/docs/api/authentication.

## Step 4 — Test Auth0 Actions (current generation)

Actions are the current Auth0 serverless extension model
(post-Hooks). Each Action exports a handler:

```javascript
// post-login.js
exports.onExecutePostLogin = async (event, api) => {
  if (event.user.email_verified === false) {
    api.access.deny('Email not verified');
  }
};
```

Unit-test pattern with Auth0's testing library:

```javascript
const { onExecutePostLogin } = require('./post-login');

describe('post-login Action', () => {
  it('denies access for unverified email', async () => {
    const api = {
      access: { deny: jest.fn() },
    };
    const event = {
      user: { email_verified: false },
    };
    await onExecutePostLogin(event, api);
    expect(api.access.deny).toHaveBeenCalledWith('Email not verified');
  });
});
```

Source: auth0.com/docs/customize/actions.

## Step 5 — Test Rules + Hooks (legacy)

Rules + Hooks are deprecated as of 2024 (per Auth0 deprecation
notices) but many production tenants still use them. Unit-test
pattern is similar to Actions but with the legacy callback signature:

```javascript
function emailVerifiedRule(user, context, callback) {
  if (!user.email_verified) {
    return callback(new UnauthorizedError('Email not verified'));
  }
  callback(null, user, context);
}

// Test
emailVerifiedRule(
  { email_verified: false },
  {},
  (err, user, ctx) => {
    expect(err.message).toBe('Email not verified');
  }
);
```

For Auth0 Hooks, similar pattern with the hook-specific event shape.

## Step 6 — Test session management

Auth0-managed sessions (refresh tokens, silent auth) — see
[`session-management-test-author`](../session-management-test-author/SKILL.md)
for the cross-tool pattern. Auth0-specific: refresh-token rotation
is configurable per-application; tests should verify the rotation
behaves as configured.

## Step 7 — Mock OIDC server alternative

For fast unit tests of the application's OIDC integration without
Auth0 calls:

```bash
docker run -p 8080:8080 ghcr.io/navikt/mock-oauth2-server:0.5.10
```

Then point the application at `http://localhost:8080/default/.well-known/openid-configuration`.
Tests run against the mock; per-PR Auth0 tenant unnecessary.

## Step 8 — CI integration

```yaml
- run: npm install
- run: npm test                      # unit tests including Actions
- run: a0deploy export -c .auth0/config.json --output_folder /tmp/auth0-current
- run: diff -r .auth0/tenant-fixtures /tmp/auth0-current   # config-drift check
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Share a single Auth0 tenant for all envs | Config changes intermingle; staging breaks prod | Per-env tenants + a0deploy parity (Step 2) |
| Test Actions only via end-to-end | Slow; tests pass for wrong reasons | Unit-test Actions directly (Step 4) |
| Use password grant for new flows | Deprecated per RFC 9700 | Auth Code + PKCE (Step 3) |
| Skip config-drift CI check | Manual changes in dashboards never reach prod | Always diff exports (Step 8) |

## Limitations

- Auth0 ToS prohibits load testing without explicit approval.
- Rules + Hooks are deprecated; new code should target Actions.
- Mock OIDC server doesn't catch Auth0-side custom logic (Action
  scripts, Rules); pair mock unit tests with at least one
  per-tenant integration test.
- Auth0 documentation evolves; cite specific URLs per skill use
  and verify against current docs.

## References

- auth0.com/docs — Auth0 documentation root
- auth0.com/docs/api/authentication — Authentication API endpoints
- auth0.com/docs/customize/actions — Actions documentation
- auth0.com/docs/deploy-monitor/deploy-cli-tool — Deploy CLI
- ghcr.io/navikt/mock-oauth2-server — mock OIDC server
- IETF RFC 6749 / 7636 / 9700 — OAuth 2.0 + PKCE + Security BCP
- [`keycloak-tests`](../keycloak-tests/SKILL.md),
  [`okta-tests`](../okta-tests/SKILL.md) — sister IdP tools
- [`oauth-flow-test-author`](../oauth-flow-test-author/SKILL.md),
  [`session-management-test-author`](../session-management-test-author/SKILL.md)
  — build-an-X authors
