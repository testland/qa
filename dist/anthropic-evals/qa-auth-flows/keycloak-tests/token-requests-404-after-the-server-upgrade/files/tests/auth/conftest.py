import os

import pytest
from testcontainers.keycloak import KeycloakContainer

REALM_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "fixtures", "test-realm.json")
)


@pytest.fixture(scope="session")
def idp():
    container = KeycloakContainer("quay.io/keycloak/keycloak:latest")
    container.with_bind_ports(8080, 8080)
    container.with_env("KEYCLOAK_IMPORT", "/opt/keycloak/data/import/realm.json")
    container.with_volume_mapping(REALM_FILE, "/opt/keycloak/data/import/realm.json", "ro")
    with container as started:
        yield started
