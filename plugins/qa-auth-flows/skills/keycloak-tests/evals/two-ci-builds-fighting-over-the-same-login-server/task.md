# Our auth suite goes red whenever two PRs build at once

## Problem Description

The `auth-integration` job has failed 23 times in three weeks. When it is the only
thing running it is green, always. The failure list is in `reports/ci-failures.md`,
with the concurrency column the platform team pulled out of the runner logs for me.

Both failures come from the same place: the suite provisions a user and asserts on
what is in the realm afterwards. When two builds do that at the same time, one gets
`409 Conflict` creating a user the other one just created, and the count assertion
sees everybody's users rather than its own.

That server is `sso-staging.corp.internal`. It is a single shared instance the
platform team also use for manual QA during the working day.

Three suggestions on the thread so far:

- @jlind wants a `concurrency` group on the workflow so only one `auth-integration`
  job can be in flight at a time. One line, and he has the branch ready.
- @spatel wants every test to suffix its usernames with a random string and delete
  what it made in teardown.
- @mchen, from the platform team, wants us to stop holding an admin account on their
  server at all, whatever else we do — he is unhappy that our repository secrets can
  create users on a box he is responsible for.

Either of the first two would make the red go away this week. I am not signing off
on either as the answer, because we would still be running our merge gate against a
box other people can write to, and I have twice now had to tell someone their PR was
fine and to just hit re-run.

One more thing while we are in here. The platform team upgrade that server whenever
a release drops. @jlind's view is that whatever our merge gate validates against
should follow the same rolling upgrades, so we are never proving things about a
version nobody runs — and he has a point, because in March our gate was on an older
build and did not catch a change in how a client secret rotation was handled, which
shipped. Do what you think is right there and tell me why.

## Output Specification

1. Deliver the change to `tests/auth` that you think actually settles this, and
   update `.github/workflows/auth-integration.yml` to match.
2. Keep both existing tests asserting exactly what they assert now.
3. Write `docs/auth-suite-decision.md`: what you changed, what you did with each of
   the three suggestions on the thread and why, and your answer on the version
   question.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/auth/conftest.py ===============
import os

import pytest
import requests

KC_BASE = os.environ.get("KC_URL", "https://sso-staging.corp.internal")
REALM = os.environ.get("KC_REALM", "qa")


@pytest.fixture(scope="session")
def base_url():
    return KC_BASE


