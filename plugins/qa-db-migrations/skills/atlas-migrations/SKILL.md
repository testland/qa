---
name: atlas-migrations
description: "Use when a team wants declarative, Terraform-style database schema management or migration linting beyond Flyway and Liquibase: Atlas schema apply, migrate diff against a dev database, migrate lint for destructive or locking changes, and migrate hash, across a dozen databases."
---

# atlas-migrations

## Overview

Atlas manages and migrates database schemas as code - define the
desired schema and Atlas plans, lints, tests, and applies the changes
(per [atlasgo.io/getting-started][at-start]). Two operating modes:

[at-start]: https://atlasgo.io/getting-started

1. **Declarative** - define desired state in HCL or SQL; Atlas
   computes diff and applies (`atlas schema apply`).
2. **Versioned** - Atlas generates timestamped migration files from
   schema diffs (`atlas migrate diff`); migrations apply forward
   (`atlas migrate apply`).

Use versioned mode where every change needs a reviewed file and an
audit trail; declarative mode suits fast local iteration.

## How to use

Follow the steps in order. Lint and validate (Step 5) are the gate:
nothing reaches `migrate apply` (Step 6) until they pass.

## Step 1 - Install

Per [at-start][at-start]:

```bash
# Homebrew (macOS / Linux)
brew install ariga/tap/atlas

# Docker: nothing to install, mount the migrations directory
docker run --rm --net=host -v "$(pwd)/migrations:/migrations" \
  arigaio/atlas migrate apply --url "$DATABASE_URL"
```

In GitHub Actions, `uses: ariga/setup-atlas@v0` puts the CLI on the
runner (Step 8, per [at-gha][at-gha]). The getting-started page also
lists per-platform binaries with md5 and sha256 checksums; verify the
checksum before running a downloaded binary. Prefer these over piping
the vendor install script into a shell, which runs unreviewed remote
code.

[at-gha]: https://atlasgo.io/integrations/github-actions

## Step 2 - Define schema

Per [at-start][at-start], schema can be SQL (most common) or HCL. SQL
example (PostgreSQL):

```sql
-- schema.sql
CREATE TABLE users (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

For the same schema expressed in Atlas's HCL DSL and guidance on when
HCL vs SQL matters, see [references/hcl-schema.md](references/hcl-schema.md).

The dev DB referenced via `--dev-url` is a **temporary scratch
database** Atlas uses to compute the diff (Atlas applies the desired
state to the scratch DB, then computes the migration vs production).

## Step 3 - Apply schema (declarative mode)

Per [at-start][at-start]:

```bash
atlas schema apply --url "$DATABASE_URL" --to file://schema.sql \
  --dev-url "docker://postgres/17/dev?search_path=public"
```

`--url` = target DB; `--to` = desired schema definition; `--dev-url`
= scratch DB for diff computation. Atlas prints the planned changes
and prompts for confirmation by default.

## Step 4 - Generate versioned migrations

Per [at-start][at-start]:

```bash
atlas migrate diff initial --to file://schema.sql \
  --dev-url "docker://postgres/17/dev?search_path=public"
