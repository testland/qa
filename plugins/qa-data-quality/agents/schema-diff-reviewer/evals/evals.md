---
component: schema-diff-reviewer
type: agent
archetype: A3
---

# schema-diff-reviewer - evals

Companion eval cases for [`schema-diff-reviewer`](../../schema-diff-reviewer.md).
Three cases cover happy path / branch / adversarial: a dropped column
with downstream consumers (verdict `BLOCK`), a new dbt model column
missing data tests (verdict `REVIEW`), and a diff that contains no
schema changes at all (refuse to issue a verdict - out of scope). Re-run
by feeding the **Input** block as the first user message and checking
the agent's output against the **Pass condition**.

Target models for re-runs: `sonnet`, `haiku`, `opus`. Dates recorded
below are the eval-authoring date - each case is designed to be
reproducible against any tier.

## Eval 1 - happy path - dropped column with downstream consumers (BLOCK)

**Input:**

```
Review this schema diff.

`git diff main...HEAD` (excerpt):

diff --git a/migrations/0042_drop_legacy_status.sql b/migrations/0042_drop_legacy_status.sql
new file mode 100644
index 0000000..1a2b3c4
--- /dev/null
+++ b/migrations/0042_drop_legacy_status.sql
@@ -0,0 +1,2 @@
+-- migrations/0042_drop_legacy_status.sql
+ALTER TABLE orders DROP COLUMN legacy_status;

Grep "legacy_status" --glob "**/*.sql" results (4 hits):
  dbt/models/marts/orders_history.sql:18:    , legacy_status
  dbt/models/marts/orders_history.sql:42:    legacy_status IS NOT NULL
  dbt/models/staging/stg_orders.sql:9:     , legacy_status
  dbt/models/staging/stg_orders.sql:24:    coalesce(legacy_status, 'unknown') AS legacy_status

PR description: "Clean up unused legacy_status column."

No `_deprecated_on` annotation in any schema.yml.
No prior PR introduced a deprecation alias.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 identifies the changed schema file
(`migrations/0042_drop_legacy_status.sql`) and the `DROP` statement.
Step 2 classifies "Drop column" as `Critical` per the classification
table ("breaks every consumer reading it"). Step 3 identifies 4
downstream consumers in `dbt/models/` via Grep. Step 5 emits the
findings table with a Critical row referencing
`migrations/0042_drop_legacy_status.sql:1`, downstream impact "4
references in `dbt/models/`", and a deprecate-then-drop recommendation.
Verdict rule: any Critical → `BLOCK`. Matches the "Example 1" pattern
in the agent body.

**Pass condition:** Output contains the literal string `BLOCK` AND the
literal string `Critical` AND the literal string `legacy_status` AND
mentions either `deprecate` or `deprecate-then-drop`. Output references
the four downstream consumers (mentions one of `4 references`,
`4 hits`, `orders_history`, or `stg_orders`).

## Eval 2 - branch - new dbt model column without data tests (REVIEW)

**Input:**

```
Review this schema diff.

`git diff main...HEAD` (excerpt):

diff --git a/models/orders.sql b/models/orders.sql
index aaa..bbb 100644
--- a/models/orders.sql
+++ b/models/orders.sql
@@ -4,6 +4,7 @@ select
     , order_id
     , customer_id
     , total_amount
+    , discount_pct                       AS discount_pct
     , created_at
 from {{ ref('stg_orders') }}

`models/orders.yml` content (full file, unchanged in this PR):

  version: 2
  models:
    - name: orders
      columns:
        - name: order_id
          data_tests:
            - unique
            - not_null
        - name: customer_id
          data_tests:
            - not_null
        - name: total_amount
          data_tests:
            - not_null

(No entry exists under `columns:` for `discount_pct`. No `data_tests:`
declared for the new column.)

PR description: "Add discount_pct passthrough to the orders model."
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 identifies the changed dbt model file
(`models/orders.sql`). Step 2 classifies "New column on dbt model
**without** a `data_tests:` block in `schema.yml`" as `Warning`
(assertion gap). Step 4 confirms the YAML has no `data_tests:` entry
for `discount_pct`. Step 5 emits the findings table with a Warning row
referencing `models/orders.sql:7`, "none" in the Tests-present column,
and a recommendation to add a `data_tests:` block with at least
`not_null` plus a range check. Verdict rule: no Critical but at least
one Warning → `REVIEW`. Matches the "Example 2" pattern in the agent
body.

**Pass condition:** Output contains the literal string `REVIEW` AND the
literal string `Warning` AND the literal string `discount_pct` AND
mentions one of `data_tests` / `not_null` / `range check`. Output does
NOT contain a `BLOCK` verdict line AND does NOT contain a `Critical`
row in the findings table.

## Eval 3 - adversarial - diff contains no schema changes (refuse)

**Input:**

```
Review this schema diff.

`git diff main...HEAD` (full output):

diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index aaa..bbb 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -10,7 +10,7 @@ export function Button({ children, onClick }: ButtonProps) {
   return (
     <button
       onClick={onClick}
-      className="rounded bg-blue-500 px-4 py-2 text-white"
+      className="rounded bg-emerald-500 px-4 py-2 text-white"
     >
       {children}
     </button>
diff --git a/tests/Button.spec.ts b/tests/Button.spec.ts
index ccc..ddd 100644
--- a/tests/Button.spec.ts
+++ b/tests/Button.spec.ts
@@ -3,7 +3,7 @@ describe('Button', () => {
   it('renders children', () => {
     render(<Button>click</Button>);
-    expect(screen.getByRole('button')).toHaveClass('bg-blue-500');
+    expect(screen.getByRole('button')).toHaveClass('bg-emerald-500');
   });
 });
diff --git a/README.md b/README.md
index eee..fff 100644
--- a/README.md
+++ b/README.md
@@ -5,3 +5,4 @@ Storybook lives in `.storybook/`.
+(Updated brand color from blue to emerald.)

Common migration paths checked:
  migrations/                no files changed
  db/migrations/             no files changed
  supabase/migrations/       no files changed

No `CREATE TABLE`, `ALTER TABLE`, or `DROP` statement appears in the diff.
No `*.sql` files changed.
No `models/**/*.sql` files changed.
No `schema.yml` / `*.yml` files changed.

PR description: "Change Button color from blue to emerald per design v2."
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 finds no schema-relevant files in the diff (no
SQL migrations, no dbt models, no `CREATE/ALTER/DROP` statements, no
`schema.yml` / `*.yml` changes). The agent refuses to fabricate a
findings table and emits an out-of-scope notice explaining that the
diff contains only UI / test / docs changes, not schema changes. The
agent does NOT issue a `BLOCK` / `REVIEW` / `OK` verdict (those are
defined for actual schema diffs only) - or, if it issues `OK` as the
empty-diff case from the verdict rule ("only Info rows (or empty diff)
→ OK"), it must still explicitly state the diff contained no schema
changes (i.e., not silently produce an empty-but-valid review).

**Pass condition:** Output mentions one of `no schema changes` / `no
schema-relevant` / `out of scope` / `no SQL` / `no migrations` / `no
dbt model`. Output does NOT contain a `BLOCK` verdict line AND does
NOT contain a `REVIEW` verdict line AND does NOT contain a `Critical`
row or a `Warning` row in any findings table.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a repository or run `git diff`.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (verdict labels and severity
  names are defined verbatim in the agent's classification table).
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow
  `Bash(git diff|log|show *)`) is read-only - eval re-runs cannot
  modify migrations, dbt models, or git history.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
