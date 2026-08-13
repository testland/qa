# The four canonical tenant-isolation models

Naming across frameworks: Microsoft's automated-single-tenant /
fully-multitenant / horizontally-partitioned / vertically-partitioned;
AWS Well-Architected's silo / pool / bridge. Deployments are also called
stamps or supertenants.

## 1. Automated single-tenant (silo / fully-isolated)

| Property | Value |
|---|---|
| Compute | Dedicated per tenant |
| Data | Dedicated per tenant |
| Network | Dedicated per tenant |
| Cost per tenant | Highest |
| Blast radius | One tenant |
| Noisy neighbor | None |

Microsoft's framing: deploying a dedicated set of infrastructure per
tenant isolates each tenant's data and reduces the risk of accidental
leakage.

**When to choose:** regulated industries with strong isolation mandates
(healthcare HIPAA, financial services, government); a small number of
high-value enterprise customers; per-tenant configuration is part of the
value proposition.

**Test surface:** deployment automation (the Deployment Stamps pattern);
cross-deployment operations like reporting; tenant-to-deployment routing.

## 2. Fully multitenant (pool / fully-shared)

| Property | Value |
|---|---|
| Compute | Shared |
| Data | Shared (single DB with tenant_id discriminator) |
| Network | Shared |
| Cost per tenant | Lowest |
| Blast radius | All tenants |
| Noisy neighbor | High |

Microsoft's risk framing: separate each tenant's data and don't leak
across tenants; a large tenant running a heavy query or operation might
affect other tenants.

**When to choose:** a large number of low-margin customers; high
operational efficiency required; tenants accept shared infrastructure.

**Test surface:** cross-tenant data leak (the canonical risk), tenant_id
propagation through every code path, noisy-neighbor behaviour, resource
quotas per tenant.

## 3. Horizontally partitioned (bridge)

| Property | Value |
|---|---|
| Compute | Shared |
| Data | Dedicated per tenant |
| Network | Shared |
| Cost per tenant | Medium |
| Blast radius | App-tier shared, data isolated |
| Noisy neighbor | App-tier yes, data tier no |

Microsoft's framing: a single application tier with an individual
database per tenant, which mitigates the noisy-neighbor problem in the
data tier.

**When to choose:** data isolation matters for compliance, but shared
compute is acceptable; data-tier noisy neighbors are the dominant failure
mode (heavy queries, large indexes).

**Test surface:** correct database routing per tenant; connection-pool
exhaustion under tenant concurrency; cross-DB query attempts must fail.

## 4. Vertically partitioned

| Property | Value |
|---|---|
| Compute | Mix (some tenants dedicated, others shared) |
| Data | Mix |
| Network | Mix |
| Cost per tenant | Mixed |
| Blast radius | Per-tier decision |
| Noisy neighbor | Per-tier |

Microsoft's framing: a combination of single-tenant and multitenant
deployments - most customers' data and application tiers on multitenant
infrastructure, with single-tenant infrastructure for customers who
require higher performance or data isolation. Includes geographic
partitioning (one deployment per region, tenants mapped to the nearest
region).

**When to choose:** the majority of customers fit the shared model, but a
minority need silo (enterprise tier); geographic data-residency
requirements.

**Test surface:** every test from the shared model plus every test from
the silo model; tenant migration between tiers; pricing tier enforcement.

Source: Microsoft Azure Architecture Center - Tenancy Models
[learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models).
