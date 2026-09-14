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
