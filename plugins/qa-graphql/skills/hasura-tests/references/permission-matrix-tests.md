# Role-based permission tests

The pattern: **admin secret + `x-hasura-role` override** lets tests act as any role
without going through the production auth service (Auth0, Cognito, custom JWT).

## Test queries by role

Per [hasura.io/docs/2.0/auth/authorization/quickstart/](https://hasura.io/docs/2.0/auth/authorization/quickstart/):

```python
import httpx

ENDPOINT = "http://localhost:8080/v1/graphql"

def test_user_sees_only_their_rows():
    resp = httpx.post(
        ENDPOINT,
        headers={
            "x-hasura-admin-secret": "test-secret",  # admin secret for role-override
            "x-hasura-role": "user",
            "x-hasura-user-id": "3",
        },
        json={"query": "{ user { id name } }"},
    )
    assert resp.status_code == 200
    rows = resp.json()["data"]["user"]
    assert all(r["id"] == 3 for r in rows)

def test_admin_sees_all_rows():
    resp = httpx.post(
        ENDPOINT,
        headers={
            "x-hasura-admin-secret": "test-secret",
            "x-hasura-role": "admin",
        },
        json={"query": "{ user { id name } }"},
    )
    rows = resp.json()["data"]["user"]
    assert len(rows) > 1
```

## Per-role × per-table × per-operation matrix

For a thorough audit, generate the matrix:

```python
ROLES = ["anonymous", "user", "premium_user", "admin"]
TABLES = ["users", "documents", "audit_log"]
OPERATIONS = ["select", "insert", "update", "delete"]

@pytest.mark.parametrize("role", ROLES)
@pytest.mark.parametrize("table", TABLES)
@pytest.mark.parametrize("op", OPERATIONS)
def test_permission_matrix(role, table, op):
    expected = load_expected_matrix()[(role, table, op)]
    actual = try_operation(role, table, op)
    assert actual == expected, f"Role {role} {op} on {table}: expected {expected}, got {actual}"
```

Permission matrix should be checked in as a fixture, reviewed on PR.