```

This generates a timestamped migration file in `migrations/` (e.g.,
`20260506120000_initial.sql`). Subsequent calls with a new schema
generate new migrations against the previous state.

## Step 5 - Gate: validate and lint before any apply

`atlas migrate lint` needs Atlas Pro from v0.38 (`atlas login` first);
without it, keep `migrate validate` and use the `migration-blast-radius-reviewer`
agent for the risk review ([lint docs][at-lint]).

1. **Make the risky analyzers fail.** Only `destructive` fails lint by
   default (exit code 1); data-dependent and backward-incompatible
   findings are only reported ([analyzers][at-an]). Turn them into
   errors in `atlas.hcl`:

   ```hcl
   lint {
     data_depend  { error = true }   # MF1xx: NOT NULL add, new unique index on existing data
     incompatible { error = true }   # BC1xx: rename / drop of tables and columns
   }
   ```

2. **Run the gate:**

   ```bash
   atlas migrate validate --dir "file://migrations" \
     --dev-url "docker://postgres/17/dev?search_path=public"
   atlas migrate lint --dir "file://migrations" \
     --dev-url "docker://postgres/17/dev?search_path=public" --latest 1
   ```

   `validate` checks the directory against `atlas.sum` and, with
   `--dev-url`, replays the files to check the SQL ([CLI reference][at-cli]).

3. **Fix and re-lint.** For each finding, change the migration, not the
   rule: add a `DEFAULT` or backfill before `SET NOT NULL` (MF103/MF104),
   split a rename into add-copy-drop across releases (BC), build the
   index `CONCURRENTLY` on PostgreSQL (PG1xx). Re-run
   `atlas migrate diff`/`atlas migrate hash` after editing an unapplied
   file, then repeat step 2 until it exits 0. Suppress a finding with
   `-- atlas:nolint <code>` only with a comment saying why and a
   reviewer's sign-off.

## Step 6 - Apply versioned migrations

```bash
atlas migrate apply --url "$DATABASE_URL" --dry-run   # print the SQL
atlas migrate apply --url "$DATABASE_URL"
```

Read the dry-run SQL before the real run ([CLI reference][at-cli]). Atlas
records each applied version in the `atlas_schema_revisions` table, so
the next apply starts after the last recorded one.

## Step 7 - Hash and integrity

`atlas.sum` holds a hash per migration file. Editing a file changes the
hash and `migrate validate` / `migrate apply` fail until
`atlas migrate hash` is run, which must be a deliberate act: never edit
a migration that has already been applied anywhere; add a new one.

## Step 8 - CI integration

```yaml
- uses: ariga/setup-atlas@v0
- name: Validate and lint (gate)
  run: |
    atlas migrate validate --dir "file://migrations" \
      --dev-url "docker://postgres/17/dev?search_path=public"
    atlas migrate lint --dir "file://migrations" \
      --dev-url "docker://postgres/17/dev?search_path=public" \
      --git-base origin/main
- name: Apply migrations to staging
  if: github.ref == 'refs/heads/main'
  run: atlas migrate apply --url "${{ secrets.STAGING_DB_URL }}"
```

`--git-base` lints every migration the branch adds compared with the
base branch, instead of a fixed `--latest N` ([lint docs][at-lint]).
`ariga/setup-atlas` puts the CLI on the runner ([at-gha][at-gha]).

[at-lint]: https://atlasgo.io/versioned/lint
[at-an]: https://atlasgo.io/lint/analyzers
[at-cli]: https://atlasgo.io/cli-reference

## Step 9 - Composition with sister tools

Atlas lint knows SQL patterns, not your data volumes or release
order. Run the `migration-blast-radius-reviewer` agent on the PR for
team policies such as "no `DROP TABLE` without DBA approval", and use
`migration-operation-taxonomy` to classify each operation's lock and
rollback risk.

## Worked example

Add a `NOT NULL` column `status` to a 40M-row `users` table:

1. Edit `schema.sql` to add
   `status varchar(20) NOT NULL DEFAULT 'active'` on `users`.
2. `atlas migrate diff add_status --to file://schema.sql --dev-url
   "docker://postgres/17/dev?search_path=public"` writes
   `migrations/20260506120000_add_status.sql`.
3. Step 5 gate: `atlas migrate validate` and `atlas migrate lint
   --latest 1` with the `data_depend` analyzer set to error. Without the
   `DEFAULT`, MF103 (adding a non-nullable column) fails the lint; with
   it, the gate passes.
4. CI runs the same gate on the PR; after merge,
   `atlas migrate apply --dry-run` then `atlas migrate apply` against
   staging records the version in `atlas_schema_revisions`.
5. A teammate later edits that applied file; their
   `atlas migrate apply` fails on hash mismatch until an intentional
   `atlas migrate hash` re-sync - the tamper guard working as
   designed.

## Anti-patterns and limitations

The failure modes (editing applied migrations, skipping `--dev-url`,
declarative `schema apply` straight to production, skipping lint in
CI, blind `atlas migrate hash`) and the tool's limitations (partial
HCL for some DBMS features, general-purpose lint rules, `--dev-url`
requiring a real DBMS, paid Atlas Cloud) are catalogued in
[references/atlas-caveats.md](references/atlas-caveats.md).

## References

- [at-start][at-start] - getting-started, install commands,
  example schema, all `atlas` commands, supported databases
- [at-gha][at-gha] - `ariga/setup-atlas` GitHub Action
- [at-lint][at-lint] - `migrate lint` flags (`--latest`, `--git-base`), Atlas Pro requirement from v0.38
- [at-an][at-an] - analyzers, check codes, which fail by default, `error = true`
- [at-cli][at-cli] - `migrate apply --dry-run`, `migrate validate`
- atlasgo.io/docs - full documentation
- github.com/ariga/atlas - repository
- `flyway-migrations`, `liquibase-migrations` - sister tools
  (imperative versioned migrations); `migration-operation-taxonomy`
  and `migration-blast-radius-reviewer` for risk review
