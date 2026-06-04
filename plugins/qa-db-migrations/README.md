# qa-db-migrations

Database migration testing. Four per-tool skill wrappers covering
the mainstream database migration ecosystem (Flyway, Liquibase,
Atlas, SQLMesh) plus an adversarial reviewer agent that classifies
operations against an 8-category taxonomy and refuses to approve
production-unsafe patterns.

Anchored on the ISO 25010 portability characteristic. Universal
need: every team that ships schema changes.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [flyway-migrations](skills/flyway-migrations/SKILL.md) | V/U/R prefix versioned SQL migrations + flyway_schema_history; production guards (`cleanDisabled`, `validateOnMigrate`) |
| Skill | [liquibase-migrations](skills/liquibase-migrations/SKILL.md) | XML/YAML/JSON/SQL changelog with preconditions + contexts/labels + per-changeset rollback |
| Skill | [atlas-migrations](skills/atlas-migrations/SKILL.md) | Terraform-style declarative HCL or SQL schema; `atlas migrate diff/apply/lint` with destructive-pattern detection |
| Skill | [sqlmesh-migrations](skills/sqlmesh-migrations/SKILL.md) | Data-pipeline + virtual environments; auto-classification of breaking-vs-non-breaking + downstream impact analysis |
| Agent | [migration-blast-radius-reviewer](agents/migration-blast-radius-reviewer.md) | Adversarial reviewer for any migration tool: 8-category operation taxonomy; refuses to approve unsafe NOT NULL or DROP COLUMN without consumer coordination |
| Agent | [db-migration-performance-critic](agents/db-migration-performance-critic.md) | Performance-focused adversarial reviewer: flags missing CONCURRENTLY on index creation, full-table-rewrite ALTERs holding ACCESS EXCLUSIVE locks, missing post-migration ANALYZE, partition-pruning hazards, and MySQL VARCHAR boundary crossings |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-db-migrations@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
