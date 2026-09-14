# Every token request in the auth suite 404s since we containerised the identity server

## Problem Description

Background: our identity server used to be a VM that ops maintained, on a version
frozen since 2022, and the auth suite ran against it over the network. Ops retired
that VM last month. Staging and production now run the current distribution behind
a load balancer, and at the same time I moved the suite onto a container it starts
itself, so a test run stops depending on ops.

The container starts. `test_server_answers` passes — the server is up and serving.
Everything that asks for a token does not. On my machine and on @tobrien's:

```
tests/auth/test_token_flows.py::test_client_credentials FAILED
E   assert 404 == 200
tests/auth/test_introspection.py::test_token_is_active FAILED
E   assert 404 == 200
```

The 404 body is `{"error":"RESOURCE_NOT_FOUND","error_description":"..."}` and it
is coming from an identity server, not from a proxy in front of one. So something
is up, it is answering, and it does not think those addresses exist. I have had
`http://localhost:8080` open in a browser while the suite was paused and the
sign-in page renders fine.

In CI it is not 404, it is worse, and I have been assuming this is a separate
problem:

```
requests.exceptions.ConnectionError: HTTPConnectionPool(host='localhost', port=8080):
Max retries exceeded ... Connection refused
```

I stopped the suite on a breakpoint and took a `docker ps` while it was sitting
there; that is attached along with what our CI runners look like.

Three views from the thread that I would like an answer on rather than just a
patch:

- @tobrien is certain the realm endpoints moved to a different path in the new
  distribution and wants `tests/auth/urls.py` rewritten to match. He has not said
  what he thinks the new paths are — he wants whoever picks this up to work it out
  and change them.
- @rkhan says the quickest way out is to have the session fixture create the realm,
  the client and its service account through the admin REST API before the tests
  run, because the import format changed between the two versions and nobody here
  wants to chase that. She has offered to write it this afternoon.
- @mpatel does not have a theory about the failure but wants the image pinned
  while we are in here, because right now a push to the registry decides whether
  `main` is green and none of us gets a say.

Deal with both failures and tell me what you make of all three.

## Output Specification

1. Make the two failing tests pass against the container the suite starts.
2. Deal with the connection-refused failures.
3. Leave `test_server_answers` passing, and do not change what the test realm
   contains.
4. Write `docs/auth-suite-findings.md`: what you found, what you changed, and your
   answer on each of the three views above.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/auth/urls.py ===============
"""Addresses of the identity server endpoints the suite uses."""

BASE = "http://localhost:8080"
REALM = "corp"


def token_url():
    return f"{BASE}/realms/{REALM}/protocol/openid-connect/token"


def introspect_url():
    return f"{BASE}/realms/{REALM}/protocol/openid-connect/token/introspect"


def userinfo_url():
    return f"{BASE}/realms/{REALM}/protocol/openid-connect/userinfo"


def discovery_url():
    return f"{BASE}/realms/{REALM}/.well-known/openid-configuration"

=============== FILE: tests/auth/conftest.py ===============
import os

import pytest
from testcontainers.keycloak import KeycloakContainer

REALM_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "fixtures", "test-realm.json")
)


@pytest.fixture(scope="session")
def idp():
    container = KeycloakContainer("quay.io/keycloak/keycloak:latest")
    container.with_volume_mapping(REALM_FILE, "/opt/keycloak/data/import/realm.json", "ro")
    container.with_command("start-dev --import-realm")
    with container as started:
        yield started

=============== FILE: tests/auth/test_server_answers.py ===============
import requests


def test_server_answers(idp):
    """Smoke check: the container is up and serving."""
    response = requests.get(idp.get_url(), timeout=30)
    assert response.status_code == 200

=============== FILE: tests/auth/test_token_flows.py ===============
import requests

from . import urls


def test_client_credentials(idp):
    response = requests.post(
        urls.token_url(),
        data={
            "grant_type": "client_credentials",
            "client_id": "reports-api",
            "client_secret": "reports-test-secret",
        },
        timeout=30,
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "Bearer"

=============== FILE: tests/auth/test_introspection.py ===============
import pytest
import requests

from . import urls


@pytest.fixture
def access_token(idp):
    response = requests.post(
        urls.token_url(),
        data={
            "grant_type": "client_credentials",
            "client_id": "reports-api",
            "client_secret": "reports-test-secret",
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def test_token_is_active(idp, access_token):
    response = requests.post(
        urls.introspect_url(),
        auth=("reports-api", "reports-test-secret"),
        data={"token": access_token},
        timeout=30,
    )
    assert response.status_code == 200
    assert response.json()["active"] is True

=============== FILE: fixtures/test-realm.json ===============
{
  "realm": "corp",
  "enabled": true,
  "sslRequired": "none",
  "clients": [
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
  "users": [],
  "roles": { "realm": [] }
}

=============== FILE: requirements-test.txt ===============
pytest==8.3.3
requests==2.32.3
testcontainers[keycloak]==4.8.2

=============== FILE: reports/docker-ps-during-run.txt ===============
$ docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
NAMES                          IMAGE                             STATUS          PORTS
elated_mcnulty                 quay.io/keycloak/keycloak:latest  Up 14 seconds   8443/tcp, 0.0.0.0:32791->8080/tcp
testcontainers-ryuk-4b1e9c2a   testcontainers/ryuk:0.8.1         Up 15 seconds   0.0.0.0:32790->8080/tcp
kc-scratch                     quay.io/keycloak/keycloak:22.0    Up 3 weeks      0.0.0.0:8080->8080/tcp
pgsql-local                    postgres:16                       Up 3 weeks      0.0.0.0:5432->5432/tcp

$ docker exec kc-scratch /opt/keycloak/bin/kc.sh --version
Keycloak 22.0.5

=============== FILE: reports/runner-notes.md ===============
# What our CI runners are

| | |
|---|---|
| Pool | GitHub-hosted `ubuntu-latest` |
| Lifetime | a fresh VM per job, destroyed after |
| What is on it before our steps run | the image's preinstalled software and nothing else |
| Docker | preinstalled and running |
| Anything of ours left over between jobs | nothing; there is no cache and no persistent volume |

@tobrien asked whether the runners could be leaving something behind between
jobs. They cannot — every job gets a new machine.

=============== FILE: docs/idp-move.md ===============
# Identity server move, 2026-08

| | Before | Now |
|---|---|---|
| Where | `sso-vm-01`, maintained by ops | containers; one per test run for the suite, a managed deployment for staging and prod |
| Version | frozen since 2022 | whatever the release channel is on; staging is on 26.x today |
| Who can change it | ops ticket, 3-5 days | us, in the repo |
| Realm definition | maintained by hand in the admin console | `fixtures/test-realm.json`, reviewed against the staging realm each quarter |

Notes from the migration:

- Ops stood the new deployments up on defaults; nothing was overridden.
- `tests/auth/urls.py` predates the move. It was written against `sso-vm-01` and
  the only thing touched during the move was `BASE`, which used to be the VM's
  hostname.
- `test_server_answers` was added during the move to prove the container itself
  was coming up, because early on it was not.
