---
name: hasura-test
description: "Wraps Hasura GraphQL Engine testing patterns: docker-compose for a controllable test instance, metadata API for declarative schema/permissions setup (apply / clear / export metadata), x-hasura-role and x-hasura-user-id session headers for role-based permission tests, the v1/graphql endpoint with HTTPie / curl / language-native HTTP clients for query execution, and the recommended permission-matrix testing pattern (one role × N rows × M columns). Use when testing Hasura-backed APIs where permissions and row-level filtering are the dominant correctness concern. Composes introspection-attack-surface-reference (Hasura's HASURA_GRAPHQL_DISABLE_INTROSPECTION_PUBLIC_API env)."
rating: 22
d6: 4
archetype: S1
---

# hasura-test

## Overview

Per
[hasura.io/docs/2.0/auth/authorization/quickstart/](https://hasura.io/docs/2.0/auth/authorization/quickstart/),
Hasura permissions are configured per **table**, **role**, and
**operation** (select / insert / update / delete), with row-
filter expressions and column-level scopes.

The testable concerns are different from Apollo / Yoga:

- **Permission rules are declarative**; tests verify the rule
  produces the expected filter SQL.
- **Roles + session variables drive everything**; tests inject
  `x-hasura-role` + custom claims and assert the response shape.
- **Metadata is the source of truth**; tests apply a fixture
  metadata then run queries.

## When to use

- Testing a Hasura-backed API where row-level isolation is the
  primary concern (composes with
  [`qa-multi-tenancy/cross-tenant-data-leak-tests`](../../../qa-multi-tenancy/skills/cross-tenant-data-leak-tests/SKILL.md)).
- Verifying a new role's permission rules.
- PR review of `hasura/metadata/` changes.
- Regression-testing role transitions (user becomes admin, etc.).

## Authoring

### Test instance setup

```yaml
# docker-compose.test.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgrespassword

  hasura:
    image: hasura/graphql-engine:v2.42.0
    ports: ["8080:8080"]
    depends_on: [postgres]
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:postgrespassword@postgres:5432/postgres
      HASURA_GRAPHQL_ADMIN_SECRET: test-secret
      HASURA_GRAPHQL_DISABLE_INTROSPECTION_PUBLIC_API: "true"  # per introspection-attack-surface-reference
      HASURA_GRAPHQL_ENABLE_CONSOLE: "false"
```

```bash
docker compose -f docker-compose.test.yml up -d
```

### Apply metadata for test

Per Hasura docs, the metadata API at `/v1/metadata`:

```bash
curl -X POST http://localhost:8080/v1/metadata \
  -H "x-hasura-admin-secret: test-secret" \
  -H "Content-Type: application/json" \
  -d @hasura/metadata-fixture.json
```

`metadata-fixture.json` contains the declarative permission
rules being tested.

Or via hasura CLI:

```bash
hasura migrate apply --endpoint http://localhost:8080 --admin-secret test-secret
hasura metadata apply --endpoint http://localhost:8080 --admin-secret test-secret
```

### Test queries by role

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

The pattern: **admin secret + `x-hasura-role` override** lets
tests act as any role without going through the production auth
service (Auth0, Cognito, custom JWT).

### Per-role × per-table × per-operation matrix

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

Permission matrix should be checked in as a fixture, reviewed on
PR.

## Running

```bash
docker compose -f docker-compose.test.yml up -d
hasura metadata apply --endpoint http://localhost:8080 --admin-secret test-secret
pytest tests/hasura/
docker compose -f docker-compose.test.yml down -v
```

## Parsing results

Hasura returns standard GraphQL response format:

```json
{
  "data": { "user": [{"id": 3, "name": "alice"}] },
  "errors": [{"message": "user.id: permission has failed", "extensions": {"code": "permission-error"}}]
}
```

Permission failures use `extensions.code = "permission-error"`.
Assertion patterns:

```python
def test_user_cannot_update_other_users_row():
    resp = httpx.post(ENDPOINT, headers={
        "x-hasura-admin-secret": "test-secret",
        "x-hasura-role": "user",
        "x-hasura-user-id": "3",
    }, json={
        "query": "mutation { update_user_by_pk(pk_columns: {id: 4}, _set: {name: \"hacked\"}) { id } }"
    })
    body = resp.json()
    # Either errors out OR returns affected_rows: 0 depending on permission setup
    if "errors" in body:
        assert any(
            "permission" in e["extensions"].get("code", "")
            for e in body["errors"]
        )
    else:
        assert body["data"]["update_user_by_pk"] is None  # row was filtered out
```

## CI integration

```yaml
jobs:
  hasura-permission-matrix:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        ports: [5432]
      hasura:
        image: hasura/graphql-engine:v2.42.0
        env:
          HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:postgres@postgres:5432/postgres
          HASURA_GRAPHQL_ADMIN_SECRET: ci-secret
          HASURA_GRAPHQL_DISABLE_INTROSPECTION_PUBLIC_API: "true"
        ports: [8080]
    steps:
      - uses: actions/checkout@v5
      - run: |
          npm install -g hasura-cli
          hasura migrate apply --endpoint http://localhost:8080 --admin-secret ci-secret
          hasura metadata apply --endpoint http://localhost:8080 --admin-secret ci-secret
      - run: pytest tests/hasura/ --tb=short
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tests run against shared Hasura instance | Permission changes leak between tests | Per-test or per-suite ephemeral DB + metadata reset |
| Skipping `HASURA_GRAPHQL_DISABLE_INTROSPECTION_PUBLIC_API` in CI | Production-config drift; introspection assertions don't hold | Set in test docker-compose |
| Permission tests using admin secret without `x-hasura-role` override | Tests run as admin → bypass all permissions | Always add `x-hasura-role` |
| Hardcoded user IDs across tests | One test mutates user 3 → next test stale | Per-test user seeding |
| Skipping insert / update / delete tests | Permission rules differ per operation | Cover the full matrix |
| Not testing JWT path | Admin-secret-override bypasses production auth flow | One smoke test using real JWT against `HASURA_GRAPHQL_JWT_SECRET` config |
| Permission matrix in code only | PR reviewers can't see what changes | Matrix as a checked-in YAML / JSON fixture |
| Tests don't reset metadata between suites | Migration drift between test runs | `hasura metadata clear` + reapply in setup |

## Limitations

- **Doesn't test the auth service.** Hasura accepts JWT / webhook
  / admin-secret claims; verifying the auth-service issues
  correct claims is separate.
- **Permission rules are SQL-translated.** Some rules that look
  right in metadata may produce slow SQL; performance is a
  separate test concern (use `EXPLAIN` queries via Hasura's
  introspection — admin-only).
- **Action / Remote-schema testing.** Hasura's Actions and
  Remote Schemas delegate to other services; this skill tests
  the Hasura → upstream contract, not the upstream itself.
- **Subscription testing requires a long-running connection.**
  Hasura subscriptions use server-sent updates over HTTP/WS;
  pytest async patterns needed.
- **Event-trigger testing.** Hasura's webhook event triggers
  fire on data changes; test via the Webhook receiver, not
  Hasura itself.

## References

- Hasura authorization quickstart:
  [hasura.io/docs/2.0/auth/authorization/quickstart/](https://hasura.io/docs/2.0/auth/authorization/quickstart/).
- Hasura metadata API:
  [hasura.io/docs/2.0/api-reference/metadata-api/index/](https://hasura.io/docs/2.0/api-reference/metadata-api/index/).
- Introspection control:
  [`introspection-attack-surface-reference`](../introspection-attack-surface-reference/SKILL.md).
- Cross-plugin (tenant isolation):
  [`qa-multi-tenancy/cross-tenant-data-leak-tests`](../../../qa-multi-tenancy/skills/cross-tenant-data-leak-tests/SKILL.md),
  [`qa-multi-tenancy/row-level-security-postgres-reference`](../../../qa-multi-tenancy/skills/row-level-security-postgres-reference/SKILL.md).
- Sibling frameworks:
  [`apollo-server-test`](../apollo-server-test/SKILL.md),
  [`graphql-yoga-test`](../graphql-yoga-test/SKILL.md),
  [`mercurius-test`](../mercurius-test/SKILL.md),
  [`pothos-builder-tests`](../pothos-builder-tests/SKILL.md).
