# Late mobile events never reach fct_events

## Problem Description

Late mobile events never show up in `fct_events` (`notes.md`). Write a dbt unit test that fails on the current model, fix the model, and sort out where our unit tests run. dbt isn't installed here.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: dbt_project.yml ===============
name: product_analytics
version: '1.0'
config-version: 2
profile: analytics
require-dbt-version: [">=1.10.5", "<2.0.0"]

=============== FILE: models/staging/stg_events.sql ===============
select event_id, user_id, event_type, event_time, ingested_at
from {{ source('app', 'events') }}

=============== FILE: models/marts/fct_events.sql ===============
{{ config(materialized='incremental', unique_key='event_id') }}

select event_id, user_id, event_type, event_time, ingested_at
from {{ ref('stg_events') }}
{% if is_incremental() %}
where event_time > (select max(event_time) from {{ this }})
{% endif %}

=============== FILE: models/marts/unit_tests.yml ===============
unit_tests:
  - name: fct_events_copies_events
    model: fct_events
    given:
      - input: ref('stg_events')
        rows:
          - {event_id: 1, user_id: 7, event_type: open, event_time: 2026-11-01 10:00:00, ingested_at: 2026-11-01 10:00:05}
    expect:
      rows:
        - {event_id: 1, user_id: 7, event_type: open, event_time: 2026-11-01 10:00:00, ingested_at: 2026-11-01 10:00:05}

=============== FILE: .github/workflows/prod.yml ===============
name: prod
on:
  schedule:
    - cron: '15 * * * *'
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: pip install dbt-snowflake==1.10.*
      - run: dbt build --target prod

=============== FILE: .github/workflows/ci.yml ===============
name: ci
on: pull_request
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: pip install dbt-snowflake==1.10.*
      - run: dbt build --target ci --select state:modified+ --state prod-artifacts

=============== FILE: notes.md ===============
Mobile apps queue events while offline and upload them later: up to 3 days late.
`event_time` is when it happened on the device, `ingested_at` is when it reached us.
Daily active users in `fct_events` are about 6% below the raw table for every day.
The hourly prod job runs unit tests with every build; finance asked why.
