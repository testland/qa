---
name: cross-tenant-data-leak-tests
description: "Workflow-driven skill that emits the runtime CI gate of cross-tenant leak tests - the actual battery a multi-tenant codebase must pass on every PR. Defines the canonical test patterns (read-other-tenant-by-id, list-leak, spoofed-tenant-id-in-body, JWT-replay, FK-cross-tenant, unique-collision side channel, object-storage IDOR, search-index-direct-query, async-job-context-reload, cache-key-collision), the expected response codes per pattern (404 vs 403 disclosure trade-off), the Postgres-RLS-direct test patterns, and the CI integration (run with non-superuser non-BYPASSRLS role, fail the build on any leak). Use when implementing the actual leak-test suite (after tenant-leak-test-author produces the plan), when adding the CI gate to an existing project, or when investigating a leak finding. Composes tenant-leak-test-author + row-level-security-postgres-reference."
rating: 23
d6: 4
archetype: S3
---

# cross-tenant-data-leak-tests

## Overview

The runtime CI gate. While
[`tenant-leak-test-author`](../tenant-leak-test-author/SKILL.md)
produces the *plan* (which surfaces, which patterns), this skill
produces the *executing tests* - the actual code that fails the
build when isolation breaks.

The contract:

- Each test fixtures two disjoint tenants (A, B).
- Each test exercises one (surface, pattern) cell.
- Each test asserts denial of cross-tenant access.
- The suite runs as part of CI on every PR.
- A single failure blocks merge.

## When to use

- Implementing the leak-test suite after planning with
  [`tenant-leak-test-author`](../tenant-leak-test-author/SKILL.md).
- Adding the CI gate to an existing multi-tenant project.
- Investigating a leak finding - reproduce with a minimal test.
- Adding coverage for a newly-introduced tenant-bearing surface.

## Step 1 - Choose the test runner and DB connection role

For Postgres-backed apps, this is the most-common-bug step:

| Connection used in test | Result |
|---|---|
| Superuser | Bypasses RLS - tests pass, prod leaks. **Do not use.** |
| Role with `BYPASSRLS` attribute | Same as superuser. **Do not use.** |
| Role that **owns** the tenant table (and table not `FORCE`d) | Bypasses RLS. **Do not use** unless `FORCE ROW LEVEL SECURITY` is set. |
| Plain application role (no BYPASSRLS, not owner) | **Correct** - same role prod uses. |

Per [`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md),
verify with:

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles
WHERE rolname = current_user;
-- Expect: rolsuper=f, rolbypassrls=f
```

For Django, set `DATABASES['default']['USER']` to the app role
in the test settings. For Rails, `config/database.yml` test
section. For Spring Boot, `spring.datasource.username` in
`application-test.yml`.

## Step 2 - The canonical battery

These tests should exist for every tenant-bearing API surface.

### Test 1 - Read-other-tenant-by-id

```python
def test_get_other_tenant_resource_returns_404(
    self, client, tenant_a_user, tenant_b_resource
):
    client.force_login(tenant_a_user)
    resp = client.get(f"/api/documents/{tenant_b_resource.id}/")
    assert resp.status_code == 404  # not 403 — avoid existence disclosure
```

Convention: **return 404, not 403**, for resources the requester
can't access in another tenant. 403 leaks existence (tenant A
learns tenant B has resource with this ID). The trade-off:
debugging slightly harder. Document the project's choice.

### Test 2 - List-leak

```python
def test_list_does_not_include_other_tenant_resources(
    self, client, tenant_a_user, tenant_b_resource
):
    client.force_login(tenant_a_user)
    resp = client.get("/api/documents/")
    assert resp.status_code == 200
    ids = {d["id"] for d in resp.json()["results"]}
    assert tenant_b_resource.id not in ids
```

Even with RLS enforcing visibility, application-layer caches can
leak. Test against fresh queries.

### Test 3 - Spoofed-tenant-id-in-body

```python
def test_tenant_id_in_body_ignored_or_rejected(
    self, client, tenant_a_user, tenant_b
):
    client.force_login(tenant_a_user)
    resp = client.post("/api/documents/", json={
        "tenant_id": str(tenant_b.id),
        "body": "leak"
    })
    if resp.status_code == 201:
        created = resp.json()
        assert created["tenant_id"] != str(tenant_b.id), \
            "Server accepted tenant_id from body — must derive from session"
```

### Test 4 - JWT replay across tenants

