# qa-db-migrations

Database migration testing. Three per-tool skill wrappers covering
the mainstream database migration ecosystem (Flyway, Liquibase,
Atlas), the operation taxonomy they share, plus an adversarial
reviewer agent that classifies operations against an 8-category
taxonomy, runs a DDL performance review, and refuses to approve
production-unsafe patterns.

Anchored on the ISO 25010 portability characteristic. Universal
need: every team that ships schema changes.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [flyway-migrations](skills/flyway-migrations/SKILL.md) | V/U/R prefix versioned SQL migrations + flyway_schema_history; production guards (`cleanDisabled`, `validateOnMigrate`) |
| Skill | [liquibase-migrations](skills/liquibase-migrations/SKILL.md) | XML/YAML/JSON/SQL changelog with preconditions + contexts/labels + per-changeset rollback |
| Skill | [atlas-migrations](skills/atlas-migrations/SKILL.md) | Terraform-style declarative HCL or SQL schema; `atlas migrate diff/apply/lint` with destructive-pattern detection |
| Skill | [migration-operation-taxonomy](skills/migration-operation-taxonomy/SKILL.md) | Classifies each DDL statement into eight operation categories with a severity justified by the lock mode and rewrite behavior the named engine and version actually performs. |
| Agent | [migration-blast-radius-reviewer](agents/migration-blast-radius-reviewer.md) | Adversarial reviewer for any migration tool: 8-category operation taxonomy plus a performance review (missing CONCURRENTLY, full-table-rewrite ALTERs under ACCESS EXCLUSIVE, missing post-migration ANALYZE, lock-time estimates); refuses to approve unsafe NOT NULL or DROP COLUMN without consumer coordination |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-db-migrations@testland-qa
```
