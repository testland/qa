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
