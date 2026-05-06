# qa-db-migrations

Database migration testing. Four per-tool skill wrappers covering
the mainstream database migration ecosystem (Flyway, Liquibase,
Atlas, SQLMesh) plus an adversarial reviewer agent that classifies
operations against an 8-category taxonomy and refuses to approve
production-unsafe patterns.

Second Phase 4 plugin per the v2 master plan. ISO 25010 portability
characteristic; universal need (every team that ships schema
changes).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [flyway-migrations](skills/flyway-migrations/SKILL.md) | S1 | V/U/R prefix versioned SQL migrations + flyway_schema_history; production guards (`cleanDisabled`, `validateOnMigrate`) |
| Skill | [liquibase-migrations](skills/liquibase-migrations/SKILL.md) | S1 | XML/YAML/JSON/SQL changelog with preconditions + contexts/labels + per-changeset rollback |
| Skill | [atlas-migrations](skills/atlas-migrations/SKILL.md) | S1 | Terraform-style declarative HCL or SQL schema; `atlas migrate diff/apply/lint` with destructive-pattern detection |
| Skill | [sqlmesh-migrations](skills/sqlmesh-migrations/SKILL.md) | S1 | Data-pipeline + virtual environments; auto-classification of breaking-vs-non-breaking + downstream impact analysis |
| Agent | [migration-blast-radius-reviewer](agents/migration-blast-radius-reviewer.md) | A3 | Adversarial reviewer for any migration tool: 8-category operation taxonomy; refuses to approve unsafe NOT NULL or DROP COLUMN without consumer coordination |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-db-migrations@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance) **with the v2
amendment D6=4 floor for Phase 4+ components** — every concrete
claim is cited inline at the point of use, not in an end-of-body
References-only section. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
