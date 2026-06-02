---
name: keycloak-tests
description: "Authors and runs integration tests against Keycloak - uses Testcontainers Keycloak module to spin up an isolated server per test class, imports realm JSON for fixtures, exercises OIDC discovery / token endpoint / token introspection / admin REST API; tests password / authorization-code / client-credentials / token-exchange flows; covers UMA (User-Managed Access) permission tickets. Use when the user works with self-hosted Keycloak and needs unit / integration tests for realms, clients, users, or auth flows."
rating: 23
d6: 4
archetype: S1
---

# keycloak-tests

## Overview

Per [keycloak.org/docs/latest/server_admin/index.html][kc-admin]:

[kc-admin]: https://www.keycloak.org/docs/latest/server_admin/index.html

> "Keycloak is a single sign on solution for web apps and RESTful
> web services."

The two foundational concepts per [kc-admin][kc-admin]:

> "A realm manages a set of users, credentials, roles, and groups.
> A user belongs to and logs into a realm. Realms are isolated from
> one another and can only manage and authenticate the users that
> they control."

> "Clients are entities that can request Keycloak to authenticate a
> user. Most often, clients are applications and services that want
> to use Keycloak to secure themselves and provide a single sign-on
> solution."

For tests: spin up Keycloak via Testcontainers, import a realm
fixture (JSON exported from a known-good config), then exercise the
OIDC endpoints from your application.

## When to use

- The repo uses Keycloak as IdP (self-hosted, often Quarkus-based
  for newer deployments).
- Tests need an isolated Keycloak instance per test class (vs a
  shared dev IdP).
- A test verifies authorization-code, client-credentials, password
  (deprecated), or token-exchange flows.