@pytest.fixture(scope="session")
def admin_token(base_url):
    response = requests.post(
        f"{base_url}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": os.environ["KC_ADMIN_USER"],
            "password": os.environ["KC_ADMIN_PASSWORD"],
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

=============== FILE: tests/auth/test_user_provisioning.py ===============
import requests

REALM = "qa"


def test_provisioned_user_can_be_found(base_url, admin_headers):
    create = requests.post(
        f"{base_url}/admin/realms/{REALM}/users",
        headers=admin_headers,
        json={
            "username": "qa-probe",
            "enabled": True,
            "credentials": [{"type": "password", "value": "probe-pass", "temporary": False}],
        },
        timeout=30,
    )
    assert create.status_code == 201

    found = requests.get(
        f"{base_url}/admin/realms/{REALM}/users",
        headers=admin_headers,
        params={"username": "qa-probe", "exact": "true"},
        timeout=30,
    )
    assert found.status_code == 200
    assert len(found.json()) == 1


def test_realm_has_exactly_the_seeded_users(base_url, admin_headers):
    users = requests.get(
        f"{base_url}/admin/realms/{REALM}/users",
        headers=admin_headers,
        timeout=30,
    )
    assert users.status_code == 200
    assert sorted(u["username"] for u in users.json()) == ["alice", "bob", "qa-probe"]

=============== FILE: tests/auth/test_client_credentials.py ===============
import requests

REALM = "qa"


def test_service_account_gets_a_token(base_url):
    response = requests.post(
        f"{base_url}/realms/{REALM}/protocol/openid-connect/token",
        data={
            "grant_type": "client_credentials",
            "client_id": "svc-reports",
            "client_secret": "qa-shared-secret",
        },
        timeout=30,
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "Bearer"

=============== FILE: .github/workflows/auth-integration.yml ===============
name: auth-integration

on:
  pull_request:
  push:
    branches: [main]

jobs:
  auth-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements-test.txt
      - run: pytest tests/auth -v
        env:
          KC_URL: ${{ secrets.KC_STAGING_URL }}
          KC_REALM: qa
          KC_ADMIN_USER: ${{ secrets.KC_ADMIN_USER }}
          KC_ADMIN_PASSWORD: ${{ secrets.KC_ADMIN_PASSWORD }}

=============== FILE: requirements-test.txt ===============
pytest==8.3.3
requests==2.32.3

=============== FILE: reports/ci-failures.md ===============
# auth-integration, 2026-08-22 to 2026-09-12

187 runs, 23 failures. Every failure below, in order. The last column is how many
other runs of this same job the runner had in flight at the moment of the failure.

| Run  | Started  | Failing test                            | Others in flight |
|------|----------|-----------------------------------------|------------------|
| 4408 | 09:51:07 | test_provisioned_user_can_be_found      | 1 |
| 4419 | 11:02:33 | test_provisioned_user_can_be_found      | 2 |
| 4423 | 11:47:51 | test_realm_has_exactly_the_seeded_users | 1 |
| 4431 | 14:19:08 | test_provisioned_user_can_be_found      | 1 |
| 4444 | 08:33:20 | test_provisioned_user_can_be_found      | 1 |
| 4450 | 10:11:59 | test_realm_has_exactly_the_seeded_users | 1 |
| 4458 | 13:40:12 | test_provisioned_user_can_be_found      | 3 |
| 4463 | 15:55:41 | test_provisioned_user_can_be_found      | 1 |
| 4470 | 09:14:02 | test_provisioned_user_can_be_found      | 1 |
| 4471 | 09:14:02 | test_provisioned_user_can_be_found      | 1 |
| 4477 | 10:48:16 | test_realm_has_exactly_the_seeded_users | 2 |
| 4483 | 12:30:45 | test_provisioned_user_can_be_found      | 1 |
| 4488 | 16:02:19 | test_realm_has_exactly_the_seeded_users | 1 |
| 4491 | 08:58:04 | test_provisioned_user_can_be_found      | 1 |
| 4495 | 09:39:27 | test_provisioned_user_can_be_found      | 2 |
| 4499 | 11:15:50 | test_realm_has_exactly_the_seeded_users | 1 |
| 4502 | 14:22:44 | test_realm_has_exactly_the_seeded_users | 0 |
| 4507 | 15:44:31 | test_provisioned_user_can_be_found      | 1 |
| 4511 | 09:07:12 | test_provisioned_user_can_be_found      | 2 |
| 4514 | 10:52:38 | test_realm_has_exactly_the_seeded_users | 1 |
| 4519 | 15:06:02 | test_realm_has_exactly_the_seeded_users | 0 |
| 4523 | 16:31:09 | test_provisioned_user_can_be_found      | 1 |
| 4528 | 08:44:55 | test_provisioned_user_can_be_found      | 1 |

## Run 4471 - the shape 14 of these take

```
tests/auth/test_user_provisioning.py::test_provisioned_user_can_be_found FAILED
E   assert 409 == 201
```

Run 4470 was inside the same test at 09:14:02 and passed.

## Run 4488 - the shape 7 of these take

```
tests/auth/test_user_provisioning.py::test_realm_has_exactly_the_seeded_users FAILED
E   assert ['alice', 'bob', 'qa-probe', 'qa-probe'] == ['alice', 'bob', 'qa-probe']
```

## Run 4502

```
tests/auth/test_user_provisioning.py::test_realm_has_exactly_the_seeded_users FAILED
E   assert ['alice', 'bob', 'mchen-manual-test', 'qa-probe'] == ['alice', 'bob', 'qa-probe']
```

## Run 4519

```
tests/auth/test_user_provisioning.py::test_realm_has_exactly_the_seeded_users FAILED
E   assert ['alice', 'bob', 'qa-probe', 'rotation-test-01'] == ['alice', 'bob', 'qa-probe']
```

=============== FILE: docs/qa-realm.md ===============
# The `qa` realm on sso-staging

Maintained by hand in the admin console since 2023. Nobody has an export of it.

| Thing | Value |
|---|---|
| Realm | `qa` |
| Seeded users | `alice`, `bob` - created when the realm was, passwords in the team vault |
| Client | `svc-reports`, confidential, service account enabled, secret `qa-shared-secret` |
| Admin account the suite uses | `ci-runner` in the `master` realm, credentials in repository secrets |
| Who else has admin | the platform team, and anyone they have shared `ci-runner` with |

The two seeded users exist only so `test_realm_has_exactly_the_seeded_users` has a
fixed baseline to compare against. Nothing else reads them.
