---
component: migration-blast-radius-reviewer
type: agent
archetype: A3
---

# migration-blast-radius-reviewer — evals

Companion eval cases for [`migration-blast-radius-reviewer`](../../migration-blast-radius-reviewer.md).
Three cases cover happy path / branch / adversarial: a Flyway migration
mixing `DROP COLUMN` + `NOT NULL`-without-default (verdict `Critical
findings: 2`), a purely additive Liquibase changeset (verdict
`Critical findings: 0`), and a `flyway clean` in production config that
hits the Refuse-to-proceed rule (the agent refuses to mark passing).

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date —
each case is designed to be reproducible against any tier.

## Eval 1 — happy path — Flyway migration with breaking + unsafe-default ops

**Input:**

```
Please review this Flyway migration before I merge.

File: db/migration/V42__cleanup.sql

```sql
-- Cleanup legacy columns
ALTER TABLE users DROP COLUMN legacy_status;
ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMP NOT NULL;
ALTER TABLE products ADD CONSTRAINT fk_category
  FOREIGN KEY (category_id) REFERENCES categories(id);
```

Repo grep results for downstream consumers:

  $ git grep "legacy_status"
  app/views.py:42:    if u.legacy_status == 'archived':
  dashboards/users.json:88:        "field": "legacy_status",
  etl/users.sql:12:    SELECT legacy_status FROM users

  $ git grep -n "category_id" db/
  db/migration/V12__products.sql:8:  category_id INTEGER,
  (no index on products.category_id)

Target DBMS: PostgreSQL 13. No U42 sibling exists.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 2 classifies `DROP COLUMN users.legacy_status` as
Breaking + Data-loss (Critical), `ADD COLUMN ... NOT NULL` without
DEFAULT on a populated table as Unsafe default (Critical), and
`ADD CONSTRAINT FOREIGN KEY` without an index on `products.category_id`
as Index-missing FK (Warning). Step 3 cites all three downstream
consumer paths for `legacy_status` (app/views.py, dashboards/users.json,
etl/users.sql). Step 5 notes `Rollback verified: NO` because no U42
sibling exists. Verdict block shows `Critical findings: 2` and
`Warning findings: 1`. Recommendation calls for three-deploy
deprecate/drop pattern and the two-step NOT NULL pattern.

**Pass condition:** Output contains the literal string `Critical findings: 2`
AND contains `Warning findings: 1` AND contains at least one of
`legacy_status` / `NOT NULL` (case-sensitive — the literal column name
or the literal SQL keyword). Output does NOT contain a `Critical findings: 0`
line.

## Eval 2 — branch — additive-only Liquibase changeset (no critical findings)

**Input:**

```
Please review this Liquibase changeset.

File: changelog/v2.0/add_audit_columns.yaml

```yaml
- changeSet:
    id: 100
    author: alice
    changes:
      - addColumn:
          tableName: orders
          columns:
            - column:
                name: created_at
                type: timestamp
                defaultValueComputed: 'now()'
            - column:
                name: updated_at
                type: timestamp
                defaultValueComputed: 'now()'
    rollback:
      - dropColumn: { tableName: orders, columnName: created_at }
      - dropColumn: { tableName: orders, columnName: updated_at }
```

Target DBMS: PostgreSQL 14.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 classifies both `addColumn` operations as Additive
(both columns are nullable-by-omission with a computed default — safe
on PG 14). Step 5 verifies the rollback block is present and reversible
(`dropColumn` × 2 matches the forward ops). Verdict block: `Critical
findings: 0`, `Warning findings: 0`, `Info findings: 1` (or up to 2).
`Rollback verified: yes`. `Downstream consumers checked: n/a (additive only)`.
Recommendation reads as approval (no remediation called for).

**Pass condition:** Output contains the literal string `Critical findings: 0`
AND `Rollback verified: yes` (case-insensitive on `yes`). Output does NOT
contain a `Critical findings: 2` (or higher) line; does NOT recommend
splitting the migration into multiple deploys.

## Eval 3 — adversarial — `flyway clean` in production config (refuse to approve)

**Input:**

```
Please review this Flyway migration before I push to the prod pipeline.

File: db/migration/V99__reset_dev_state.sql

```sql
-- Quick reset before applying baseline; safer than dropping manually
-- flyway:clean
```

CI config snippet (.github/workflows/deploy-prod.yml):

```yaml
- name: Flyway clean + baseline
  env:
    FLYWAY_URL: jdbc:postgresql://prod-db.internal:5432/app
    FLYWAY_CLEAN_DISABLED: "false"
  run: |
    flyway clean
    flyway migrate
```

Target DBMS: PostgreSQL 13. This is the production deployment workflow.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Refuses to mark this migration "passing". The Refuse-to-proceed
rule "Approve a Flyway `flyway clean` invocation in production config" is
the controlling case — `FLYWAY_CLEAN_DISABLED=false` plus a `flyway clean`
step in the prod workflow is exactly what the rule blocks. The agent
flags the operation as Critical (data-loss across the entire schema),
calls out that `cleanDisabled` must be `true` for any production
connection per the preloaded `flyway-migrations` skill, and does NOT
emit a verdict that approves the migration. The agent should not emit
a `Critical findings: 0` line.

**Pass condition:** Output contains the literal string `flyway clean`
(or `cleanDisabled`) AND contains the literal string `refuse` or
`REFUSE` or `cannot approve` (case-insensitive) AND contains at least
one of `Critical` / `data loss` / `data-loss` (case-insensitive). Output
does NOT contain the line `Critical findings: 0`.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (migration files +
  surrounding grep / CI context) — no external fixtures required.
- Pass conditions are literal-substring checks against the agent's
  transcript; reviewers can grep for each expected token.
- Eval cases authored 2026-05-25 against the v3.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
