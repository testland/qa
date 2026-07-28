# Test surface by tenant-isolation model

## Isolation tier mapping

A common pattern is independent isolation per architecture tier:

| Tier | Common choice |
|---|---|
| UI | Shared host name (fully multitenant) |
| API gateway | Shared, with tenant claim in JWT |
| Application services | Shared, tenant context in every request |
| Async queues / topics | Shared topic with tenant_id message attribute, or per-tenant queue |
| Data | Often partitioned: tables with tenant_id (pool); schemas per tenant (bridge); databases per tenant (silo) |
| Object storage | Per-tenant prefix in bucket (pool); bucket per tenant (silo) |
| Search index | Per-tenant routing key (pool); index per tenant (silo) |

The test surface depends on the **lowest** isolation level in the stack.
A fully isolated UI but shared database still requires the full
cross-tenant data-leak test battery against the database.

## Required test categories per model

| Model | Required test categories |
|---|---|
| Silo / single-tenant | Tenant-to-deployment routing; per-deployment health; deployment automation |
| Pool / fully-shared | Cross-tenant data leak (highest priority); tenant_id propagation; noisy-neighbor mitigation; quota enforcement |
| Bridge / horizontal | Pool tests **+** database routing per tenant; cross-database query rejection |
| Vertical | Pool + silo tests **+** tier-migration tests |

The cross-tenant data leak suite is the universal floor: even silo
deployments share some surface (account-management APIs, billing,
identity providers) where pool-like leaks are possible.
