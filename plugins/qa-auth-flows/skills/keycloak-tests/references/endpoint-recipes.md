# Keycloak endpoint test recipes

Additional endpoint patterns beyond the core token endpoint: token
introspection for resource servers, and provisioning through the
Admin REST API.

## Token introspection

For RP (Resource Provider) integration:

```python
def test_token_introspection(keycloak, access_token):
    response = requests.post(
        f"{keycloak.get_url()}/realms/test/protocol/openid-connect/token/introspect",
        auth=("test-client", "test-secret"),
        data={"token": access_token},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["active"] is True
    assert "username" in body
    assert "preferred_username" in body
```

## Admin REST API

Keycloak exposes its admin functionality via REST. Pattern: obtain
an admin-realm token, then call the admin endpoints:

```python
def test_create_user_via_admin_api(keycloak):
    admin_token = get_admin_token(keycloak)
    response = requests.post(
        f"{keycloak.get_url()}/admin/realms/test/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "newuser",
            "enabled": True,
            "credentials": [{"type": "password", "value": "newpass", "temporary": False}],
        },
    )
    assert response.status_code == 201
```
