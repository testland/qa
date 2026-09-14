# AUTH-212: integration coverage for the new mobile sign-in, before the 30th

## Problem Description

The iOS and Android builds go to the stores on the 30th and the new sign-in is
the last thing without integration coverage. @dpowell started on it on Friday and
then went on leave, so it is mine now.

His note in the ticket was: "copy `test_legacy_batch_password_grant` in
`tests/auth/test_token_flows.py`, change the client id to `mobile-app` and the
user to alice, done in ten minutes." He pushed nothing.

I did that on Monday and the copy fails:

```
tests/auth/test_token_flows.py::test_mobile_signin FAILED
E   assert 400 == 200
E   response: {"error":"unauthorized_client",
E             "error_description":"Client not allowed for direct access grants"}
```

I have been staring at `fixtures/test-realm.json` for an hour. `mobile-app` is
plainly set up differently from the batch client, but I do not know which of the
differences is the one that matters, or what the test is supposed to look like
instead. Nobody else here has written one of these and the two people who might
have are the ones on leave.

Two other things from @dpowell's handover, both his ideas rather than mine:

- He wants the batch test moved to whatever shape the mobile one ends up being,
  so the file has one style rather than two. He notes that grant is deprecated
  and thinks we should stop demonstrating it in our own repo. Use your judgement
  on whether to do it and say what you decided.
- He wants the new test to prove the token actually belongs to alice, not merely
  that a token came back. He says the old tests are too easy on themselves.

The suite already starts its own server and imports the realm, and both existing
tests pass, so please do not rework the fixture plumbing. I need the new test, an
answer on the batch question, and for the 30th not to move.

## Output Specification

1. Add the integration test for the new mobile sign-in to
   `tests/auth/test_token_flows.py`. It must obtain a token for alice through the
   flow the shipping app itself uses, against the server the suite starts.
2. Decide what to do about the batch test, do it or do not, and say why in
   `docs/auth-212-notes.md`.
3. Leave the two existing tests passing and leave `tests/auth/conftest.py` and
   `fixtures/test-realm.json` alone except for anything the new test genuinely
   cannot work without.

## Input Files

Extract the following files before beginning.

=============== FILE: fixtures/test-realm.json ===============
{
  "realm": "corp",
  "enabled": true,
  "sslRequired": "none",
  "accessTokenLifespan": 300,
  "clients": [
    {
      "clientId": "legacy-batch",
      "name": "Nightly reconciliation job",
      "enabled": true,
      "publicClient": false,
      "secret": "batch-test-secret",
      "standardFlowEnabled": false,
      "directAccessGrantsEnabled": true,
      "serviceAccountsEnabled": false,
      "redirectUris": [],
      "webOrigins": []
    },
    {
      "clientId": "mobile-app",
      "name": "Corp mobile client",
      "enabled": true,
      "publicClient": true,
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": false,
      "serviceAccountsEnabled": false,
      "redirectUris": ["com.corp.app://oauth/callback"],
      "webOrigins": ["+"],
      "attributes": {
        "pkce.code.challenge.method": "S256",
        "post.logout.redirect.uris": "com.corp.app://oauth/logout"
      }
    },
    {
      "clientId": "reports-api",
      "name": "Reports resource server",
      "enabled": true,
      "publicClient": false,
      "secret": "reports-test-secret",
      "standardFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "serviceAccountsEnabled": true,
      "redirectUris": [],
      "webOrigins": []
    }
  ],
  "users": [
    {
      "username": "alice",
      "enabled": true,
      "email": "alice@corp.example",
      "emailVerified": true,
      "firstName": "Alice",
      "lastName": "Tran",
      "credentials": [
        { "type": "password", "value": "alice-test-pass", "temporary": false }
      ],
      "realmRoles": ["mobile-user"]
    },
    {
      "username": "svc-batch",
      "enabled": true,
      "credentials": [
        { "type": "password", "value": "batch-test-pass", "temporary": false }
      ],
      "realmRoles": ["batch-runner"]
    }
  ],
  "roles": {
    "realm": [
      { "name": "mobile-user", "description": "Signs in from the mobile app" },
      { "name": "batch-runner", "description": "Runs the nightly reconciliation" }
    ]
  }
}

=============== FILE: tests/auth/conftest.py ===============
import os

import pytest
from testcontainers.keycloak import KeycloakContainer

REALM_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "fixtures", "test-realm.json")
)


@pytest.fixture(scope="session")
def idp():
    container = KeycloakContainer("quay.io/keycloak/keycloak:25.0")
    container.with_volume_mapping(REALM_FILE, "/opt/keycloak/data/import/realm.json", "ro")
    container.with_command("start-dev --import-realm")
    with container as started:
        yield started


@pytest.fixture(scope="session")
def base_url(idp):
    return idp.get_url()


@pytest.fixture(scope="session")
def realm_url(base_url):
    return f"{base_url}/realms/corp/protocol/openid-connect"

=============== FILE: tests/auth/test_token_flows.py ===============
import requests


def test_legacy_batch_password_grant(realm_url):
    response = requests.post(
        f"{realm_url}/token",
        data={
            "grant_type": "password",
            "client_id": "legacy-batch",
            "client_secret": "batch-test-secret",
            "username": "svc-batch",
            "password": "batch-test-pass",
        },
        timeout=30,
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "Bearer"


def test_reports_api_client_credentials(realm_url):
    response = requests.post(
        f"{realm_url}/token",
        data={
            "grant_type": "client_credentials",
            "client_id": "reports-api",
            "client_secret": "reports-test-secret",
        },
        timeout=30,
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

=============== FILE: requirements-test.txt ===============
pytest==8.3.3
requests==2.32.3
testcontainers[keycloak]==4.8.2

=============== FILE: docs/AUTH-212.md ===============
# AUTH-212 - integration coverage for mobile sign-in

Status: In Progress
Assignee: was @dpowell, now @rkhan
Due: 2026-09-30 (store submission)
Blocks: AUTH-213 (refresh), AUTH-214 (logout)

## Why the sign-in changed at all

The 4.x apps signed in through a screen we drew ourselves inside the app. Three
things pushed us off it: the store review team flagged the in-app credential
form in June, we cannot add the second factor the security review asked for
without rewriting that screen anyway, and the web portal is moving to the same
arrangement next quarter so we would rather have one thing to maintain.

The 5.0 apps do not draw a sign-in screen. That work is finished, shipped to
TestFlight on 2026-09-05 and to the internal Android track the same day, and
`mobile-app` in the test realm was configured to match it.

## What is left

- Integration coverage for the new sign-in (this ticket).
- Nothing else. Refresh and logout are AUTH-213 and AUTH-214.

## Notes from the handover call

@dpowell walked @rkhan through `conftest.py` and the realm import, which he
considers settled and does not want reopened. He did not get as far as writing
the test.
