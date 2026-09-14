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
