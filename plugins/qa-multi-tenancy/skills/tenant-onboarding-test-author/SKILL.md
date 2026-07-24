---
name: tenant-onboarding-test-author
description: "Workflow-driven skill that authors a test suite for tenant provisioning and offboarding: account creation, isolation at creation (no cross-tenant bleed from a new tenant's first API call), default resource quotas, billing record linkage, seed and default data correctness, idempotent re-provisioning, and teardown with full data deletion. Walks through mapping provisioning surfaces, generating test cases per surface, emitting the test suite skeleton (pytest / Jest / JUnit / Go test), and producing a coverage matrix. Use when a new tenant onboarding flow is introduced or changed, when the offboarding pipeline is modified, or when auditing provisioning coverage before a compliance review. Distinct from tenant-leak-test-author (runtime cross-tenant access) and cross-tenant-data-leak-tests (CI gate): this skill covers the provisioning lifecycle, not steady-state access control."
metadata:
  keywords: "tenant-provisioning, onboarding, offboarding, saas, multi-tenancy, idempotent, quota, billing, teardown"
---

# tenant-onboarding-test-author

## Overview

Tenant onboarding and offboarding are lifecycle transitions, not steady-state
access patterns. A new tenant's provisioning pipeline touches account records,
isolation boundaries, quota tables, billing systems, seed data loaders, and
delete-cascade paths - surfaces the runtime isolation test battery never
exercises.

This skill produces a test suite for that lifecycle. The output is committed to
the project repo alongside the runtime suite from
`tenant-leak-test-author`.

The workflow is:

1. Map the provisioning pipeline surfaces.
2. Enumerate test scenarios per surface.
3. Generate test case stubs (fixtures + assertions).
4. Emit the test suite skeleton.
5. Build the coverage matrix.

## Differentiation

| Skill | What it tests |
|---|---|
| `tenant-onboarding-test-author` (this skill) | Provisioning lifecycle: creation, quota, billing, seed data, idempotency, teardown |
| `tenant-leak-test-author` | Steady-state runtime: cross-tenant access attempts, IDOR, horizontal escalation |
| `cross-tenant-data-leak-tests` | CI gate: confirms isolation invariants pass before merge |

## Step 1 - Map provisioning pipeline surfaces

Walk the onboarding code path end-to-end and enumerate every surface that
changes state during provisioning or deprovisioning. Per the AWS Well-Architected
SaaS Lens
([docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html)),
isolation must be established at every layer of the stack independently:

| Surface | What to capture | How to find it |
|---|---|---|
| Tenant registry / catalog | Record created, unique key assigned | Central `tenants` table or tenant-management service |
| Identity store | User account created, role bindings | Auth provider admin API or IAM config |
| Database layer | Schema/row/database provisioned per isolation model | ORM migration runner, schema-per-tenant scripts |
| Object storage | Bucket or prefix created with scoped policy | IaC for storage resources |
| Quota / rate-limit table | Default quotas inserted for the new tenant | Quota service or DB seeding script |
| Billing record | Billing entry linked to tenant ID | Billing service or payment-provider webhook handler |
| Seed / default data | Feature flags, default roles, template data loaded | Seed scripts, fixture loaders |
| Re-provisioning path | Idempotent re-run: no duplicate records, no failed constraints | Provisioning entry point called twice |
| Offboarding / teardown | Data deletion, billing cancellation, quota cleanup | Delete or deactivate endpoint |

Per the Microsoft Multitenant Architecture Center
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle)),
onboarding must account for data residency, compliance tier, billing model,
and disaster-recovery SLOs, each of which can gate provisioning steps.
Capture which conditions gate each surface - a compliance-gated provisioning
step needs its own test branch.

Per the Microsoft resource organisation guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/resource-organization](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/resource-organization)),
quota and subscription limits must be modelled per tenant at provisioning time.
Record the expected default quota values - they are assertions, not
implementation details.

## Step 2 - Enumerate test scenarios per surface

For each surface from Step 1, identify the scenarios that must hold:

### Account creation
- Tenant record persists with a non-null unique identifier after a successful
  provisioning call.
- Provisioning a second tenant with the same email or slug returns an error
  (no silent duplication).
- A provisioning call that fails mid-flow leaves no partial record (atomicity).

### Isolation at creation (no cross-tenant bleed)
Per the Microsoft tenancy models guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models)),
isolation must hold from the first request a tenant makes, not only after
steady-state data accumulates. Test cases:
- Immediately after Tenant B is provisioned, a call authenticated as Tenant A
  cannot enumerate Tenant B's resources (list endpoint returns 0 items for A).
- Tenant B's provisioned schema or row-level security policy is in place before
  the first application-level write is accepted.
- No existing tenant's data becomes visible to the new tenant through shared
  infrastructure (cache warm-up, search index bootstrap, etc.).

### Default resource quotas
Per the Microsoft consumption measurement guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/measure-consumption](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/measure-consumption)),
per-tenant consumption limits should be tracked from provisioning. Test cases:
- A new tenant's quota record exists immediately after provisioning and matches
  the expected default values for the tenant's pricing tier.
