---
name: tenant-leak-test-author
description: "Workflow-driven skill that builds a tenant-leak test plan from an inventory of tenant-bearing surfaces (database tables, APIs, object storage, search indices, async messages) and the isolation model in use. Walks through identifying tenant-bearing surfaces, enumerating the attack patterns per OWASP WSTG-ATHZ-02 (horizontal escalation, vertical escalation, IDOR / BOLA), generating test cases that exercise each pattern against each surface, and emitting the test suite skeleton (pytest / Jest / JUnit / Go test) with explicit cross-tenant probes. Use when designing a multi-tenant test suite for a new feature, when auditing test coverage for an existing tenant boundary, or when reviewing PRs that add tenant-bearing surfaces. Distinct from cross-tenant-data-leak-tests which is the runtime gate; this skill produces the plan."
rating: 22
d6: 4
archetype: S3
---

# tenant-leak-test-author

## Overview

A tenant-leak test suite is the runtime guarantee that cross-
tenant access fails. This skill **builds** that suite from an
inventory of tenant-bearing surfaces - not a pre-canned set of
tests, since every product has a different surface area.

The workflow is:

1. Enumerate tenant-bearing surfaces (where tenant_id appears).
2. Identify the isolation model per surface (per
   [`tenant-isolation-models-reference`](../tenant-isolation-models-reference/SKILL.md)).
3. Enumerate the attack patterns per surface
   (per OWASP WSTG-ATHZ-02).
4. Generate test cases (pairs of tenants A/B, attempted cross-
   access).
5. Emit the test suite skeleton.

