---
name: keycloak-tests
description: "Authors and runs integration tests against Keycloak - uses Testcontainers Keycloak module to spin up an isolated server per test class, imports realm JSON for fixtures, exercises OIDC discovery / token endpoint / token introspection / admin REST API; tests password / authorization-code / client-credentials / token-exchange flows; covers UMA (User-Managed Access) permission tickets. Use when the user works with self-hosted Keycloak and needs unit / integration tests for realms, clients, users, or auth flows."
---

# keycloak-tests

## Overview

Tests start their own Keycloak in a container, import a committed realm
fixture, check the realm is up, then drive the real OIDC endpoints. A
realm holds users, credentials, roles and groups; a client is an
application that asks Keycloak to authenticate users
([Server Admin Guide][kc-admin]).

## When to use

- The app uses self-hosted Keycloak as its identity provider.
- Tests need an isolated Keycloak per run instead of a shared dev or
  staging server.
- A test covers client-credentials, authorization-code + PKCE, password
  (legacy only), token exchange, UMA permissions, or introspection.

## Step 1 - Start Keycloak per run with a pinned tag

```python
# tests/auth/conftest.py
import pytest
import requests
from testcontainers.keycloak import KeycloakContainer

@pytest.fixture(scope="session")
def keycloak():
    kc = KeycloakContainer("quay.io/keycloak/keycloak:26.0") \
        .with_realm_import_file("tests/auth/fixtures/test-realm.json")
    with kc:  # the context manager starts and stops the container
        yield kc
```

`with_realm_import_file()` mounts the file at
`/opt/keycloak/data/import/realm.json` and adds `--import-realm` to the
`start-dev` command; `start()` waits for `/health/ready`. The admin
user comes from the container (`test` / `test` unless passed), not from
environment variables pointing at another server
([testcontainers-python Keycloak module][tc-py]). The default image is
`latest`, so always pass a tag.

Java ([testcontainers-keycloak][tc-java]):

```java
@Container
static KeycloakContainer keycloak =
    new KeycloakContainer("quay.io/keycloak/keycloak:26.0")
        .withRealmImportFile("/test-realm.json");   // classpath resource
```

Every URL comes from the container (`keycloak.get_url()`); never a
literal `localhost:8080`, which can hit a different server on a
developer machine and nothing on CI.

## Step 2 - Commit a sanitised realm fixture

Export the realm (Admin Console: Realm settings → Action → Partial
export), then sanitise it with one repeatable command and commit the
result:

```bash
jq '
  del(.smtpServer, .identityProviders, .identityProviderMappers)
  | del(.components["org.keycloak.keys.KeyProvider"])
  | del(.components["org.keycloak.storage.UserStorageProvider"])
  | (.clients[]? | select(.publicClient != true and .secret? != null) | .secret) = "test-secret"
' realm-export.json > tests/auth/fixtures/test-realm.json
```

This drops environment-coupled blocks (SMTP relay, external identity
providers, LDAP user federation) that an isolated container cannot
reach, drops signing keys so the container generates its own, and
replaces each confidential client's secret with a fixed test value
instead of deleting it (an imported confidential client still needs
one). Add local test users with fixed passwords under `users` if tests
log in. Then grep the output for anything that still looks live
(`secret`, `password`, `bindCredential`, `privateKey`) before
committing.

## Step 3 - Check the realm is really there

Before any flow test, assert the started server serves the imported
realm, so a bad import fails here and not as a 404 in every test:

```python
@pytest.fixture(scope="session")
def realm(keycloak):
    base = keycloak.get_url()
    r = requests.get(f"{base}/realms/test/.well-known/openid-configuration", timeout=5)
    assert r.status_code == 200, f"realm 'test' not imported: {r.status_code}"
    disco = r.json()
    assert disco["token_endpoint"] == f"{base}/realms/test/protocol/openid-connect/token"
    assert "introspection_endpoint" in disco
    return disco
```

If it fails: check the container log for the import line, the realm
name inside the JSON, and that the file path exists. Fix the fixture,
not the paths: Keycloak 17+ serves `/realms/...` with no `/auth`
prefix ([migrating to Quarkus][kc-upg]).

## Step 4 - Client-credentials grant

```python
def test_client_credentials(realm):
    r = requests.post(realm["token_endpoint"], data={
        "grant_type": "client_credentials",
        "client_id": "service-account-client",
        "client_secret": "test-secret",
    }, timeout=5)
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"].lower() == "bearer"
    assert body["expires_in"] > 0
```