- Attempting an action that exceeds the default quota (e.g., creating one more
  resource than the limit allows) returns a quota-exceeded error, not a generic
  error or a silent failure.
- Upgrading a tenant's tier updates the quota record (verify the seeded default
  and the upgrade delta separately).

### Billing record linkage
Per the Microsoft tenant lifecycle guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle)),
billing linkage is a first-class onboarding concern. Test cases:
- A billing record (subscription, customer ID, or metering entry) exists and
  references the tenant's canonical identifier within the same provisioning
  transaction.
- A provisioning call with an invalid payment method does not create a
  half-provisioned tenant.
- The billing record's tier matches the plan chosen at signup.

### Seed and default data
- Feature flags for the tenant's tier are present with correct default values.
- Default roles (e.g., `owner`, `member`, `viewer`) exist and are assigned to
  the provisioning user.
- Template or onboarding data (welcome project, sample records) is scoped
  exclusively to the new tenant - it does not appear in any other tenant's
  list endpoints.

### Idempotent re-provisioning
An idempotent provisioning call is one that produces the same final state
regardless of how many times it is invoked. Test cases:
- Calling the provisioning endpoint a second time with the same input returns
  a success response (or an explicit "already exists" response) without
  creating duplicate records.
- All constraint-unique fields (quota row, billing record, identity binding)
  remain singular after two provisioning calls.
- A re-provisioning call after a partial failure completes successfully without
  manual cleanup.

### Teardown and offboarding
Per the Microsoft tenant lifecycle guidance
([learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle)),
offboarding must define a retention period and support re-onboarding during
that window. Test cases:
- After offboarding, the tenant's application data (records, files, jobs) is
  not accessible through any API endpoint.
- After offboarding, no row for the tenant exists in quota, billing, or
  identity tables (or rows are flagged deleted and excluded from active
  queries).
- Re-onboarding the same tenant during the retention period succeeds without
  data loss if re-onboarding is a supported operation.
- After the retention period expires (simulate with a fixed past timestamp), a
  hard-delete job removes all remaining rows; assert count = 0 across all
  tenant-bearing tables.

## Step 3 - Generate test cases

Naming convention matches
`tenant-leak-test-author`:

```
test_<surface>_<scenario>_<expected>()
```

Examples:

```
test_account_creation_duplicate_slug_returns_conflict()
test_isolation_new_tenant_invisible_to_existing_tenant_immediately()
test_quota_default_values_match_tier_config_on_creation()
test_billing_record_exists_and_references_tenant_id_on_creation()
test_seed_data_scoped_to_new_tenant_only()
test_provisioning_idempotent_no_duplicate_quota_row()
test_offboarding_application_data_deleted_after_retention_period()
```

### Required fixtures

| Fixture | Purpose |
|---|---|
| `existing_tenant` | A fully-provisioned tenant in steady state (pre-exists the new tenant) |
| `new_tenant` | The tenant being provisioned under test |
| `new_tenant_owner` | The user who triggered provisioning |
| `pricing_tier` | The tier config record that defines default quotas and features |
| `billing_stub` | A test double for the payment provider that records linkage calls |
| `offboarded_tenant` | A tenant that has been offboarded; used for teardown assertions |

## Step 4 - Pick the test framework and emit skeleton

Same framework selection table as
`tenant-leak-test-author`:

| Stack | Framework |
|---|---|
| Python (Django/Flask/FastAPI) | pytest |
| Node (Express/Nest) | Jest or Vitest + Supertest |
| JVM (Spring/Quarkus) | JUnit 5 + Testcontainers |
| Go | `testing` + `httptest` |
| Ruby (Rails) | RSpec + `request` specs |

### Example skeleton (pytest)

