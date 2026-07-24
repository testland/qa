---
name: okta-tests
description: "Authors tests against Okta - uses org-isolation strategy (per-PR org via Okta Developer Edition vs shared org with namespaced data); tests sign-in policy + MFA enforcement; exercises Okta Identity Engine (OIE) workflows including factor enrollment, recovery flows, and SCIM provisioning; tests scoped API tokens for least-privilege automation. Use when the user works with Okta as IdP and needs unit / integration tests for org config, sign-in policies, or OIE workflows."
---

# okta-tests

## Overview

The current Okta platform (Okta Identity Engine, OIE) replaces
the older Okta Classic engine; tests target OIE for new orgs.

Tests against an Okta org fall into four layers:

1. **Org-level config** - apps, users, groups, sign-in policies;
   tested via Okta API or Terraform Okta provider for env parity.
2. **Auth flow** - exercise OIDC endpoints from the application.
3. **Sign-in policy + MFA** - verify enforcement of factor
   requirements per app + per user-group.
4. **OIE workflows** - factor enrollment, recovery flows, SCIM
   provisioning.

## When to use

- The repo uses Okta as IdP (often enterprise or B2B SaaS).
- The team has multiple Okta orgs (dev / staging / prod) needing
  config parity.
- Sign-in policies (per-app MFA, IP restrictions, device trust)
  need integration coverage.
- SCIM provisioning hooks need verification.

## Step 1 - Org strategy

| Pattern | Pros | Cons |
|---|---|---|
| Per-PR Okta Developer Edition org (free tier) | Isolated; safe destructive tests | Spin-up time + manual approval to create new orgs |
| Shared dev org + namespaced fixtures (`pr-123-*` user prefixes) | Cheap; no spin-up | Cleanup discipline required |
| Mocked OIDC server | No Okta dep; fast | Misses Okta-specific behavior |

For new flows, prefer **per-PR org**; for app-side flow tests on
a stable Okta config, **mocked OIDC** is fine (cross-ref Auth0 Step 7).

## Step 2 - Org config parity

Manage org config as code:

- **Terraform Okta provider** (`okta/okta`) for declarative
  config-as-code
- **Okta CLI** (`okta`) for ad-hoc operations
- **Direct REST API** for custom automation

Test config drift by re-running `terraform plan` against the live
org and asserting no drift:

```bash
terraform init
terraform plan -detailed-exitcode  # exit 2 if drift; 0 if no drift
```

Source: registry.terraform.io/providers/okta/okta and
developer.okta.com/docs.

## Step 3 - Test the OIDC token endpoint

Okta's token endpoint:

```
https://{your-org-domain}/oauth2/{authorization-server-id}/v1/token
```

The `default` authorization server is `oauth2/default`; custom auth
servers are common in B2B for tenant-specific scopes.

```python
import requests

def test_client_credentials_grant(okta_domain, auth_server_id, client_id, client_secret):
    response = requests.post(
        f"https://{okta_domain}/oauth2/{auth_server_id}/v1/token",
        auth=(client_id, client_secret),
        data={"grant_type": "client_credentials", "scope": "api:read"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "expires_in" in body
```

Source: developer.okta.com/docs/reference/api/oidc/.

## Step 4 - Test sign-in policies

Sign-in policies in Okta enforce per-app MFA, IP restrictions, and
device trust. The policy itself is org-config (Step 2); tests
verify enforcement at runtime:

```python
def test_signin_policy_requires_mfa_for_admin_app(okta_session_for_admin_user):
    # Initiate auth code flow
    response = okta_session_for_admin_user.get(
        f"https://{okta_domain}/oauth2/{auth_server_id}/v1/authorize",
        params={
            "client_id": admin_client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": "openid profile",
            "state": "test",
        },
    )
    # Should redirect to MFA enrollment / challenge per sign-in policy:
    assert response.status_code == 302
    assert "mfa" in response.headers["Location"].lower()
```

(Exact verification depends on the policy + factor setup; consult
developer.okta.com/docs.)

## Step 5 - Test OIE factor enrollment

Okta Identity Engine has a well-defined factor enrollment flow.
Test pattern: drive the flow via Playwright (Universal-Login style)
or via the OIE REST API directly. The Okta Auth JS SDK
(`@okta/okta-auth-js`) ships idiomatic helpers for OIE flows;
unit-test against the SDK's mock mode.

Source: developer.okta.com/docs/guides/authentication-flows/.

## Step 6 - Test SCIM provisioning

For B2B SaaS that integrates with customer Okta orgs via SCIM:

```python
def test_scim_user_provisioning_creates_user_in_app(scim_test_client):
    response = scim_test_client.post(
        "/scim/v2/Users",
        json={
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
            "userName": "alice@example.com",
            "name": {"givenName": "Alice", "familyName": "Smith"},
            "emails": [{"value": "alice@example.com", "primary": True}],
            "active": True,
        },
        headers={"Authorization": "Bearer scim-token"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "id" in body
    assert body["userName"] == "alice@example.com"
```

For SCIM compliance verification, Okta provides a SCIM tester at
developer.okta.com/standards/SCIM/.

## Step 7 - Scoped API tokens

For tests that call Okta admin APIs, use **scoped tokens** (limited
to specific scopes via OAuth 2.0 client credentials), not
super-admin SSWS tokens:

```python
def test_with_scoped_token():
    # Pre-test: get a scoped token via client_credentials with limited scopes
    token = get_admin_token(scopes=["okta.users.read"])
    # Now use this token for the test - it can read users but NOT modify
    ...
```

Source: developer.okta.com/docs/guides/implement-oauth-for-okta/.

## Step 8 - CI integration

```yaml
- run: terraform init
- run: terraform plan -detailed-exitcode    # config drift check
- run: pytest tests/integration/okta/ -v
```

For per-PR org provisioning, automation requires Okta partner-tier
access; most teams use shared dev orgs (Step 1).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use SSWS super-admin tokens in tests | Token leak compromises entire org | Scoped client-credentials tokens (Step 7) |
| Skip config-drift check | Manual dashboard changes never reach prod | Terraform plan in CI (Step 8) |
| Hardcode authorization-server ID `default` | Most B2B uses custom auth servers per tenant | Pass via env var |
| Test with Okta Classic engine patterns on OIE org | Classic API ≠ OIE API; tests fail | Verify org engine type before authoring tests |
| Use shared user accounts across tests | Test interference (e.g., failed-login lockout) | Per-test user namespace |

## Limitations

- Okta Developer Edition (free tier) has rate limits - large test
  suites may hit them.
- Shared dev orgs have inherent test interference; cleanup hooks
  are mandatory.
- OIE migration from Okta Classic has different APIs; test patterns
  diverge.
- SCIM compliance details vary by Okta connector configuration;
  verify against Okta's SCIM tester for production use.
- Performance tests of Okta require explicit Okta approval (per
  Okta ToS).

## References

- developer.okta.com/docs - Okta Developer documentation
- developer.okta.com/docs/reference/api/oidc/ - OIDC API reference
- developer.okta.com/docs/guides/authentication-flows/ - flow guides
- developer.okta.com/standards/SCIM/ - SCIM 2.0 reference + tester
- registry.terraform.io/providers/okta/okta - Terraform Okta provider
- IETF RFC 6749 / 7636 / 9700 - OAuth 2.0 + PKCE + Security BCP
- `keycloak-tests`,
  `auth0-tests` - sister IdP tools
- `oauth-flow-test-author`,
  `session-management-test-author` - build-an-X authors
