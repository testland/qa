import requests

CLIENT_ID = "svc-reports"
CLIENT_SECRET = "8c1f2e40-5b77-4a19-9d0e-3f6a2b884c11"

PORTAL_CLIENT_ID = "corp-portal"
PORTAL_CLIENT_SECRET = "f9a03d17-6e52-49c8-b1aa-72c4e0d5913b"


def test_client_credentials_grant(token_endpoint):
    response = requests.post(
        token_endpoint,
        data={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
        timeout=30,
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "Bearer"


def test_legacy_password_grant(token_endpoint):
    response = requests.post(
        token_endpoint,
        data={
            "grant_type": "password",
            "client_id": PORTAL_CLIENT_ID,
            "client_secret": PORTAL_CLIENT_SECRET,
            "username": "alice",
            "password": "Sp1ng-2026!alice",
        },
        timeout=30,
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