```python
def test_jwt_for_tenant_a_rejected_on_tenant_b_path(
    self, client, tenant_a_user, tenant_b_resource
):
    token = sign_jwt(tenant_a_user)
    resp = client.get(
        f"/api/documents/{tenant_b_resource.id}/",
        HTTP_AUTHORIZATION=f"Bearer {token}"
    )
    assert resp.status_code in (401, 404)
```

If the API has tenant-scoped paths (`/api/tenants/<id>/...`),
also test that tenant A's JWT cannot be used with tenant B's
path even with a valid signature - the `tenant_id` claim must
be checked against the path.

### Test 5 - FK cross-tenant

```python
def test_cannot_create_fk_referencing_other_tenant(
    self, client, tenant_a_user, tenant_b_resource
):
    client.force_login(tenant_a_user)
    # tenant_b_resource exists, but A shouldn't reference it
    resp = client.post("/api/comments/", json={
        "document_id": str(tenant_b_resource.id),
        "body": "comment on other tenant's doc"
    })
    assert resp.status_code in (400, 404)
```

This tests FK-based leak via reference: the FK constraint
**bypasses RLS** per
[`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md),
so the FK must be validated at application layer too.

### Test 6 - Unique-collision side channel

```python
def test_unique_violation_does_not_disclose_other_tenant_existence(
    self, client, tenant_a_user, tenant_b_resource_with_slug
):
    client.force_login(tenant_a_user)
    # Try to create with same slug as tenant B
    resp = client.post("/api/documents/", json={
        "slug": tenant_b_resource_with_slug.slug,
        "body": "x"
    })
    # Should succeed (RLS scopes the unique check to tenant A)
    # or fail with a non-disclosing error if unique is global
    if resp.status_code in (409, 422):
        assert "tenant_b" not in resp.text.lower()
        assert tenant_b_resource_with_slug.id not in resp.text
```

Per
[`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md):
"Foreign key constraint checks, Unique constraint checks,
TRUNCATE, and REFERENCES privilege checks bypass RLS." Solution:
make `slug` unique per tenant: `UNIQUE (tenant_id, slug)`.

### Test 7 - Object-storage IDOR

```python
def test_storage_presigned_url_path_traversal_denied(
    self, client, tenant_a_user, tenant_b_resource
):
    client.force_login(tenant_a_user)
    presigned = client.get(
        f"/api/documents/{tenant_a_user.tenant_id}/file/"
    ).json()["url"]
    # Modify the URL to point at tenant B's prefix
    leaked_url = presigned.replace(
        str(tenant_a_user.tenant_id),
        str(tenant_b_resource.tenant_id)
    )
    resp = requests.get(leaked_url)
    assert resp.status_code == 403
```

The S3 / GCS bucket policy must enforce the prefix - application
code is not sufficient.

### Test 8 - Search-index direct query

```python
def test_search_query_must_include_tenant_filter(
    self, opensearch_client, tenant_a, tenant_b_resource
):
    # Direct ES query without tenant filter (simulating leaked path)
    result = opensearch_client.search(
        index="documents",
        body={"query": {"match_all": {}}}
    )
    # Test asserts the API endpoint always adds a tenant filter.
    # The DIRECT search above should not be reachable from any API path.
    # This test ensures no route exists that issues unfiltered search.
    for route in app.url_map.iter_rules():
        if "search" in route.endpoint:
            assert "@tenant_required" in inspect.getsource(
                app.view_functions[route.endpoint]
            )
```

### Test 9 - Async-job context-reload

```python
def test_async_job_reloads_tenant_from_db_not_payload(
    self, tenant_a, tenant_b_resource
):
    # Enqueue a job with a payload pointing at tenant B's resource
    job = enqueue_export(
        resource_id=tenant_b_resource.id,
        # Crafted to spoof — but executor must verify
        tenant_id_claim=tenant_a.id
    )
    result = run_job(job)
    # Executor must derive tenant_id from resource_id, not the payload
    assert result.tenant_id == tenant_b_resource.tenant_id
```

### Test 10 - Cache key collision

```python
def test_cache_keys_are_tenant_scoped(self, cache, tenant_a, tenant_b):
    cache.set("user:1", "tenant_a_data", tenant_id=tenant_a.id)
    cache.set("user:1", "tenant_b_data", tenant_id=tenant_b.id)
    assert cache.get("user:1", tenant_id=tenant_a.id) == "tenant_a_data"
    assert cache.get("user:1", tenant_id=tenant_b.id) == "tenant_b_data"
```

Cache wrappers must prepend tenant_id to every key.

