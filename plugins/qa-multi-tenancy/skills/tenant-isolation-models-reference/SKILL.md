---
name: tenant-isolation-models-reference
description: "Pure-reference catalog of tenant-isolation models for B2B SaaS. Defines the isolation continuum from full-isolation (separate compute + data + network per tenant) to fully-shared (one deployment, tenant_id discriminator), names the canonical models (Microsoft's automated-single-tenant / fully-multitenant / vertically-partitioned / horizontally-partitioned; AWS Well-Architected's silo / pool / bridge framing; deployment-stamps / supertenants terminology), enumerates the trade-offs (cost, blast radius, noisy neighbor, compliance, scale limits), and lists the test surfaces each model creates (cross-tenant data leak, tenant-id propagation, deployment-routing). Use as the model-selection reference when designing or auditing tenant isolation. Consumed by tenant-leak-test-author, cross-tenant-data-leak-tests, tenant-leak-critic, tenant-id-propagation-tracer."
rating: 23
d6: 4
---

# tenant-isolation-models-reference

## Overview

Tenant isolation is the foundational concern of every B2B SaaS
architecture. AWS Well-Architected SaaS Lens calls it "essential"
and notes that crossing a tenant boundary represents a
"significant and potentially unrecoverable event for a SaaS
business" (per
[docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html)).

Isolation is not a binary property - Microsoft's Azure
Architecture Center frames it as a **continuum** from fully
isolated (shared-nothing) to fully shared (everything shared),
with architectures often picking different points per tier (UI
shared, app shared, data isolated, for example). Per
[learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models):
"Instead of viewing isolation as a discrete property, consider it
a spectrum."

This skill is a **pure reference** consumed by the per-model test
authors + the tenant-leak critic. It does not execute anything.

## When to use

- Designing the tenant-isolation model for a new B2B SaaS product
  or feature.
- Auditing an existing model - does the testing surface match the
  declared isolation level?
- Choosing what to test: each model creates a distinct set of
  failure modes the test suite must cover.
- PR review of architecture changes that move components along
  the isolation continuum.

## Tenant vs deployment

A **tenant** is a logical customer boundary - typically a B2B
customer organisation, sometimes a consumer family / group. A
**deployment** is a physical set of infrastructure. The two are
not the same: a deployment can host many tenants (shared model),
or each tenant can have its own deployment (silo model). Per the
Azure Architecture Center, deployments are also called
**stamps** or **supertenants** in some frameworks.

The mapping is durable state: a tenant-to-deployment table must
exist somewhere so requests route to the right deployment.

## The four canonical models

### 1. Automated single-tenant (silo / fully-isolated)

| Property | Value |
|---|---|
| Compute | Dedicated per tenant |
| Data | Dedicated per tenant |
| Network | Dedicated per tenant |
| Cost per tenant | Highest |
| Blast radius | One tenant |
| Noisy neighbor | None |

Per Microsoft Azure Architecture Center: "you deploy a dedicated
set of infrastructure for each tenant... a key benefit is that
data for each tenant is isolated, which reduces the risk of
accidental leakage."

**When to choose:** regulated industries with strong isolation
mandates (healthcare HIPAA, financial services, government); a
small number of high-value enterprise customers; per-tenant
configuration is part of the value proposition.

**Test surface:** deployment automation (per the Deployment Stamps
pattern); cross-deployment operations like reporting; tenant-to-
deployment routing.

### 2. Fully multitenant (pool / fully-shared)

| Property | Value |
|---|---|
| Compute | Shared |
| Data | Shared (single DB with tenant_id discriminator) |
| Network | Shared |
| Cost per tenant | Lowest |
| Blast radius | All tenants |
| Noisy neighbor | High |

Per Microsoft Azure Architecture Center on the risks: "Be sure to
separate data for each tenant, and don't leak data among
tenants... a large tenant trying to perform a heavy query or
operation might affect other tenants."

**When to choose:** large number of low-margin customers; high
operational efficiency required; tenants accept shared
infrastructure.

**Test surface:** cross-tenant data leak (the canonical risk),
tenant_id propagation through every code path, noisy-neighbor
behaviour, resource quotas per tenant.

### 3. Horizontally partitioned (bridge)

| Property | Value |
|---|---|
| Compute | Shared |
| Data | Dedicated per tenant |
| Network | Shared |
| Cost per tenant | Medium |
| Blast radius | App-tier shared, data isolated |
| Noisy neighbor | App-tier yes, data tier no |

Per Microsoft: "build a single application tier and then deploy
individual databases for each tenant... helps mitigate a noisy
neighbor problem [in the data tier]."

**When to choose:** data isolation matters for compliance, but
shared compute is acceptable; data-tier noisy neighbors are the
dominant failure mode (heavy queries, large indexes).

**Test surface:** correct database routing per tenant; connection-
pool exhaustion under tenant concurrency; cross-DB query attempts
must fail.

### 4. Vertically partitioned

| Property | Value |
|---|---|
| Compute | Mix (some tenants dedicated, others shared) |
| Data | Mix |
| Network | Mix |
| Cost per tenant | Mixed |
| Blast radius | Per-tier decision |
| Noisy neighbor | Per-tier |

