# 4,312 orphaned orders only produced a warning in CI

## Problem Description

Find out why the incident in `docs/incident.md` did not block CI, then fix the dbt test config and the CI check (`models/marts/orders.yml`, `ci/`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: models/marts/orders.yml ===============
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
          - relationships:
              to: ref('customers')
              field: customer_id
              config:
                severity: warn
                error_if: ">100"     # a few late-arriving customers are fine, >100 orphans must break the build
      - name: amount
        data_tests:
          - dbt_utils.accepted_range:
              min_value: 0
              config:
                severity: warn

=============== FILE: ci/dbt.sh ===============
#!/usr/bin/env bash
dbt deps
dbt build --target ci
python ci/check_results.py

=============== FILE: ci/check_results.py ===============
import json, sys

results = json.load(open("target/run_results.json"))["results"]
broken = [r["unique_id"] for r in results if r["status"] == "error"]
if broken:
    print("dbt errors:", broken)
    sys.exit(1)
print("dbt OK")

=============== FILE: docs/incident.md ===============
# 2026-11-12 orphaned orders

The customer sync broke and 4,312 orders had no matching customer. `dbt build` in CI was green
and `ci/check_results.py` printed "dbt OK", so the release went out.

What we want: a handful of orphans stays a warning, more than 100 blocks the release. Whoever
investigates should be able to see the offending rows without rewriting the test SQL.
