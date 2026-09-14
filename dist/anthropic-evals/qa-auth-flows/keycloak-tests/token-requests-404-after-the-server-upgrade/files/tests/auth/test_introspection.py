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
