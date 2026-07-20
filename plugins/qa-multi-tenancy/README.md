# qa-multi-tenancy

Tenant-isolation testing for B2B SaaS: row-level security, cross-tenant leak detection, tenant-id propagation tracing, isolation-model references (silo / pool / bridge), and adversarial review of tenant-leak risk.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [cross-tenant-data-leak-tests](skills/cross-tenant-data-leak-tests/SKILL.md) | Workflow-driven skill that emits the runtime CI gate of cross-tenant leak tests - the actual battery a multi-tenant codebase must pass on... |
| Skill | [multi-engine-row-level-security-reference](skills/multi-engine-row-level-security-reference/SKILL.md) | Pure-reference catalog of row/tenant isolation mechanisms for non-Postgres engines: MySQL and MariaDB (no native RLS - views with SQL SEC... |
| Skill | [row-level-security-postgres-reference](skills/row-level-security-postgres-reference/SKILL.md) | Pure-reference catalog of Postgres Row-Level Security (RLS) for tenant isolation. |
| Skill | [tenant-isolation-models-reference](skills/tenant-isolation-models-reference/SKILL.md) | Pure-reference catalog of tenant-isolation models for B2B SaaS. |
| Skill | [tenant-leak-test-author](skills/tenant-leak-test-author/SKILL.md) | Workflow-driven skill that builds a tenant-leak test plan from an inventory of tenant-bearing surfaces (database tables, APIs, object sto... |
| Skill | [tenant-onboarding-test-author](skills/tenant-onboarding-test-author/SKILL.md) | Workflow-driven skill that authors a test suite for tenant provisioning and offboarding: account creation, isolation at creation (no cros... |
| Agent | [tenant-id-propagation-tracer](agents/tenant-id-propagation-tracer.md) | Read-only specialist that traces how tenant_id flows through a single code path - from the request entry (HTTP handler, queue listener, s... |
| Agent | [tenant-leak-critic](agents/tenant-leak-critic.md) | Adversarial agent that reviews a PR or set of changed files for tenant-leak risk. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-multi-tenancy@testland-qa
```
