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
the project repo alongside the runtime suite from `tenant-leak-test-author`.

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

## How to use

1. Trace the onboarding and offboarding code path and inventory every
   state-changing surface, using
   [references/provisioning-surface-map.md](references/provisioning-surface-map.md).
2. For each surface, pull the scenarios that must hold from
   [references/provisioning-test-scenarios.md](references/provisioning-test-scenarios.md) -
   creation, isolation-at-create, quota, billing, seed, idempotency, teardown.
3. Name each test `test_<surface>_<scenario>_<expected>()` and declare the shared
   fixtures (Step 3 table).
4. Pick the framework for your stack (Step 4 table) and emit the suite skeleton
   from
   [references/test-skeleton-examples.md](references/test-skeleton-examples.md).
5. Build the coverage matrix (Step 5); treat every empty cell as a gap to justify
   or schedule.
6. Run the suite as a non-privileged app role (not a superuser) so offboarding and
   RLS assertions stay valid, then cross-check the Anti-patterns table.

## Step 1 - Map provisioning pipeline surfaces

Walk the onboarding code path end-to-end and enumerate every surface that changes
state during provisioning or deprovisioning - tenant registry, identity store,
database layer, object storage, quota table, billing record, seed data,
re-provisioning path, and teardown. The full surface inventory table, plus the
AWS Well-Architected SaaS Lens and Microsoft lifecycle gating notes:
[references/provisioning-surface-map.md](references/provisioning-surface-map.md).

## Step 2 - Enumerate test scenarios per surface

For each surface from Step 1, identify the scenarios that must hold: account
creation atomicity, isolation from the first call, default quota values, billing
linkage, seed-data scoping, idempotent re-provisioning, and teardown with full
deletion after the retention period. The full per-surface scenario catalog with
its Microsoft citations:
[references/provisioning-test-scenarios.md](references/provisioning-test-scenarios.md).

## Step 3 - Generate test cases

Naming convention matches `tenant-leak-test-author`:

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

Same framework selection table as `tenant-leak-test-author`:

| Stack | Framework |
|---|---|
| Python (Django/Flask/FastAPI) | pytest |
| Node (Express/Nest) | Jest or Vitest + Supertest |
| JVM (Spring/Quarkus) | JUnit 5 + Testcontainers |
| Go | `testing` + `httptest` |
| Ruby (Rails) | RSpec + `request` specs |

The full pytest skeleton (one test per Step 2 scenario) and a language-agnostic
SQL idempotency assertion:
[references/test-skeleton-examples.md](references/test-skeleton-examples.md).

## Step 5 - Coverage matrix

Track one cell per (surface, scenario). Empty cells are coverage gaps that the PR
author must justify or schedule.

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

Generate this matrix from Step 1's surface inventory plus Step 2's scenario list.
Populate it cell-by-cell as test cases are written.

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

## Worked example

A Django SaaS adds a `Team`-tier onboarding flow. Step 1 inventories the surfaces
it touches: the `tenants` registry, identity role bindings, a `TenantQuota` row, a
`billing_subscriptions` record, and a seeded welcome project. Step 2 selects the
scenarios: duplicate slug returns conflict, the new tenant is invisible to an
existing tenant immediately, the quota matches the tier default, billing is
linked, a second provisioning call stays idempotent, and offboarding deletes the
data.

For idempotency, Step 3 names the test
`test_provisioning_idempotent_no_duplicate_quota_row()` and Step 4 emits the
pytest body from the skeleton: it POSTs `/api/tenants/` a second time with the
same slug, then asserts `TenantQuota.objects.filter(tenant=new_tenant).count() ==
1`. Run as the non-superuser app role, the second call reuses the existing record
rather than inserting a duplicate, so the assertion passes. The `quota_table` x
`idempotent` cell in the Step 5 matrix flips to `X`.

## Output

This skill produces:

- A provisioning surface inventory (Step 1).
- A scenario list per surface (Step 2).
- A test suite skeleton (Steps 3-4) committed to the project repo.
- A coverage matrix (Step 5).

The runtime isolation gate is `cross-tenant-data-leak-tests`.

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
- [references/provisioning-surface-map.md](references/provisioning-surface-map.md) -
  provisioning surface inventory and lifecycle gating notes.
- [references/provisioning-test-scenarios.md](references/provisioning-test-scenarios.md) -
  per-surface scenario catalog.
- [references/test-skeleton-examples.md](references/test-skeleton-examples.md) -
  pytest skeleton and SQL idempotency assertion.
- Tenant isolation (runtime gate): `cross-tenant-data-leak-tests`.
- Isolation models reference: `tenant-isolation-models-reference`.