### Postgres-RLS-direct (test 1 - 6 at DB layer)

Run these as the application role (not superuser):

```sql
BEGIN;
SET LOCAL ROLE app_user;
SET LOCAL app.tenant_id = '<tenant_a_uuid>';
INSERT INTO documents (id, tenant_id, body)
VALUES (gen_random_uuid(), current_setting('app.tenant_id')::uuid, 'a');

SET LOCAL app.tenant_id = '<tenant_b_uuid>';
SELECT count(*) FROM documents;  -- expect 0

-- Cross-tenant INSERT
INSERT INTO documents (tenant_id, body) VALUES ('<tenant_a_uuid>', 'leak');
-- Expect: ERROR: new row violates row-level security policy for table "documents"
ROLLBACK;
```

Per
[`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md):
test fails if either assertion fails (count != 0, or INSERT
succeeds).

## Step 3 - CI integration

```yaml
# .github/workflows/tenant-isolation.yml
name: tenant-isolation
on:
  pull_request:
    paths:
      - "**/*.py"
      - "**/migrations/**"
      - ".github/workflows/tenant-isolation.yml"

jobs:
  cross-tenant-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install
        run: pip install -e ".[test]"
      - name: Create non-superuser role
        env:
          PGPASSWORD: postgres
        run: |
          psql -h localhost -U postgres -d postgres -c "
            CREATE ROLE app_user LOGIN PASSWORD 'app';
          "
      - name: Apply migrations
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test
        run: python manage.py migrate
      - name: Run cross-tenant suite
        env:
          DATABASE_URL: postgresql://app_user:app@localhost/test
        run: pytest tests/tenant_isolation/ --tb=short --no-header -v
```

Key: the **test job connects as `app_user`**, not as the
postgres superuser. The migrations run as superuser; the tests
run as the application role.

## Step 4 - Diagnose a failure

When a leak test fails:

1. **Read the assertion** - which surface + pattern leaked?
2. **Check the connection role** - `SELECT current_user;` in the
   test. If it's superuser, the test was bypassed. Fix the test
   connection first.
3. **Reproduce locally** with the same role.
4. **Check the policy** - is there a policy on the table? Is RLS
   enabled? Is FORCE ROW LEVEL SECURITY set?
5. **Check the application path** - is `tenant_id` derived from
   the session, or from request payload?
6. **Write the minimal regression test** before fixing.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tests connect as superuser | RLS bypassed; tests pass falsely | Use prod-equivalent role |
| Migrations and tests use same role | Migrations need DDL; tests should not | Two roles: migrations user (owner), app user (RLS-bound) |
| Test setup creates tenants via direct SQL bypassing RLS | OK in setup, but reset tenant context before assertions | `SET LOCAL` between fixture creation and test body |
| 403 used instead of 404 for unauthorised cross-tenant resources | Leaks existence | Use 404 (and document) |
| Single test for "tenant isolation works" | Insufficient coverage | One test per (surface, pattern) cell |
| Skipping FK/UNIQUE side-channel tests | Real production bugs hide here | Always test FK + unique cross-tenant |
| No async-job context-reload test | Job runners often trust payload | Always test |
| Cache without tenant prefix | Tenant A and B alias same logical key | Verify key generation in test |
| Suite not part of CI | Catches nothing | Block merge on failure |

## Limitations

- **Cannot test side-channel timing.** Unique-constraint timing
  differences are detectable by an attacker but expensive to
  unit-test reliably. Constant-time response or rate-limit
  layers are the prod defence.
- **Cannot test all routes.** New routes added without
  isolation tests are still vulnerable. Pair with the
  [`tenant-id-propagation-tracer`](../../agents/tenant-id-propagation-tracer.md)
  agent to enforce coverage on PR.
- **Cannot detect log leaks.** Tests verify response payloads,
  not log lines. Add log-grep tests separately.
- **Test database must mirror prod RLS setup.** If test DB uses
  a different connection model, prod-only bugs slip through.

## References

- OWASP WSTG-ATHZ-02 (consumed via
  [`tenant-leak-test-author`](../tenant-leak-test-author/SKILL.md)):
  [owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema).
- Postgres RLS bypass rules:
  [`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md).
- Plan / inventory:
  [`tenant-leak-test-author`](../tenant-leak-test-author/SKILL.md).
- Trace agent:
  [`tenant-id-propagation-tracer`](../../agents/tenant-id-propagation-tracer.md).
- Adversarial reviewer:
  [`tenant-leak-critic`](../../agents/tenant-leak-critic.md).
