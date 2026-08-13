# qa-multi-tenancy

Tenant-isolation testing for B2B SaaS: cross-tenant leak-test planning + the runtime CI gate (isolation-model references silo / pool / bridge included), row-level security across Postgres and other engines, tenant provisioning/offboarding tests, and adversarial review of tenant-leak risk with tenant-id propagation tracing.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [cross-tenant-data-leak-tests](skills/cross-tenant-data-leak-tests/SKILL.md) | Plans and implements the cross-tenant leak-test suite - surface inventory, OWASP WSTG-ATHZ-02 coverage matrix, the canonical test battery, and the CI gate; isolation models (silo / pool / bridge) in references/isolation-models.md |
| Skill | [rls-reference](skills/rls-reference/SKILL.md) | Pure-reference catalog of row-level security for tenant isolation - Postgres-first (CREATE POLICY, FORCE ROW LEVEL SECURITY, bypass rules, tenant context, performance); MySQL / MariaDB, CockroachDB, Vitess, and SQL Server in references/other-engines.md |
| Skill | [tenant-onboarding-test-author](skills/tenant-onboarding-test-author/SKILL.md) | Workflow-driven skill that authors a test suite for tenant provisioning and offboarding: account creation, isolation at creation, quotas, billing linkage, idempotent re-provisioning, teardown with full data deletion |
| Agent | [tenant-leak-critic](agents/tenant-leak-critic.md) | Adversarial agent that reviews a PR or set of changed files for tenant-leak risk, including a tenant-id propagation-tracing step per changed entry point. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-multi-tenancy@testland-qa
```
