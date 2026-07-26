# Atlas migration anti-patterns and limitations

Reference catalogue for the atlas-migrations skill. Each anti-pattern
maps to a fix; each limitation names a fallback.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Edit a migration after it's been applied to staging/prod | `atlas migrate apply` fails on hash mismatch | Add a new migration that adjusts |
| Skip `--dev-url` | Atlas can't compute diff; commands fail or produce wrong output | Always pass `--dev-url` (Steps 3, 4, 6) |
| Use declarative `schema apply` directly to production | No audit trail of applied changes | Use versioned mode in production (Step 4) |
| Skip `atlas migrate lint` in CI | Destructive migrations slip through review | Always lint in CI (Step 8) |
| `atlas migrate hash` after every edit (without team review) | Defeats integrity check | Hash sync only after intentional edit + team review |

## Limitations

- Some DBMS-specific features (e.g., Oracle PL/SQL packages,
  PostgreSQL extension management) have limited HCL support - fall
  back to SQL schema for those.
- Lint rules are general-purpose; team-specific policies (e.g., "no
  `DROP TABLE` without DBA approval") need adversarial review on top.
- `--dev-url` requires a real DBMS instance (or Docker) - Atlas
  cannot diff schemas without one.
- Atlas Cloud (managed plan visualization) is paid; OSS covers
  the CLI workflow.
