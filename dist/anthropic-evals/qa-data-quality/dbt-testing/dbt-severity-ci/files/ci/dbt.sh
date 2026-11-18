#!/usr/bin/env bash
dbt deps
dbt build --target ci
python ci/check_results.py
