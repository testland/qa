---
component: data-quality-engineer
type: agent
archetype: A2
---

# data-quality-engineer — evals

Companion eval cases for [`data-quality-engineer`](../../data-quality-engineer.md).
Three cases cover happy path (dbt engine detection + suite generation),
branch (different engine — Soda dataset), and adversarial (no engine
fingerprint present in the workspace — refuse to fabricate). Re-run by
feeding the **Input** block as the first user message and checking the
agent's transcript against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date —
each case is designed to be reproducible against any tier.

## Eval 1 — happy path — dbt orders model

**Input:**

```
Build an initial data-quality suite for our `orders` dbt model.

Workspace fingerprint:
  dbt_project.yml         present at repo root
  models/orders.sql       present
  models/orders.yml       present but empty (no columns block)

CREATE TABLE DDL (the warehouse-side definition):

  CREATE TABLE orders (
    order_id      BIGINT      NOT NULL,
    customer_id   BIGINT      NOT NULL,
    status        VARCHAR(16) NOT NULL,
    discount_pct  NUMERIC(5,2),
    updated_at    TIMESTAMP   NOT NULL
  );
  -- PK: order_id
  -- FK: customer_id -> customers.id

Sample (500 rows) — summary:
  order_id      500 distinct, 0 nulls
  customer_id   312 distinct, 0 nulls
  status        4 distinct values {placed, shipped, completed, returned}
  discount_pct  range 0-95, 12 nulls
  updated_at    most-recent < 1h ago

Generate the suite and run it once against the sample.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 detects engine = `dbt` (via `dbt_project.yml`).
Step 2 reads the DDL + empty `schema.yml`. Step 3 summarises the sample.
Step 4 proposes coverage: `order_id` unique + not_null (PK), `customer_id`
relationships → `customers.id` (FK), `status` accepted_values
{placed, shipped, completed, returned}, `discount_pct` range 0-100,
`updated_at` freshness < 1d. Step 5 emits a `models/orders.yml`
`data_tests:` block (dbt syntax — NOT GX Python, NOT SodaCL). Step 6 runs
`dbt build --select orders` and reports pass/fail. The 12 nulls in
`discount_pct` are surfaced as "confirm nullability" in next steps, not
silently dropped.

**Pass condition:** Output contains the literal strings `dbt` AND
`data_tests:` AND `accepted_values` AND at least one of
`relationships` / `customers.id`. Output does NOT contain `gxe` (GX
Python namespace) AND does NOT contain `checks for orders:` (SodaCL
block header). The Next steps section mentions confirming nullability
on `discount_pct` (substring `discount_pct` AND substring `null`).

## Eval 2 — branch — Soda dataset (engine switch)

**Input:**

```
Build an initial data-quality suite for our `customer_signups` Soda dataset.

Workspace fingerprint:
  configuration.yml         present at repo root (Soda Core config)
  checks.yml                present but empty (no checks defined yet)
  dbt_project.yml           NOT present
  gx/ directory             NOT present

CREATE TABLE DDL:

  CREATE TABLE customer_signups (
    signup_id    BIGINT       NOT NULL,
    email        VARCHAR(254) NOT NULL,
    country_code CHAR(2)      NOT NULL,
    plan         VARCHAR(16)  NOT NULL,
    created_at   TIMESTAMP    NOT NULL
  );
  -- PK: signup_id
  -- UNIQUE: email

Sample (800 rows) — summary:
  signup_id     800 distinct, 0 nulls
  email         800 distinct, 0 nulls
  country_code  47 distinct values (ISO 3166-1 alpha-2)
  plan          3 distinct values {free, pro, enterprise}
  created_at    most-recent < 6h ago

Generate the suite and run it once against the sample.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 detects engine = `soda` (via `configuration.yml` +
`checks.yml`, no `dbt_project.yml`, no `gx/`). Step 5 emits a SodaCL
`checks for customer_signups:` block — NOT a dbt `data_tests:` block,
NOT a GX Python suite. Coverage includes: `signup_id` unique + missing
count = 0, `email` unique + missing count = 0, `plan` valid values
{free, pro, enterprise}, `created_at` freshness check. Step 6 runs
`soda scan` (NOT `dbt build`, NOT a GX checkpoint).

**Pass condition:** Output contains the literal string
`checks for customer_signups:` (SodaCL block header) AND
`soda scan` (the run command). Output does NOT contain `data_tests:`
(dbt syntax) AND does NOT contain `gxe` (GX namespace) AND does NOT
contain `dbt build` (dbt run command). The `plan` enum check enumerates
`free`, `pro`, AND `enterprise`.

## Eval 3 — adversarial — no engine fingerprint (refuse)

**Input:**

```
Build an initial data-quality suite for our `events` table.

Workspace fingerprint:
  dbt_project.yml      NOT present
  gx/ directory        NOT present
  configuration.yml    NOT present
  checks.yml           NOT present

(No data-quality engine has been installed in this repo yet.)

CREATE TABLE DDL: not available — the team hasn't documented the schema.

Sample: not provided.

Generate whichever engine's suite you think is best.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 1 cannot detect an engine (no `dbt_project.yml`, no
`gx/`, no `configuration.yml`). The agent refuses to pick an engine on
the user's behalf or fabricate a schema. Step 2 also fails (no DDL, no
sample). Output does NOT contain a generated `data_tests:` block, a
`checks for events:` block, or a `gxe` Python suite. The agent
explicitly asks the user to (a) install / declare one of the supported
engines (dbt / great-expectations / soda) and (b) supply the schema
(DDL or `information_schema.columns`) before re-running.

**Pass condition:** Output does NOT contain any of `data_tests:`,
`checks for events:`, `gxe.` (with the trailing dot — GX namespace
usage). Output contains at least one of `engine` / `dbt_project.yml` /
`configuration.yml` / `gx/` AND at least one of `schema` / `DDL` /
`CREATE TABLE` — i.e., the agent names what's missing rather than
guessing.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no external
  fixtures, no warehouse connection required. The agent reads the
  workspace-fingerprint section to drive Step 1 engine detection.
- Pass conditions are literal-string checks against the agent's
  transcript; a reviewer can grep for each substring.
- The agent's tool surface (`Read`, `Write`, `Edit`,
  `Bash(dbt *)`, `Bash(soda scan *)`, `Bash(jq *)`, `Grep`, `Glob`) is
  bounded — eval re-runs cannot escape to other engines or modify
  production schemas. The dbt / soda Bash invocations are scoped to
  their respective CLIs.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
