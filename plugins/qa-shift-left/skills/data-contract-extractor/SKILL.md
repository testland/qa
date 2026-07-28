---
name: data-contract-extractor
description: "Reads a data-product spec (data PRD, dataset README, lineage doc) and emits a structured data contract - schema (columns + types + nullability + PII flags), freshness SLA, volume bounds, distribution invariants, and ownership. The contract is consumable by data-quality tools such as dbt tests, Great Expectations, or Soda checks as their assertion baseline. Use when scoping a new data product or formalizing assertions on an existing one."
---

# data-contract-extractor

## Overview

This skill formalizes the prose of a data PRD into a **data contract** -
the producer/consumer agreement on schema, freshness, volume, semantic
invariants, and ownership - that the QA test suite can mechanically
assert against, typically via `dbt-tests`, `great-expectations`, or
`soda-checks` (see the `qa-data-quality` plugin). "Data contract" is
practitioner-emergent terminology (Andrew Jones / Chad Sanderson), not
ISTQB-canonical; this skill cites industry-engineering sources.

## When to use

- A new data product (dbt model, table, file feed) is being scoped
  and the team wants assertions before shipping.
- An existing data product has implicit assumptions consumers rely
  on; the team is documenting them ahead of a refactor.
- A PRD or design doc references a dataset and the team needs the
  schema / SLA pulled out into structured form.
- A data-quality engineer needs the contract as input to suite generation.

## What goes in a data contract

The five required sections, in order of authoring priority:

### 1. Schema

For each column:

