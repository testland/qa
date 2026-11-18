# dbt build stayed green through a NULL status and a stale source

## Problem Description

`dbt build` stayed green through both problems in `incident.md`. Find why each one got past the tests, then fix the tests, the model and the CI job so they would be caught next time. dbt isn't installed here.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: dbt_project.yml ===============
name: shop
version: '1.0'
config-version: 2
profile: shop
require-dbt-version: [">=1.10.5", "<2.0.0"]

=============== FILE: models/staging/sources.yml ===============
version: 2
sources:
  - name: shop_raw
    schema: raw
    tables:
      - name: orders
      - name: customers

=============== FILE: models/staging/stg_orders.sql ===============
select
    id as order_id,
    customer_id,
    case status_code
        when 'P' then 'placed'
        when 'S' then 'shipped'
        when 'R' then 'returned'
    end as status,
    amount_cents / 100.0 as amount,
    _loaded_at
from {{ source('shop_raw', 'orders') }}

=============== FILE: models/staging/stg_customers.sql ===============
select id as customer_id, email, created_at
from {{ source('shop_raw', 'customers') }}

=============== FILE: models/staging/schema.yml ===============
version: 2
models:
  - name: stg_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: status
        data_tests:
          - accepted_values:
              arguments:
                values: ['placed', 'shipped', 'returned']
      - name: customer_id
        data_tests:
          - relationships:
              arguments:
                to: ref('stg_customers')
                field: customer_id
  - name: stg_customers
    columns:
      - name: customer_id
        data_tests: [unique, not_null]

=============== FILE: .github/workflows/dbt-nightly.yml ===============
name: dbt-nightly
on:
  schedule:
    - cron: '0 3 * * *'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with:
          python-version: '3.12'
      - run: pip install dbt-postgres==1.10.*
      - run: dbt deps
      - run: dbt build --target prod
        env:
          DBT_PASSWORD: ${{ secrets.DBT_PASSWORD }}

=============== FILE: incident.md ===============
# Two problems, dbt build green every night

1. On 3 November the loader for `raw.orders` stopped (expired credentials). No new
   orders reached the warehouse for 4 days. Every nightly `dbt build` passed.
2. When loading resumed, orders carried a new status code `C` (cancelled). 12% of
   orders now show an empty status on the revenue dashboard. Separately, guest
   checkout writes `customer_id` as NULL (about 3% of orders), and finance needs
   every order attributed either to a customer or explicitly to "guest".

`raw.orders._loaded_at` is the load timestamp the loader writes on every row.
