---
name: tenant-leak-test-author
description: "Workflow-driven skill that builds a tenant-leak test plan from an inventory of tenant-bearing surfaces (database tables, APIs, object storage, search indices, async messages) and the isolation model in use. Walks through identifying tenant-bearing surfaces, enumerating the attack patterns per OWASP WSTG-ATHZ-02 (horizontal escalation, vertical escalation, IDOR / BOLA), generating test cases that exercise each pattern against each surface, and emitting the test suite skeleton (pytest / Jest / JUnit / Go test) with explicit cross-tenant probes. Use when designing a multi-tenant test suite for a new feature, when auditing test coverage for an existing tenant boundary, or when reviewing PRs that add tenant-bearing surfaces. Distinct from cross-tenant-data-leak-tests which is the runtime gate; this skill produces the plan."
---

# tenant-leak-test-author

## Overview

A tenant-leak test suite is the runtime guarantee that cross-tenant
access fails. This skill **builds** that suite from an inventory of
tenant-bearing surfaces - not a pre-canned set of tests, since every
product has a different surface area. Steps 1 - 5 below run the workflow
end to end; the output is committed to the project repo, and
`cross-tenant-data-leak-tests` describes the runtime contract those tests
must satisfy.

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
`tenant-isolation-models-reference`:
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

Layer the tenant-isolation-specific patterns (spoofed-body tenant_id,
missing filter on new endpoints, cross-tenant FK and unique-constraint,
JWT replay, object-storage path traversal, unfiltered search, async-job
context, cache-key collision, log scrubbing) on top - the full
test-per-pattern catalog is in
[references/attack-patterns.md](references/attack-patterns.md).

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

Each test creates fixtures for **two tenants A and B**, performs the
cross-access attempt, and asserts denial. Per OWASP WSTG-ATHZ-02: create
two users with identical privileges, hold concurrent sessions for both,
and modify session tokens and parameters to target the other user's data
- with tenant_id as the "other identity".

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

Minimal probe - fixture two tenants, attempt cross-access by ID, and
assert denial without existence disclosure:

```python
class TestDocumentsTenantIsolation:
    def test_tenant_a_cannot_read_tenant_b_document(
        self, client, tenant_a_user, tenant_b_resource
    ):
        client.force_login(tenant_a_user)
        response = client.get(f"/api/documents/{tenant_b_resource.id}/")
        assert response.status_code == 404  # 404 not 403: no existence disclosure
```

The full pytest battery (list-scoping, spoofed-body, JWT-replay) and the
language-agnostic Postgres RLS-direct probe are in
[references/framework-skeletons.md](references/framework-skeletons.md).

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
| Tests run as superuser/BYPASSRLS role | Tests pass; prod leaks per `row-level-security-postgres-reference` | Run with prod-equivalent role |
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
`cross-tenant-data-leak-tests`.

## References

- OWASP WSTG-ATHZ-02 Testing for Bypassing Authorization Schema:
  [owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema).
- Attack-pattern catalog: [references/attack-patterns.md](references/attack-patterns.md).
- Test skeletons: [references/framework-skeletons.md](references/framework-skeletons.md).
- Tenant isolation models:
  `tenant-isolation-models-reference`.
- Postgres RLS:
  `row-level-security-postgres-reference`.
- Runtime gate:
  `cross-tenant-data-leak-tests`.