| Field         | Required | Notes |
|---------------|----------|-------|
| Name          | yes      | snake_case; matches the warehouse table.            |
| Type          | yes      | Warehouse-native type (`VARCHAR`, `BIGINT`, `TIMESTAMP`, etc.). |
| Nullable      | yes      | `true` / `false` - the test suite's `not_null` decision. |
| PK            | yes      | `true` for primary-key column(s).                    |
| Unique        | yes      | `true` for candidate keys (separate from PK).        |
| FK            | optional | If foreign key, the `<table>.<column>` reference.    |
| PII           | required | Tag values: `none`, `direct` (email/name), `indirect` (zip, dob alone), `sensitive` (SSN, payment). |
| Constraint    | optional | Range / enum / regex (per the qa-data-quality plugin's `data-quality-conventions` skill). |
| Description   | yes      | One-sentence semantic meaning; not just the type.    |

### 2. Freshness SLA

| Field             | Notes |
|-------------------|-------|
| Update cadence    | `daily / hourly / continuous / weekly`.                        |
| Max staleness     | The point past which downstream consumers should treat the data as broken (per `data-quality-conventions` in the qa-data-quality plugin: typically 2× cadence). |
| Source-of-truth column | The timestamp column the freshness check reads (e.g. `updated_at`, `loaded_at`, `event_time`). |

### 3. Volume bounds

| Field             | Notes |
|-------------------|-------|
| Expected min/max  | Row-count range under normal operation.                        |
| Volatility        | `stable / monotonic-growth / cyclical / event-driven`.         |
| Recovery action   | If volume falls outside bounds, what does the consumer do?     |

### 4. Distribution invariants

For each business-meaningful column, what must hold:

| Field                        | Example                                            |
|------------------------------|----------------------------------------------------|
| Categorical: accepted values | `status ∈ {placed, shipped, completed, returned}`. |
| Numeric: range                | `discount_pct ∈ [0, 100]`.                         |
| Frequency / rate              | `cancellation_rate ≤ 5%` (rolling 7-day window).   |

### 5. Ownership and governance

| Field        | Notes |
|--------------|-------|
| Producer team| Who runs the pipeline.                              |
| Owner handle | Routing handle (Slack / email) for breaks.          |
| Consumers    | Known downstream models / dashboards / services.    |
| Versioning   | How breaking changes are communicated.              |

## Output format

Emit as YAML for direct consumption by dbt / GX / Soda:

```yaml
# data-contracts/<dataset-slug>.yml
contract_version: 1
dataset:
  name: orders
  description: One row per customer order; updated within 1h of placement.

schema:
  - name: order_id
    type: BIGINT
    nullable: false
    pk: true
    unique: true
    pii: none
    description: Surrogate key.
  - name: customer_id
    type: BIGINT
    nullable: false
    fk: customers.customer_id
    pii: indirect
    description: Customer who placed the order.
  - name: email
    type: VARCHAR
    nullable: false
    pii: direct
    constraint: { format: email }
    description: Customer email at time of order (immutable snapshot).
  - name: status
    type: VARCHAR
    nullable: false
    constraint:
      accepted_values: [placed, shipped, completed, returned]
    description: Current fulfillment status.
  - name: discount_pct
    type: DECIMAL(5,2)
    nullable: true
    constraint: { range: [0, 100] }
    description: Promotion discount applied; null = no promo.
  - name: updated_at
    type: TIMESTAMP
    nullable: false
    description: Last-modified timestamp; freshness source-of-truth.

freshness:
  cadence: hourly
  max_staleness: 2h
  source_column: updated_at

volume:
  min_per_day: 100
  max_per_day: 1000000
  volatility: cyclical
  recovery_action: |
    Investigate ingestion pipeline at <runbook-url> if volume falls outside bounds for >2 cycles.

distribution:
  - column: status
    rule: accepted_values
    values: [placed, shipped, completed, returned]
  - column: discount_pct
    rule: range
    range: [0, 100]
  - column: cancellation_rate
    rule: rolling_window
    window: 7d
    max: 0.05

ownership:
  producer_team: data-platform
  owner: '@data-platform-oncall'
  consumers:
    - dbt: marts/orders_summary
    - dashboard: 'Order Health'
    - service: shipping-microservice
  versioning: |
    Breaking changes coordinated via #data-contracts Slack 14d in advance.
```

## Step-by-step extraction

When reading a data PRD:

1. **Schema** - look for table-spec sections, ER diagrams, or
   per-column descriptions. If only column names are given, flag
   missing types as gaps; do not guess.
2. **PII tagging** - every column gets a `pii:` tag, even `pii: none`.
   Force the data-product author to confirm; PII handling drives
   downstream architecture.
3. **Freshness** - look for "updated daily" / "real-time" / "<X
   minutes." If absent, flag as a gap.
4. **Volume** - look for traffic projections or current scale. If
   absent, flag as a gap to be filled before the contract is
   actionable.
5. **Distribution** - look for business rules in prose form ("status
   is one of...", "discount up to 100%") and translate.
6. **Ownership** - look for the responsible team / Slack channel.

## Gap flagging

The agent never fabricates contract fields. Every gap becomes an
explicit question:

```markdown
## Contract gaps (HUMAN INPUT REQUIRED)

| Section       | Field                  | Question                                                                 |
|---------------|------------------------|--------------------------------------------------------------------------|
| schema        | `customer_phone.pii`   | Direct PII (yes - phone numbers are PII per most jurisdictions). Confirm. |
| freshness     | `cadence`              | PRD says "fresh data" - daily? hourly? real-time? Each implies a different gate. |
| volume        | `max_per_day`          | Not specified; required to set a `row_count between` assertion.          |
| distribution  | `payment_method`       | What's the accepted-value set? PRD lists four; are there more (e.g. "apple_pay" added recently)? |
```

Until the gaps are filled, the contract is incomplete and the test
suite cannot be generated.

## Examples

Three worked examples (PRD to contract, minimal source with a gap list,
and refactor of an existing dataset) are in
[references/examples.md](references/examples.md).

## Anti-patterns

| Anti-pattern                                      | Why it fails                                                  | Fix |
|---------------------------------------------------|---------------------------------------------------------------|-----|
| Auto-tagging every column `pii: none`              | Misses real PII; downstream ungoverned.                       | Force the author to make the call; default to "needs review" rather than "none". |
| Generic freshness "real-time"                      | Ambiguous; "real-time" varies from <100ms to <1min by team.   | Quantify: `cadence: continuous, max_staleness: 60s`. |
| Distribution rules without a window                | "Cancellation rate ≤5%" - over what window? Lifetime?         | Always specify a window: `rolling_window: 7d`. |
| Skipping Ownership                                  | A contract without an owner is a wishlist; nobody's on the hook. | Require ownership before declaring the contract complete. |

## References

- ISTQB Glossary V4.7.1 - testability + non-functional testing
  (cited in `non-functional-requirement-extractor`) - for the
  underlying observability heuristic.
- ISO/IEC 25012:2008 - data-quality model (cite by stable ID;
  paywalled at iso.org).
- The `qa-data-quality` plugin - 
  the downstream consumer of this skill's output. A data-quality engineer
  reads contracts produced by this skill.
- `data-quality-conventions` (in the qa-data-quality plugin) - naming and threshold conventions referenced from the contract.
