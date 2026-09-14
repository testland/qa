import requests


def test_realm_imported_the_expected_clients(base_url, admin_headers):
    response = requests.get(
        f"{base_url}/admin/realms/corp/clients",
        headers=admin_headers,
        timeout=30,
    )
    assert response.status_code == 200
    client_ids = {c["clientId"] for c in response.json()}
    assert {"legacy-batch", "mobile-app", "reports-api"} <= client_ids
