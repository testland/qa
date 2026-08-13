---
name: hasura-tests
description: "Wraps Hasura GraphQL Engine testing patterns: docker-compose test instance, the metadata API for declarative schema/permission setup, x-hasura-role and x-hasura-user-id session headers for role-based permission tests, the v1/graphql endpoint via curl/HTTPie/native HTTP clients, and the role-by-table-by-operation permission-matrix pattern. Use for a metadata-driven Hasura engine where row-level permissions dominate; for a code-first server runtime harness use graphql-yoga-tests, apollo-server-tests, or mercurius-tests instead, not this skill."
---

# hasura-tests

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
  `cross-tenant-data-leak-tests` in the qa-multi-tenancy plugin).
- Verifying a new role's permission rules.
- PR review of `hasura/metadata/` changes.
- Regression-testing role transitions (user becomes admin, etc.).

## How to use

1. Bring up the ephemeral test stack (`docker compose -f docker-compose.test.yml up -d`)
   with introspection disabled and the console off.
2. Apply the fixture metadata that declares the permission rules under test, via the
   `/v1/metadata` API or `hasura metadata apply`.
3. Seed per-test rows so no test depends on another test's data.
4. Send queries to `/v1/graphql` with the admin secret plus an `x-hasura-role`
   override (and `x-hasura-user-id` / custom claims) to act as any role.
5. Assert the response shape: rows are row-filtered to the role, or the failure
   carries `extensions.code = "permission-error"` (or `affected_rows: 0`).
6. Cover the full role x table x operation matrix from a checked-in fixture, and add
   one smoke test through the real JWT path.
7. Tear the stack down with `-v` and reset metadata between suites.

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

### Role-based permission tests

Tests act as any role via **admin secret + `x-hasura-role` override**, and a full
per-role x per-table x per-operation audit is generated from a checked-in fixture.
Both patterns - the `httpx` by-role queries and the parametrized matrix - are in
[references/permission-matrix-tests.md](references/permission-matrix-tests.md).

## Worked example

Scenario: a new `user` role must see only its own rows in the `user` table.

1. In the fixture metadata, give `user` a select permission on `user` filtered by
   `id = X-Hasura-User-Id`; apply it with `hasura metadata apply`.
2. POST `{ user { id name } }` to `/v1/graphql` with headers `x-hasura-admin-secret`,
   `x-hasura-role: user`, `x-hasura-user-id: 3`.
3. Assert `status_code == 200` and every returned row has `id == 3` - the row filter
   held.
4. POST the same query with `x-hasura-role: admin` (no user-id) and assert
   `len(rows) > 1` - admin is not restricted.

Result: one pair of requests proves the row-filter rule for the restricted role and
confirms it does not leak into the admin role.

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
| Permission tests using admin secret without `x-hasura-role` override | Tests run as admin -> bypass all permissions | Always add `x-hasura-role` |
| Hardcoded user IDs across tests | One test mutates user 3 -> next test stale | Per-test user seeding |
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
  introspection - admin-only).
- **Action / Remote-schema testing.** Hasura's Actions and
  Remote Schemas delegate to other services; this skill tests
  the Hasura -> upstream contract, not the upstream itself.
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
  `introspection-attack-surface-reference`.
- Cross-plugin (tenant isolation):
  `cross-tenant-data-leak-tests`,
  `rls-reference`.
- Sibling frameworks:
  `apollo-server-tests`,
  `graphql-yoga-tests`,
  `mercurius-tests`,
  `pothos-builder-tests`.
