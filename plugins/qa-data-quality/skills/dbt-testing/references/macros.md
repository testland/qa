# dbt custom test macros

Patterns for `{% test %}` blocks beyond the four built-in generics. Each
test is a Jinja macro that takes a model (and optional column arguments)
and returns a `select` of **failing rows** - empty result set means pass
(per the canonical [data-tests][1] doc).

[1]: https://docs.getdbt.com/docs/build/data-tests

All examples use the canonical `data_tests:` YAML key with `arguments:`
for parameterized generics ([data-tests][1]).

## Range check

Asserts a numeric column stays within `[min_value, max_value]`. Inclusive
bounds.

```jinja
{% test column_value_in_range(model, column_name, min_value, max_value) %}
select *
from {{ model }}
where {{ column_name }} < {{ min_value }}
   or {{ column_name }} > {{ max_value }}
{% endtest %}
```

Usage:

```yaml
- name: discount_percent
  data_tests:
    - column_value_in_range:
        arguments:
          min_value: 0
          max_value: 100
```

## Conditional uniqueness

Built-in `unique` enforces uniqueness across the entire column. When you
need uniqueness only within a subset (e.g. unique `email` per active
account), parameterize the predicate.

```jinja
{% test conditional_unique(model, column_name, where_clause) %}
select {{ column_name }}, count(*) as n
from {{ model }}
where {{ where_clause }}
group by {{ column_name }}
having count(*) > 1
{% endtest %}
```

Usage:

```yaml
- name: email
  data_tests:
    - conditional_unique:
        arguments:
          where_clause: "status = 'active'"
```

## Recency / freshness

For sources, dbt has a built-in `freshness` block (different mechanism).
For models, a custom test pattern is to assert the most recent row is
within a target window.

```jinja
{% test row_recency(model, column_name, max_age_hours) %}
{# fails if max(column_name) is older than max_age_hours #}
select max({{ column_name }}) as latest
from {{ model }}
having max({{ column_name }}) < dateadd(hour, -{{ max_age_hours }}, current_timestamp)
{% endtest %}
```

`dateadd` syntax varies by warehouse adapter - adjust per Snowflake /
BigQuery / Postgres / Redshift dialect. Test the raw SQL in your warehouse
console first.

## External referential integrity

The built-in `relationships` test asserts a foreign key against another
dbt model via `ref()`. For an external warehouse table not modeled by
dbt, use a parameterized macro:

```jinja
{% test external_relationship(model, column_name, to_relation, to_column) %}
select {{ column_name }} as orphan
from {{ model }}
where {{ column_name }} is not null
  and {{ column_name }} not in (select {{ to_column }} from {{ to_relation }})
{% endtest %}
```

Usage:

```yaml
- name: external_account_id
  data_tests:
    - external_relationship:
        arguments:
          to_relation: 'analytics.dim_account_external'
          to_column: 'account_id'
```

## Severity and warning thresholds

Any data test (built-in or custom) accepts a `config:` block that lets you
treat the test as a warning instead of a hard failure, or set a fail/warn
threshold based on the row count returned:

```yaml
- name: order_id
  data_tests:
    - unique:
        config:
          severity: warn          # warn instead of error
          warn_if: ">10"          # warn if more than 10 dupes
          error_if: ">100"        # hard fail if more than 100 dupes
```

This is the canonical mechanism to prevent a single test from blocking
downstream models in `dbt build` - relaxing severity to `warn` lets the
DAG keep flowing while still surfacing the assertion in `run_results.json`
([dbt-build][2]).

[2]: https://docs.getdbt.com/reference/commands/build

## Storing failures

Add `--store-failures` to `dbt test` (or `dbt build`) to persist the
failing rows to a warehouse table for triage, instead of only emitting
counts. Once enabled, each failing test materializes a small audit table
under the configured `dbt_test__audit` schema.

```bash
dbt test --select state:modified+ --store-failures
```

Use this when the failure count alone is not enough to debug - the audit
table contains the actual rows the test SELECT returned.
