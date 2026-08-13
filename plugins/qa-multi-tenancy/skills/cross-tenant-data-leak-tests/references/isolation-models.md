# Tenant-isolation models

Companion reference for `cross-tenant-data-leak-tests`. The isolation model
in use (silo / pool / bridge / vertically-partitioned) decides which test
surfaces the planning section must cover.

## Overview

Tenant isolation is the foundational concern of every B2B SaaS
architecture: the AWS Well-Architected SaaS Lens calls it essential and
treats crossing a tenant boundary as a significant, potentially
unrecoverable event for a SaaS business. Isolation is a **continuum**,
not a binary - Microsoft's Azure Architecture Center frames it as a
spectrum from shared-nothing to everything-shared, with architectures
often picking different points per tier (UI shared, app shared, data
isolated). This is a pure reference consumed by the leak-test planning section
and the tenant-leak critic; it executes nothing.

## When to use

- Designing the tenant-isolation model for a new B2B SaaS product or
  feature.
- Auditing an existing model - does the testing surface match the
  declared isolation level?
- Choosing what to test: each model creates a distinct set of failure
  modes the test suite must cover.
- PR review of architecture changes that move components along the
  isolation continuum.

## Tenant vs deployment

A **tenant** is a logical customer boundary; a **deployment** (also
called a stamp or supertenant) is a physical set of infrastructure. One
deployment can host many tenants (shared model), or each tenant can have
its own deployment (silo). The tenant-to-deployment mapping is durable
state: a routing table must exist somewhere so requests reach the right
deployment.

## The four canonical models

| Model | Compute | Data | Network | Cost/tenant | Blast radius | Noisy neighbor |
|---|---|---|---|---|---|---|
| Automated single-tenant (silo) | Dedicated | Dedicated | Dedicated | Highest | One tenant | None |
| Fully multitenant (pool) | Shared | Shared (tenant_id discriminator) | Shared | Lowest | All tenants | High |
| Horizontally partitioned (bridge) | Shared | Dedicated per tenant | Shared | Medium | Data isolated | Data tier: none |
| Vertically partitioned | Mix | Mix | Mix | Mixed | Per-tier | Per-tier |

Per-model when-to-choose guidance, the sourced Microsoft framing, and
each model's test surface are in [models.md](models.md).

## Isolation enforcement primitives

Tenant isolation is implemented by combining:

- **Identity context** - tenant_id in JWT claims (`auth.jwt()` in
  Supabase per
  [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security))
  or AWS Cognito ID token; the source of truth for "who is this request
  for".
- **Authorisation policy** - Postgres Row-Level Security per
  `rls-reference`, AWS IAM dynamic policies
  generated per tenant, application-level authorisation middleware.
- **Resource ABAC tags** - tag each tenant resource with
  `tenant-id=<x>`, then enforce via IAM condition keys.
- **Network segmentation** - per-tenant VPCs / subnets / security groups
  (silo only).
- **Encryption keys** - per-tenant KMS keys (silo / bridge); useful for
  crypto-shredding on tenant offboarding.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `tenant_id` filter only in application code | One missed query path = cross-tenant leak | Push the filter to the database (RLS) or row-attribute IAM |
| `tenant_id` from request header / body | Spoofable; tenant A can claim to be tenant B | Always derive tenant_id from authenticated JWT/session, never from request payload |
| Trust the JWT `raw_user_meta_data` for tenant claims | User-modifiable per Supabase docs | Use `raw_app_meta_data` (server-set) or a server-side claim store |
| Single connection pool for all tenants | One slow tenant query blocks all | Per-tenant pools, or quota-aware pools |
| Shared object-storage bucket without prefix isolation | Object enumeration leaks across tenants | Per-tenant prefix + IAM condition on the prefix |
| No isolation tests in CI | Models drift over time | Cross-tenant leak tests in every PR per `cross-tenant-data-leak-tests` |
| Migration scripts run without tenant context | Schema changes touch all tenants at once; high blast radius | Stamp pattern with progressive rollout |

## Test surface

The required test categories per model, plus the per-tier isolation
mapping, are in [test-surfaces.md](test-surfaces.md).
The cross-tenant data leak suite is the universal floor: even silo
deployments share some surface (account-management APIs, billing,
identity providers) where pool-like leaks are possible.

## Limitations

- **No model is leak-proof by construction.** Silo defends against most
  cross-tenant leaks but inherits leak risk in any shared management
  surface (admin UI, billing). RLS defends the DB but not application
  caches.
- **Cost vs isolation is a real trade-off.** Per Microsoft, if a single
  tenant requires a given infrastructure cost, 100 tenants in pure silo
  require roughly 100 times that cost.
- **Compliance scope.** Some regulators (e.g., FedRAMP High, certain
  healthcare regimes) effectively mandate silo for certain data
  classifications. Check counsel-of-record before assuming pool is
  acceptable.
- **Azure subscription / AWS account limits.** Shared infrastructure
  reaches account-level scale limits faster than silo.

## References

- AWS Well-Architected SaaS Lens - Tenant Isolation:
  [docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html).
- Microsoft Azure Architecture Center - Tenancy Models:
  [learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models).
- Microsoft Deployment Stamps pattern (related):
  [learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp](https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp).
- Supabase RLS guide (consumed in `rls-reference`):
  [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Per-model detail: [models.md](models.md); test surface: [test-surfaces.md](test-surfaces.md).
- Consumed by: `cross-tenant-data-leak-tests` (host skill).