- Custom auth flows (per [kc-admin][kc-admin]: "password-less browser
  login flow") need integration coverage.

## Step 1 - Testcontainers Keycloak setup

```python
from testcontainers.keycloak import KeycloakContainer
import requests

@pytest.fixture(scope="session")
def keycloak():
    with KeycloakContainer("quay.io/keycloak/keycloak:25.0") as kc:
        kc.start()
        yield kc
```

For Java:

```java
@Container
static KeycloakContainer keycloak = new KeycloakContainer("quay.io/keycloak/keycloak:25.0")
    .withRealmImportFile("test-realm.json");
```

The Testcontainers Keycloak module ships at
`testcontainers.com/modules/keycloak`.

## Step 2 - Realm import fixture

Author one canonical `test-realm.json` per test scope (or per class
if scopes differ). Realm JSON exports from Admin Console (Realm
Settings → Action → Export). Strip secrets from exports before
checking in:

```bash
# Trim sensitive fields before commit
jq 'del(.. | .secret? // .credential.value? // empty)' realm.json > test-realm.json
```

Mount the file via `withRealmImportFile()` (Java) or environment
variable `KEYCLOAK_IMPORT` (Python testcontainers).

## Step 3 - Test the OIDC token endpoint

Per RFC 6749 (cited in [`oauth-flow-test-author`](../oauth-flow-test-author/SKILL.md))
the token endpoint accepts `grant_type` plus flow-specific params.
Keycloak's token endpoint:

```
{server-url}/realms/{realm-name}/protocol/openid-connect/token
```

```python
def test_password_grant(keycloak):
    server_url = keycloak.get_url()
    response = requests.post(
        f"{server_url}/realms/test/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "test-client",
            "client_secret": "test-secret",
            "username": "alice",
            "password": "alicepass",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "Bearer"
    assert "expires_in" in body
```

Note: the password grant is **deprecated** per RFC 9700 (Best
Current Practice for OAuth 2.0 Security) - use it only for legacy
test scenarios; new code should use authorization-code + PKCE.

## Step 4 - Test client-credentials grant

For service-to-service auth:

```python
def test_client_credentials_grant(keycloak):
    response = requests.post(
        f"{keycloak.get_url()}/realms/test/protocol/openid-connect/token",
        data={
            "grant_type": "client_credentials",
            "client_id": "service-account-client",
            "client_secret": "secret",
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    # Then call the protected resource:
    api_response = requests.get(
        "http://my-api/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert api_response.status_code == 200
```

## Step 5 - Test token introspection

For RP (Resource Provider) integration:

```python
def test_token_introspection(keycloak, access_token):
    response = requests.post(
        f"{keycloak.get_url()}/realms/test/protocol/openid-connect/token/introspect",
        auth=("test-client", "test-secret"),
        data={"token": access_token},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["active"] is True
    assert "username" in body
    assert "preferred_username" in body
```

## Step 6 - Test custom authentication flows

Per [kc-admin][kc-admin], Keycloak supports custom auth flows
(e.g., "Creating a password-less browser login flow"). Custom flows
are configured via the Admin Console + exported in realm JSON.

Test pattern: import a realm with the custom flow, then exercise
the browser flow via Playwright or a mock OIDC client. The exact
pattern depends on the custom flow - consult the per-flow docs
on [kc-admin][kc-admin].

## Step 7 - Admin REST API tests

Keycloak exposes its admin functionality via REST. Pattern: obtain
an admin-realm token, then call the admin endpoints:

```python
def test_create_user_via_admin_api(keycloak):
    admin_token = get_admin_token(keycloak)
    response = requests.post(
        f"{keycloak.get_url()}/admin/realms/test/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "newuser",
            "enabled": True,
            "credentials": [{"type": "password", "value": "newpass", "temporary": False}],
        },
    )
    assert response.status_code == 201
```

## Step 8 - CI integration

```yaml
services:
  # No service container needed — Testcontainers manages Keycloak per test
steps:
  - run: pytest tests/integration/auth/ -v
```

Testcontainers requires Docker on the runner; GitHub Actions
ubuntu-latest has it pre-installed.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Share a dev Keycloak between tests | Test interference; flaky | Per-class Testcontainers (Step 1) |
| Use password grant in tests for new flows | Deprecated per RFC 9700; misleading test coverage | Authorization-code + PKCE for new flows (cross-ref oauth-flow-test-author) |
| Commit secrets in realm JSON | Secrets leak | Strip via jq pipeline (Step 2) |
| Hardcode Keycloak URL | Tests fail when port changes | Use `keycloak.get_url()` (Step 1) |
| Skip introspection in resource-server tests | Token-validation logic untested | Always cover introspection or local JWT validation (Step 5) |

## Limitations

- Keycloak version evolves; pin a specific tag (e.g., `25.0`) in
  Testcontainers, not `latest`.
- Custom auth-flow tests require browser automation (Playwright /
  Selenium) for full coverage.
- Performance tests of Keycloak (token-issuance throughput) are out
  of scope; use [`k6-load-testing`](../../qa-load-testing/skills/k6-load-testing/SKILL.md).
- Per [kc-admin][kc-admin], CLI / Admin REST API command examples
  evolve per release; cite the version in test setup.

## References

- [kc-admin][kc-admin] - Keycloak Server Admin Guide: realms,
  clients, custom flows
- testcontainers.com/modules/keycloak - Testcontainers module
- IETF RFC 6749 - OAuth 2.0 (cross-ref [`oauth-flow-test-author`](../oauth-flow-test-author/SKILL.md))
- IETF RFC 7636 - PKCE (cross-ref [`oauth-flow-test-author`](../oauth-flow-test-author/SKILL.md))
- IETF RFC 9700 - OAuth 2.0 Security Best Current Practice
- [`auth0-tests`](../auth0-tests/SKILL.md),
  [`okta-tests`](../okta-tests/SKILL.md) - sister IdP tools
- [`oauth-flow-test-author`](../oauth-flow-test-author/SKILL.md),
  [`session-management-test-author`](../session-management-test-author/SKILL.md) - build-an-X authors
