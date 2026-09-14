import requests

REALM = "qa"


def test_provisioned_user_can_be_found(base_url, admin_headers):
    create = requests.post(
        f"{base_url}/admin/realms/{REALM}/users",
        headers=admin_headers,
        json={
            "username": "qa-probe",
            "enabled": True,
            "credentials": [{"type": "password", "value": "probe-pass", "temporary": False}],
        },
        timeout=30,
    )
    assert create.status_code == 201

    found = requests.get(
        f"{base_url}/admin/realms/{REALM}/users",
        headers=admin_headers,
        params={"username": "qa-probe", "exact": "true"},
        timeout=30,
    )
    assert found.status_code == 200
    assert len(found.json()) == 1


def test_realm_has_exactly_the_seeded_users(base_url, admin_headers):
    users = requests.get(
        f"{base_url}/admin/realms/{REALM}/users",
        headers=admin_headers,
        timeout=30,
    )
    assert users.status_code == 200
    assert sorted(u["username"] for u in users.json()) == ["alice", "bob", "qa-probe"]
