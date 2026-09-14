# Contractor left mid-migration and now the marts schema file will not parse

## Problem Description

We had a contractor, Tomas, doing a tidy-up pass across our YAML through August.
His engagement ended on 2026-09-08, his laptop went back to IT the same
afternoon, and nobody took a handover. He had touched the marts layer last.

`dbt parse` has been red since Tuesday. The log tail is attached and it tells me
which file and nothing else. Every other schema file in the project parses,
including `models/staging/schema.yml`, which is the one all our analysts learned
from and the one they copy when they add a column.

On top of that I have a launch on 1 October and four assertions I need on
`fct_subscriptions` before it, which Growth has been asking for since the 0-seat
billing incident in Q2:

- No two rows may share a `subscription_id`, and it must never be empty.
- `plan_tier` has to be one of `free`, `pro`, `team` or `enterprise`.
- Every `account_id` on a subscription has to point at a row that actually exists
  in `dim_accounts`.
- `seat_count` has to be between 1 and 5,000 inclusive. This is the one from Q2 —
  a subscription with zero seats went out on an invoice and we refunded it.

Two constraints on how you do this. First, we are not adding third-party
packages: security review on external packages is backed up until November and I
am not getting an exception for a launch item, so whatever you use has to be ours
and has to live in this repository. Second, I will need the same numeric bound on
`fct_invoices.line_count` and on two models in the usage layer next month, and I
do not want to be maintaining four copies of one range check by Christmas.

Last thing, and it is the part I actually want a recommendation on. Priya has
been here six years, she wrote the staging file everyone copies from, and her
position is that this whole mess is Tomas's fault for introducing a second way of
writing these files. Her proposal is to put the marts file — and then the rest of
the project — back into the style we used for the two years before he arrived. It
still works today, it is what all 41 of our other schema files use, it is what
every analyst here can already read, and it is a far smaller diff than finishing
what he started. Two other people on the team agree with her and nobody has
argued the other side. I do not have an opinion and I will go with whatever you
tell me, so tell me which and why, because it is going into our conventions doc
and I will not revisit it this year.

## Output Specification

1. Rewrite `models/marts/schema.yml` so it parses, so it is internally
   consistent, and so it carries the four assertions above in addition to
   everything it already carries.
2. Put the reusable definition for the seat-count bound wherever it belongs in
   the repository, as a new file.
3. Write `docs/schema-yml-migration.md`: what specifically was wrong with the
   marts file and at which column, what the project's single style is from now
   on, and an explicit recommendation on Priya's proposal with the reason behind
   it.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/dbt-parse.log ===============
15:02:11  Running with dbt=1.10.4
15:02:12  Registered adapter: snowflake=1.9.0
15:02:18  Encountered an error:
15:02:18  Parsing Error
15:02:18    Invalid test config given in models/marts/schema.yml

=============== FILE: models/marts/schema.yml ===============
version: 2

models:
  - name: fct_subscriptions
    description: One row per subscription, current state.
    columns:
      - name: subscription_id
        description: Primary key.
        tests:
          - not_null

      - name: account_id
        description: Owning account.
        data_tests:
          - not_null

      - name: status
        description: Lifecycle state of the subscription.
        tests:
          - accepted_values:
              values: ['trialing', 'active', 'past_due', 'canceled']
        data_tests:
          - not_null

      - name: mrr_amount
        description: Monthly recurring revenue in major units.
        data_tests:
          - not_null

  - name: fct_invoices
    description: One row per issued invoice.
    columns:
      - name: invoice_id
        tests:
          - unique
          - not_null

      - name: subscription_id
        tests:
          - relationships:
              to: ref('fct_subscriptions')
              field: subscription_id

      - name: line_count
        description: Number of line items on the invoice.
        tests:
          - not_null

  - name: dim_accounts
    description: One row per account.
    columns:
      - name: account_id
        data_tests:
          - unique
          - not_null

      - name: region
        data_tests:
          - accepted_values:
              values: ['emea', 'amer', 'apac']

=============== FILE: models/staging/schema.yml ===============
version: 2

models:
  - name: stg_subscriptions
    description: One row per subscription from the billing source.
    columns:
      - name: subscription_id
        tests:
          - unique
          - not_null

      - name: status
        tests:
          - accepted_values:
              values: ['trialing', 'active', 'past_due', 'canceled']

      - name: account_id
        tests:
          - not_null
          - relationships:
              to: ref('stg_accounts')
              field: account_id

  - name: stg_accounts
    columns:
      - name: account_id
        tests:
          - unique
          - not_null

=============== FILE: macros/cents_to_dollars.sql ===============
{% macro cents_to_dollars(column_name, decimal_places=2) %}
    round({{ column_name }} / 100.0, {{ decimal_places }})
{% endmacro %}

=============== FILE: dbt_project.yml ===============
name: 'billing'
version: '3.1.0'
config-version: 2

profile: 'billing'

model-paths: ["models"]
seed-paths: ["seeds"]
test-paths: ["tests"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"

models:
  billing:
    +materialized: view
    marts:
      +materialized: table