The output is committed to the project repo; the
[`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md)
skill describes the runtime contract those tests must satisfy.

## When to use

- New feature introduces a tenant-bearing surface (table, API
  resource, queue topic, search index).
- Audit existing coverage - does the test suite probe every
  surface?
- PR review adds a new tenant_id column or scoped endpoint.
- Migrating from pool to bridge (or vice versa) - test surface
  shifts.

## Step 1 - Inventory tenant-bearing surfaces

Walk the codebase and enumerate every surface that should be
tenant-scoped. Categorise:

| Surface category | Examples | How to find |
|---|---|---|
| Database tables | tables with `tenant_id` column | `grep -r "tenant_id" --include="*.sql"` ; ORM model field annotations |
| API endpoints | routes returning tenant data | route registrations grep |
| Object storage | buckets / prefixes per tenant | IaC for buckets, lifecycle config |
| Search indices | tenant-routed Elasticsearch / Algolia | index-naming scheme |
| Async messages | tenant_id in message attributes / payload | message-class definitions |
| Caches | Redis keys with tenant_id prefix | cache-client wrappers |
| Logs / metrics | log lines containing tenant_id | log-emit grep |
| Background jobs | Sidekiq / Celery tasks taking tenant_id | task definitions |
| Reports / exports | tenant-scoped reports | export endpoints |
| Webhooks / outbound | tenant-routed external calls | webhook configuration |

Per
[`tenant-isolation-models-reference`](../tenant-isolation-models-reference/SKILL.md):
"The test surface depends on the **lowest** isolation level in
the stack." A fully-isolated UI on a shared database still needs
the full DB-leak battery.

Decision point: **classify each surface as pool / bridge / silo**.
Tests differ:

- **Pool** → cross-tenant access tests (the canonical battery).
- **Bridge** → cross-database-routing tests (tenant A's session
  must not connect to tenant B's DB).
- **Silo** → tenant-to-deployment routing tests (tenant A's
  request must not hit tenant B's deployment).

## Step 2 - Enumerate attack patterns per surface

Per OWASP WSTG-ATHZ-02
([owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema)),
three primary scenarios:

| Pattern | What | Surface |
|---|---|---|
| **Horizontal escalation** | Tenant A accesses tenant B's data, identical privilege | All pool/bridge surfaces |
| **Vertical escalation** | Non-admin in tenant A accesses admin-only resources | All admin-scoped surfaces |
| **IDOR / BOLA** | Direct reference attack - change ID in URL/payload | All ID-bearing endpoints |

Plus tenant-isolation-specific patterns:

| Pattern | Test |
|---|---|
| **tenant_id from request payload** | Send tenant A's session with `tenant_id=B` in body - must reject |
| **Missing tenant_id filter in new endpoint** | Enumerate routes added in last N commits; verify each filters by tenant |
| **Cross-tenant via foreign key** | Create FK from tenant-A row to tenant-B row - must fail |
| **Cross-tenant via unique constraint** | Insert tenant-A row with key that exists in tenant B - observe error timing as side channel |
| **JWT replay across tenants** | Tenant A's JWT used to call tenant B's endpoint - must reject signature/iss/aud check |
| **Object storage path traversal** | Tenant A presigned URL → modify prefix to tenant B's - must 403 |
| **Search query without tenant filter** | Direct search index query - must include tenant routing key |
| **Async job tenant context** | Job enqueued by tenant A → executor must reload tenant context, not trust message |
| **Cache key collision** | Tenant A and tenant B have same logical key - cache must namespace |
| **Log scrubbing** | Tenant A errors must not leak tenant B identifiers |

## Step 3 - Generate test cases

For each (surface, pattern) cell of the matrix, generate one or
more test cases. Conventions:

```
test_<surface>_<pattern>_<expected>()
e.g.,
test_documents_api_horizontal_escalation_returns_403()
test_storage_bucket_idor_returns_403()
test_jwt_replay_cross_tenant_returns_401()
test_async_job_tenant_context_reload_on_exec()
```

Each test creates fixtures for **two tenants A and B**, performs
the cross-access attempt, and asserts denial. Per OWASP WSTG-
ATHZ-02:

> "Create two users with identical privileges. Maintain concurrent
> sessions for both accounts. Modify session tokens and parameters
> to target other users' data."

For tenant testing, the same approach with tenant_id as the
"other identity".

### Required fixtures

| Fixture | Purpose |
|---|---|
| `tenant_a` | First tenant with seeded data |
| `tenant_b` | Second tenant with disjoint seeded data |
| `tenant_a_user` | Authenticated user in A |
| `tenant_b_user` | Authenticated user in B |
| `tenant_a_admin` | Admin in A (for vertical-escalation tests) |
| `tenant_a_resource` | A document/record/etc owned by A |
| `tenant_b_resource` | Same shape, owned by B |

## Step 4 - Pick the test framework + emit skeleton

Pick by stack:

| Stack | Framework | Why |
|---|---|---|
| Python (Django/Flask/FastAPI) | pytest | tenant fixtures via `@pytest.fixture`; assertions via `assert response.status_code == 403` |
| Node (Express/Nest) | Jest or Vitest + Supertest | `supertest(app).get(...).expect(403)` |
| JVM (Spring/Quarkus) | JUnit 5 + Testcontainers | `@SpringBootTest` with real Postgres for RLS coverage |
| Go | `testing` + `httptest` | table-driven tests over (tenant, resource) pairs |
| Ruby (Rails) | RSpec + `request` specs | shared examples for cross-tenant battery |

### Example skeleton (pytest)

```python
import pytest

class TestDocumentsTenantIsolation:
    """Per OWASP WSTG-ATHZ-02 — horizontal escalation battery."""

    def test_tenant_a_cannot_read_tenant_b_document(
        self, client, tenant_a_user, tenant_b_resource
    ):
        # Authenticate as tenant A user
        client.force_login(tenant_a_user)
        # Attempt to access tenant B's resource by ID
        response = client.get(f"/api/documents/{tenant_b_resource.id}/")
        assert response.status_code == 404, "Must return 404, not 403, to avoid existence disclosure"

    def test_tenant_a_cannot_list_tenant_b_documents(
        self, client, tenant_a_user, tenant_b_resource
    ):
        client.force_login(tenant_a_user)
        response = client.get("/api/documents/")
        assert response.status_code == 200
        ids = {d["id"] for d in response.json()["results"]}
        assert tenant_b_resource.id not in ids

    def test_tenant_id_in_body_is_ignored(
        self, client, tenant_a_user, tenant_b
    ):
        client.force_login(tenant_a_user)
        # Attempt to create a document for tenant B by spoofing body
        response = client.post(
            "/api/documents/",
            data={"tenant_id": str(tenant_b.id), "body": "leak"}
        )
        # Must be either rejected (400) or silently scoped to A (201, but A's tenant_id)
        if response.status_code == 201:
            doc = response.json()
            assert doc["tenant_id"] != str(tenant_b.id)

    def test_jwt_signed_for_a_rejected_on_b_endpoint(
        self, client, tenant_a_user, tenant_b_resource
    ):
        # Sign a JWT for tenant A user, use it on B-scoped endpoint
        token = sign_jwt_for(tenant_a_user)
        response = client.get(
            f"/api/documents/{tenant_b_resource.id}/",
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )
        assert response.status_code in (401, 404)
```

### Example skeleton (Postgres RLS-direct, language-agnostic)

For surfaces relying on RLS per
[`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md),
also test at the DB layer:

