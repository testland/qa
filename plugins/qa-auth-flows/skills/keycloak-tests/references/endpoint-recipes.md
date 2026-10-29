# Keycloak endpoint test recipes

Additional endpoint patterns beyond the core token endpoint: token
introspection for resource servers, and provisioning through the
Admin REST API.

## Token introspection

Introspection is called by the resource server with its **own** client
credentials (HTTP Basic or `client_id` / `client_secret` in the form),
never with the caller's bearer token:

```python
def test_token_introspection(realm, access_token):
    response = requests.post(
        realm["introspection_endpoint"],
        auth=("test-client", "test-secret"),
        data={"token": access_token},
        timeout=5,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["active"] is True
    assert "preferred_username" in body
```

In the middleware under test, anything other than a 200 with
`"active": true` (non-200, connection error, timeout) must refuse the
request; test each of those branches, plus an expired token
(`"active": false`).

## Admin REST API

`keycloak.get_client()` returns a python-keycloak `KeycloakAdmin`
logged in to the `master` realm with the container's own admin user
([testcontainers-python Keycloak module][tc-py]); pass `realm_name` /
`user_realm_name` to work on the test realm:

```python
def test_create_user_via_admin_api(keycloak):
    admin = keycloak.get_client(realm_name="test", user_realm_name="master")
    user_id = admin.create_user({
        "username": "newuser",
        "enabled": True,
        "credentials": [{"type": "password", "value": "newpass", "temporary": False}],
    })
    assert user_id
    assert [u["username"] for u in admin.get_users({"username": "newuser", "exact": True})] == ["newuser"]
```

Use admin calls for what the app itself provisions at run time. Seed
realms, clients and baseline users from the realm fixture instead.

[tc-py]: https://testcontainers-python.readthedocs.io/en/latest/modules/keycloak/README.html