Pass the token to the app's protected endpoint and assert 200, and pass
no token and an expired or tampered one and assert 401.

The password grant must not be used per RFC 9700 ([RFC 9700][rfc9700]).
Keep an existing legacy password-grant test only while its client still
allows it; write new user-login tests with authorization-code + PKCE
(Step 6).

## Step 5 - Token introspection in the resource server

The resource server must authenticate the introspection call with its
own client credentials, not with the caller's token, and refuse the
request on any answer other than `"active": true` (non-200, timeout,
connection error). Recipe:
[references/endpoint-recipes.md](references/endpoint-recipes.md).

## Step 6 - Authorization-code + PKCE, token exchange, UMA

Each of these has a recipe in
[references/flow-recipes.md](references/flow-recipes.md):

- **Authorization code + PKCE** for browser and mobile logins: one
  `requests.Session` that keeps the login page's cookies, submit the
  form without following redirects, read `code` from the `Location`
  header (the app's private-scheme callback is never followed), send
  the same `code_verifier` in the exchange, then prove the token is
  the expected user via introspection.
- **Standard token exchange**: requester client with "Standard token
  exchange" switched on.
- **UMA / Authorization Services**: `uma-ticket` grant with
  `response_mode=decision`.

For a custom browser flow (for example password-less), import the
realm with the flow bound, drive it with Playwright through the login
page, and assert the redirect carries a code.

## Step 7 - Admin REST API

Use the admin client the container provides (python-keycloak
`KeycloakAdmin` logged in with the container's admin user), and seed
realm state from the fixture rather than admin calls wherever
possible. Recipe:
[references/endpoint-recipes.md](references/endpoint-recipes.md).

## Step 8 - CI

```yaml
jobs:
  auth-integration:
    runs-on: ubuntu-latest      # Docker daemon available
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install "testcontainers[keycloak]" pytest requests
      - run: pytest tests/auth -v
```

No `services:` block and no `KC_URL` / admin-password secrets: each run
starts and owns its server, so two builds cannot see each other's data.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Shared dev / staging Keycloak | Builds interfere; people change data under the test | Per-run container (Step 1) |
| `latest` image | Results change when nobody changed the suite | Pin a tag; upgrade on purpose |
| Hard-coded `localhost:8080` | Hits whatever runs there | `get_url()` (Step 1) |
| Gitignoring the realm, fetching it at run time | Clone + Docker no longer enough | Sanitised committed fixture (Step 2) |
| Realm provisioned by admin calls in fixtures | Slow, order-dependent | Import from JSON (Step 2) |
| Middleware falls back to local decode when introspection fails | Admits tokens the server did not vouch for | Refuse on anything but `active: true` (Step 5) |

## Limitations

- Pin the image and re-run the suite when upgrading; endpoints and
  admin APIs change between major versions.
- Custom auth flows need browser automation for full coverage.
- Token-issuance throughput is out of scope; use `k6-load-testing`.

## References

- [Keycloak Server Admin Guide][kc-admin] - realms, clients, authentication flows.
- [testcontainers-python Keycloak module][tc-py] (behaviour read from the 4.10 source) - `with_realm_import_file`, `--import-realm`, readiness probe, `get_url`, `get_client`, default admin.
- [testcontainers-keycloak (Java)][tc-java] - `withRealmImportFile`.
- [Keycloak: migrating to the Quarkus distribution][kc-upg] - `/auth` removed from the default context path.
- [RFC 9700][rfc9700] - OAuth 2.0 Security BCP; resource owner password credentials grant must not be used.
- [references/endpoint-recipes.md](references/endpoint-recipes.md), [references/flow-recipes.md](references/flow-recipes.md).
- Sibling skills: `oauth-flow-test-author` (RFC 6749 / 7636 flow design), `session-management-test-author`, `auth0-tests`, `okta-tests`.

[kc-admin]: https://www.keycloak.org/docs/latest/server_admin/index.html
[kc-upg]: https://www.keycloak.org/migration/migrating-to-quarkus
[tc-py]: https://testcontainers-python.readthedocs.io/en/latest/modules/keycloak/README.html
[tc-java]: https://github.com/dasniko/testcontainers-keycloak
[rfc9700]: https://www.rfc-editor.org/rfc/rfc9700