```sql
-- Connect as app_user (not superuser, not table owner)
BEGIN;
SET LOCAL app.tenant_id = '<tenant_a_uuid>';
-- Insert a row for tenant A
INSERT INTO documents (tenant_id, body) VALUES (current_setting('app.tenant_id')::uuid, 'a-doc');

-- Switch to tenant B
SET LOCAL app.tenant_id = '<tenant_b_uuid>';
SELECT count(*) FROM documents;  -- expect 0 (tenant A's row invisible)

-- Cross-tenant INSERT attempt
INSERT INTO documents (tenant_id, body) VALUES ('<tenant_a_uuid>', 'leak');
-- Expect: ERROR: new row violates row-level security policy for table "documents"
ROLLBACK;
```

## Step 5 - Coverage assertions

The suite is incomplete unless it covers every (surface, pattern)
cell. Track via a coverage matrix:

```
                | horiz | vert | IDOR | jwt | fk | cache | log
documents       |   X   |   X  |   X  |  X  | -  |   X   |  -
attachments     |   X   |   -  |   X  |  X  | -  |   -   |  -
search_index    |   X   |   -  |   X  |  X  | -  |   -   |  -
audit_log       |   X   |   -  |   -  |  -  | -  |   -   |  X
```

Generate this matrix from Step 1's surface inventory × Step 2's
pattern list. Empty cells are coverage gaps the PR must justify.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tests run as superuser/BYPASSRLS role | Tests pass; prod leaks per [`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md) | Run with prod-equivalent role |
| Single tenant in test fixtures | Can't test cross-tenant - that's the whole point | Always fixture two disjoint tenants |
| 403 instead of 404 | Existence disclosure: tenant A learns B's resource exists | Return 404 for unauthorised resources (debatable; document the choice) |
| Coverage by route only | Misses object storage, queues, search, caches | Inventory all surfaces (Step 1) |
| Static fixture IDs | Coincidental match between A's and B's IDs masks bugs | UUIDs, random per-test |
| Reusing JWT/session across tests | Cross-test bleed | Per-test session creation |
| Testing only the happy path | Misses spoofed-body, replayed-JWT, IDOR | Run the full attack pattern battery (Step 2) |
| Skipping silo deployments | Shared management surface still has pool-like leaks | Even silo gets the management-surface battery |

## Output

This skill produces:

- A surface inventory document (Step 1).
- An attack-pattern × surface coverage matrix (Steps 2 - 3).
- A test suite skeleton (Step 4) committed to the project repo.
- A README in the test directory documenting the matrix and how
  to add a surface.

The runtime gate is
[`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md);
the adversarial review is
[`tenant-leak-critic`](../../agents/tenant-leak-critic.md).

## References

- OWASP WSTG-ATHZ-02 Testing for Bypassing Authorization Schema:
  [owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema).
- Tenant isolation models:
  [`tenant-isolation-models-reference`](../tenant-isolation-models-reference/SKILL.md).
- Postgres RLS:
  [`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md).
- Runtime gate:
  [`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md).
- Adversarial review:
  [`tenant-leak-critic`](../../agents/tenant-leak-critic.md).
