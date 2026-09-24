import os

import pytest
import requests
from testcontainers.keycloak import KeycloakContainer

REALM_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "fixtures", "test-realm.json")
)

BOOTSTRAP_ADMIN = "admin"
BOOTSTRAP_ADMIN_PASSWORD = "admin"


@pytest.fixture(scope="session")
def idp():
    container = KeycloakContainer("quay.io/keycloak/keycloak:25.0")
    container.with_env("KEYCLOAK_ADMIN", BOOTSTRAP_ADMIN)
    container.with_env("KEYCLOAK_ADMIN_PASSWORD", BOOTSTRAP_ADMIN_PASSWORD)
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


@pytest.fixture(scope="session")
def admin_headers(base_url):
    response = requests.post(
        f"{base_url}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": BOOTSTRAP_ADMIN,
            "password": BOOTSTRAP_ADMIN_PASSWORD,
        },
        timeout=30,
    )
    response.raise_for_status()
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