Per Microsoft: "a combination of single-tenant and multitenant
deployments... most customers' data and application tiers on
multitenant infrastructures, but you deploy single-tenant
infrastructures for customers who require higher performance or
data isolation." This includes geographic partitioning (one
deployment per region, tenants mapped to nearest region).

**When to choose:** majority of customers fit the shared model,
but a minority need silo (enterprise tier); geographic data-
residency requirements.

**Test surface:** every test from the shared model **plus** every
test from the silo model; tenant migration between tiers; pricing
tier enforcement.

## Isolation tier mapping

A common pattern is independent isolation per architecture tier:

| Tier | Common choice |
|---|---|
| UI | Shared host name (fully multitenant) |
| API gateway | Shared, with tenant claim in JWT |
| Application services | Shared, tenant context in every request |
| Async queues / topics | Shared topic with tenant_id message attribute, **or** per-tenant queue |
| Data | Often partitioned: tables with tenant_id (pool); schemas per tenant (bridge); databases per tenant (silo) |
| Object storage | Per-tenant prefix in bucket (pool); bucket per tenant (silo) |
| Search index | Per-tenant routing key (pool); index per tenant (silo) |

The test surface depends on the **lowest** isolation level in the
stack. A fully isolated UI but shared database still requires the
full cross-tenant data-leak test battery against the database.

## Isolation enforcement primitives

Tenant isolation is implemented by combining:

- **Identity context** - tenant_id in JWT claims (`auth.jwt()` in
  Supabase per
  [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security))
  or AWS Cognito ID token; the source of truth for "who is this
  request for".
- **Authorisation policy** - Postgres Row-Level Security per
  [`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md),
  AWS IAM dynamic policies generated per tenant, application-
  level authorisation middleware.
- **Resource ABAC tags** - tag each tenant resource with
  `tenant-id=<x>`, then enforce via IAM condition keys.
- **Network segmentation** - per-tenant VPCs / subnets / security
  groups (silo only).
- **Encryption keys** - per-tenant KMS keys (silo / bridge); useful
  for crypto-shredding on tenant offboarding.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `tenant_id` filter only in application code | One missed query path = cross-tenant leak | Push the filter to the database (RLS) or row-attribute IAM |
| `tenant_id` from request header / body | Spoofable; tenant A can claim to be tenant B | Always derive tenant_id from authenticated JWT/session, never from request payload |
| Trust the JWT `raw_user_meta_data` for tenant claims | User-modifiable per Supabase docs | Use `raw_app_meta_data` (server-set) or a server-side claim store |
| Single connection pool for all tenants | One slow tenant query blocks all | Per-tenant pools, or quota-aware pools |
| Shared object-storage bucket without prefix isolation | Object enumeration leaks across tenants | Per-tenant prefix + IAM condition on the prefix |
| No isolation tests in CI | Models drift over time | Cross-tenant leak tests in every PR per [`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md) |
| Migration scripts run without tenant context | Schema changes touch all tenants at once; high blast radius | Stamp pattern with progressive rollout |

## Test surface by model

| Model | Required test categories |
|---|---|
| Silo / single-tenant | Tenant-to-deployment routing; per-deployment health; deployment automation |
| Pool / fully-shared | Cross-tenant data leak (highest priority); tenant_id propagation; noisy-neighbor mitigation; quota enforcement |
| Bridge / horizontal | Pool tests **+** database routing per tenant; cross-database query rejection |
| Vertical | Pool + silo tests **+** tier-migration tests |

The cross-tenant data leak suite is the universal floor: even
silo deployments share *some* surface (account-management APIs,
billing, identity providers) where pool-like leaks are possible.

## Limitations

- **No model is leak-proof by construction.** Silo defends
  against most cross-tenant leaks but inherits leak risk in any
  shared management surface (admin UI, billing). RLS defends DB
  but not application caches.
- **Cost vs isolation is a real trade-off.** Microsoft's docs
  note that "if a single tenant requires a specific
  infrastructure cost, 100 tenants probably require 100 times
  that cost" in pure silo.
- **Compliance scope.** Some regulators (e.g., FedRAMP High,
  certain healthcare regimes) effectively mandate silo for
  certain data classifications. Check counsel-of-record before
  assuming pool is acceptable.
- **Azure subscription / AWS account limits.** Per Microsoft
  docs: "you're more likely to reach Azure resource scale limits
  when you have a shared set of infrastructure." Pool models hit
  account-level quotas faster than silo.

## References

- AWS Well-Architected SaaS Lens - Tenant Isolation:
  [docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html).
- Microsoft Azure Architecture Center - Tenancy Models:
  [learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models).
- Microsoft Deployment Stamps pattern (related):
  [learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp](https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp).
- Supabase RLS guide (consumed in
  [`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md)):
  [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Consumed by:
  [`tenant-leak-test-author`](../tenant-leak-test-author/SKILL.md),
  [`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md),
  [`tenant-id-propagation-tracer`](../../agents/tenant-id-propagation-tracer.md),
  [`tenant-leak-critic`](../../agents/tenant-leak-critic.md).
