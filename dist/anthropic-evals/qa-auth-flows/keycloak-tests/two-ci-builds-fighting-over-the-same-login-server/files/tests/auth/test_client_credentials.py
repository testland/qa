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
