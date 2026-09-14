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