```python
import pytest

class TestTenantProvisioning:
    """Provisioning lifecycle tests - distinct from runtime isolation battery."""

    def test_account_creation_stores_tenant_record(
        self, provisioning_client, pricing_tier
    ):
        response = provisioning_client.post(
            "/api/tenants/",
            data={"slug": "acme", "plan": pricing_tier.id, "owner_email": "owner@acme.com"}
        )
        assert response.status_code == 201
        assert response.json()["id"] is not None

    def test_isolation_new_tenant_invisible_to_existing_tenant_immediately(
        self, client, existing_tenant_user, new_tenant
    ):
        # New tenant was just provisioned; existing tenant must not see it
        client.force_login(existing_tenant_user)
        response = client.get("/api/workspaces/")
        ids = {w["id"] for w in response.json()["results"]}
        assert new_tenant.id not in ids

    def test_quota_default_matches_tier_on_creation(
        self, new_tenant, pricing_tier
    ):
        from quotas.models import TenantQuota
        quota = TenantQuota.objects.get(tenant=new_tenant)
        assert quota.max_users == pricing_tier.default_max_users
        assert quota.max_storage_gb == pricing_tier.default_max_storage_gb

    def test_billing_record_linked_on_creation(
        self, new_tenant, billing_stub
    ):
        assert billing_stub.was_called_for(new_tenant.id), (
            "Billing provider must be notified during provisioning"
        )
        record = billing_stub.get_record(new_tenant.id)
        assert record["plan"] == new_tenant.plan

    def test_seed_data_scoped_to_new_tenant_only(
        self, client, existing_tenant_user, new_tenant
    ):
        # Existing tenant must not see new tenant's seed data in shared endpoints
        client.force_login(existing_tenant_user)
        response = client.get("/api/projects/")
        tenant_ids = {p["tenant_id"] for p in response.json()["results"]}
        assert str(new_tenant.id) not in tenant_ids

    def test_provisioning_idempotent_no_duplicate_quota_row(
        self, provisioning_client, new_tenant, pricing_tier
    ):
        # Call provisioning a second time with the same input
        provisioning_client.post(
            "/api/tenants/",
            data={"slug": new_tenant.slug, "plan": pricing_tier.id,
                  "owner_email": "owner@acme.com"}
        )
        from quotas.models import TenantQuota
        count = TenantQuota.objects.filter(tenant=new_tenant).count()
        assert count == 1, "Idempotent re-provisioning must not create duplicate quota rows"

    def test_offboarding_deletes_application_data(
        self, admin_client, offboarded_tenant
    ):
        admin_client.delete(f"/api/tenants/{offboarded_tenant.id}/")
        response = admin_client.get(f"/api/tenants/{offboarded_tenant.id}/projects/")
        assert response.status_code == 404
```

### Example: idempotency via SQL assertion (language-agnostic)

```sql
-- After two provisioning calls for the same tenant slug:
SELECT count(*) FROM tenant_quotas WHERE tenant_id = '<new_tenant_uuid>';
-- Expected: 1 (not 2)

SELECT count(*) FROM billing_subscriptions WHERE tenant_id = '<new_tenant_uuid>';
-- Expected: 1 (not 2)
```

## Step 5 - Coverage matrix

Track one cell per (surface, scenario). Empty cells are coverage gaps that
the PR author must justify or schedule.

```
Surface                   | create | isolation_at_create | quota | billing | seed | idempotent | teardown
account_record            |   X    |                     |       |         |      |     X      |    X
identity_bindings         |   X    |                     |       |         |      |     X      |    X
database_isolation        |        |          X          |       |         |      |            |    X
quota_table               |        |                     |   X   |         |      |     X      |    X
billing_record            |        |                     |       |    X    |      |     X      |    X
seed_data                 |        |          X          |       |         |  X   |            |    X
feature_flags             |        |                     |   X   |         |  X   |            |
```

Generate this matrix from Step 1's surface inventory plus Step 2's scenario
list. Populate it cell-by-cell as test cases are written.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Testing only happy-path provisioning | Misses atomicity on mid-flow failure; offboarding is never exercised | Add failure-injection and teardown cases |
| Asserting isolation only in steady state | Per Microsoft tenancy models guidance, isolation must hold from the first call | Add immediate post-creation cross-tenant probe |
| Skipping idempotency tests | Re-provisioning retries after transient failures; duplicate records cause silent billing or quota bugs | Add second-call and partial-failure-retry cases |
| Hardcoding expected quota values as literals | Quota values change with pricing tiers; tests break on plan changes | Read expected values from the tier config fixture |
| Deleting test tenants without asserting deletion | Teardown path is untested; data retention bugs go undetected | Assert row counts = 0 across all tenant-bearing tables after delete |
| Using a superuser connection for post-offboarding assertions | Superuser bypasses RLS and soft-delete filters; tests pass even when app-layer deletion is broken | Use the app-role or the API layer to verify absence |
| Treating provisioning as atomic when it is not | Cloud provisioning pipelines are often eventually consistent; test may pass before side-effects complete | Use explicit wait/poll or event-driven fixtures that confirm each step before asserting |

## Output

This skill produces:

- A provisioning surface inventory (Step 1).
- A scenario list per surface (Step 2).
- A test suite skeleton (Steps 3-4) committed to the project repo.
- A coverage matrix (Step 5).

The runtime isolation gate is
`cross-tenant-data-leak-tests`.

## References

- AWS Well-Architected SaaS Lens, Tenant Isolation:
  [docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html).
- Microsoft Multitenant Architecture Center, Tenant Life Cycle:
  [learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenant-life-cycle).
- Microsoft Multitenant Architecture Center, Tenancy Models:
  [learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models).
- Microsoft Multitenant Architecture Center, Measure Consumption:
  [learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/measure-consumption](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/measure-consumption).
- Microsoft Multitenant Architecture Center, Resource Organisation:
  [learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/resource-organization](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/resource-organization).
- Tenant isolation (runtime gate):
  `cross-tenant-data-leak-tests`.
- Isolation models reference:
  `tenant-isolation-models-reference`.
