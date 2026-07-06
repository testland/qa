---
name: flake-dashboard-author
description: "Builds a persistent flakiness infrastructure dashboard from JUnit XML or JSON CI run history: defines the flake-rate metric (failures per test over a configurable window), authors the data model, generates a Grafana time-series panel JSON or configures a Datadog CI Visibility view, derives the quarantine-candidate query, and wires trend alerts. Use when a team needs a long-lived observability surface for test reliability that outlasts any single weekly report."
keywords:
  - flakiness
  - dashboard
  - grafana
  - datadog
  - ci-visibility
  - junit
  - test-observability
---

# flake-dashboard-author

> **Terminology note:** "flaky test" is a practitioner-emergent term used
> in the industry engineering tradition (Google Testing Blog,
> [google-flaky][gtb-flaky]). "Defect," "failure," and "test run" follow
> ISTQB Glossary v4.7.1 definitions. "Test suite" and "test case" are used
> per ISTQB as well.

[gtb-flaky]: https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html

The `e2e-test-trend-reporter` agent produces a comparable weekly markdown
snapshot. This skill builds the persistent infrastructure layer: a live
dashboard that accumulates run history and surfaces the flake-rate metric
continuously, rather than on demand.

## Step 1 - Define the flake-rate metric

The canonical flake-rate formula for a single test `T` over a window of `N`
runs is:

```
flake_rate(T, window) = (failed_runs(T, window) + retried_passed_runs(T, window))
                        -------------------------------------------------------
                                      total_runs(T, window)
```

A run counts as "retried-passed" when the test framework reports it as
`flaky` (passed only after at least one retry). Playwright marks these in
`reporter.onTestEnd` with `result.status === 'flaky'`
([Playwright reporter API][pw-reporter]). JUnit XML uses a `<rerunFailure>`
element inside `<testcase>` (Surefire / junit-xml convention) or a
`<flakyFailure>` element in the Jenkins JUnit plugin extension.

Choose your window at ingestion time. Recommended defaults:

| Team cadence | Window | Minimum runs before showing rate |
|---|---|---|
| Multiple deploys per day | 7 days | 20 |
| One deploy per day | 14 days | 10 |
| Weekly releases | 30 days | 5 |

[pw-reporter]: https://playwright.dev/docs/api/class-reporter#reporter-on-test-end

## Step 2 - Build the data model

Persist one row per test-case execution. Minimum schema:

```sql
CREATE TABLE test_runs (
  run_id        TEXT        NOT NULL,
  suite_name    TEXT        NOT NULL,
  test_name     TEXT        NOT NULL,
  status        TEXT        NOT NULL,  -- 'passed' | 'failed' | 'flaky' | 'skipped'
  duration_ms   INTEGER     NOT NULL,
  branch        TEXT,
  commit_sha    TEXT,
  worker_index  INTEGER,
  started_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (run_id, suite_name, test_name)
);

CREATE INDEX idx_test_runs_name_time ON test_runs (test_name, started_at);
```

`status = 'flaky'` is the retried-passed value emitted by Playwright retries
([Playwright retries][pw-retries]) and by the Jenkins JUnit plugin's
`<flakyFailure>` extension. For raw JUnit XML without retry markup, derive
`flaky` by joining two rows with the same `run_id + test_name` where one is
`failed` and the next is `passed` within the same CI run.

Populate from JUnit XML using `xmllint --xpath`:

```bash
# Extract per-testcase rows from a JUnit XML report
xmllint --xpath '//testcase' report.xml \
  | python3 scripts/parse_junit.py --output jsonl >> test_runs.jsonl
```

Populate from Playwright JSON reporter output (`--reporter=json`) by
iterating `results[].suites[].specs[].tests[].results[]`.

[pw-retries]: https://playwright.dev/docs/test-retries

## Step 3 - Author the Grafana panel JSON

The following panel JSON renders a time-series of per-test flake rate over
a 14-day rolling window. Paste it into **Dashboard JSON model** (toolbar
Export > Copy JSON) or POST it to the Grafana Dashboard HTTP API
([Grafana Dashboard API][grafana-dash-api]).

```json
{
  "type": "timeseries",
  "title": "Flake rate per test (14-day rolling)",
  "datasource": { "type": "postgres", "uid": "${DS_POSTGRES}" },
  "gridPos": { "h": 8, "w": 24, "x": 0, "y": 0 },
  "id": 1,
  "targets": [
    {
      "refId": "A",
      "datasource": { "type": "postgres", "uid": "${DS_POSTGRES}" },
      "rawSql": "SELECT date_trunc('day', started_at) AS time, test_name, ROUND(100.0 * SUM(CASE WHEN status IN ('failed','flaky') THEN 1 ELSE 0 END) / COUNT(*), 2) AS flake_rate FROM test_runs WHERE started_at >= NOW() - INTERVAL '14 days' GROUP BY 1, 2 ORDER BY 1",
      "format": "time_series"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "color": { "mode": "palette-classic" },
      "unit": "percent",
      "thresholds": {
        "mode": "absolute",
        "steps": [
          { "color": "green", "value": null },
          { "color": "yellow", "value": 2 },
          { "color": "red", "value": 5 }
        ]
      },
      "custom": {
        "lineWidth": 2,
        "fillOpacity": 10,
        "pointSize": 5,
        "showPoints": "auto",
        "spanNulls": false
      }
    },
    "overrides": []
  },
  "options": {
    "legend": { "displayMode": "table", "placement": "bottom", "calcs": ["lastNotNull", "max"] },
    "tooltip": { "mode": "multi", "sort": "desc" }
  }
}
```

Key fields per the [Grafana time-series panel docs][grafana-ts]:

- `fieldConfig.defaults.thresholds.steps` - color bands at 2% (yellow) and
  5% (red) correspond to the quarantine-candidate thresholds in Step 5.
- `fieldConfig.defaults.unit` set to `"percent"` so Grafana formats values
  as `2.4%` rather than raw decimals.
- `options.legend.calcs` includes `"max"` so the legend table shows the
  peak flake rate for each test over the window at a glance.
- `datasource.uid` uses the `${DS_POSTGRES}` dashboard variable so the JSON
  is portable across Grafana instances. Replace with your actual datasource
  UID when importing into a specific instance.

[grafana-ts]: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/time-series/
[grafana-dash-api]: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/

## Step 4 - Configure Datadog CI Visibility (alternative)

If your team uses Datadog, CI Visibility ingests test results natively via
the `datadog-ci` CLI or SDK reporters. The built-in
[CI Visibility - Tests dashboard][dd-ci-dash] tracks `Total Flaky Tests`
(updated every 30 minutes per [Datadog flaky test docs][dd-flaky]).

Datadog applies three tags automatically ([Datadog flaky test docs][dd-flaky]):

- `is_flaky` - test is currently passing and failing across runs on the same
  commit.
- `is_new_flaky` - flaky behavior first appeared on this branch.
- `is_known_flaky` - flaky on the current or default branch previously.

**Quarantine query in CI Visibility Explorer:**

```
@test.status:fail @test.is_flaky:true
```

**Flakiness rate formula in a Datadog Timeboard widget** using the Metrics
query editor (CI Visibility emits `ci.test.flaky` as a count metric):

```
(count:ci.test.flaky{*} by {test.name}.as_count() /
 count:ci.test.run{*} by {test.name}.as_count()) * 100
```

**Trend alert** using a Datadog Monitor:

1. Monitor type: Metric Monitor.
2. Query: the formula above, scoped to `test.name`.
3. Alert threshold: `> 5` (5% flake rate) for quarantine candidates.
4. Warning threshold: `> 2` (2%) for early watch.
5. Evaluation window: last 14 days, minimum 10 samples.

[dd-ci-dash]: https://app.datadoghq.com/dash/integration/ci_app_tests
[dd-flaky]: https://docs.datadoghq.com/tests/flaky_tests/

## Step 5 - Quarantine-candidate query

A test becomes a quarantine candidate when its flake rate exceeds the team
threshold over the window AND it has enough samples to be statistically
meaningful. Recommended SQL query for the data model in Step 2:

```sql
SELECT
  test_name,
  suite_name,
  COUNT(*)                                                        AS total_runs,
  SUM(CASE WHEN status IN ('failed', 'flaky') THEN 1 ELSE 0 END) AS flaky_runs,
  ROUND(
    100.0 * SUM(CASE WHEN status IN ('failed', 'flaky') THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0), 2
  )                                                               AS flake_rate_pct,
  MAX(started_at)                                                 AS last_seen
FROM test_runs
WHERE started_at >= NOW() - INTERVAL '14 days'
GROUP BY test_name, suite_name
HAVING
  COUNT(*) >= 10
  AND ROUND(
    100.0 * SUM(CASE WHEN status IN ('failed', 'flaky') THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0), 2
  ) >= 5
ORDER BY flake_rate_pct DESC;
```

The `HAVING COUNT(*) >= 10` guard prevents a test with 1 run and 1 failure
from appearing as 100% flaky. Adjust the minimum run count per your window
size using the table in Step 1.

Hand quarantine candidates to the
[`flaky-test-quarantine`](../flaky-test-quarantine/SKILL.md) skill, which
enforces the two-week TTL and renewal cap.

## Step 6 - Wire trend alerting in Grafana

Grafana managed alert rules evaluate expressions against your datasource on
a configurable schedule ([Grafana alert rules][grafana-alerts]).

Steps to create a flake-rate spike alert:

1. Navigate to **Alerts & IRM** > **Alert rules** > **+ New alert rule**.
2. Add query `A`: the same SQL from the Grafana panel in Step 3.
3. Add a **Reduce** expression `B`: set Function to `Last`, Input to `A`.
4. Add a **Threshold** expression `C`: set Input to `B`, threshold to
   `IS ABOVE 5` (5% flake rate).
5. Set the **Pending period** to `15m` so transient spikes don't fire pages.
6. In **Configure labels and notifications**, link the rule to the panel
   created in Step 3 via **Link alert rule to panel** so timeline annotations
   appear directly on the chart.
7. Set a **Recovery threshold** of `2` so the alert resolves only when the
   flake rate drops back below the warning level.

The `fieldConfig.defaults.thresholds.steps` bands in the panel JSON
(green/yellow/red at null/2/5) visually mirror the alert thresholds so
on-call engineers see the same boundary lines in the chart that trigger the
alert ([Grafana time-series thresholds][grafana-ts]).

[grafana-alerts]: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/

## Worked example: bootstrap from a Playwright JSON report

Given `pw-results.json` (Playwright `--reporter=json` output):

```bash
# 1. Parse into the test_runs table
node scripts/ingest_playwright_json.js pw-results.json \
  --db postgres://localhost/qa_metrics \
  --branch "$CI_BRANCH" \
  --commit "$CI_COMMIT_SHA" \
  --run-id "$CI_RUN_ID"

# 2. Run the quarantine-candidate query and emit a CSV
psql postgres://localhost/qa_metrics \
  -f scripts/quarantine_candidates.sql \
  --csv > candidates-$(date +%F).csv

# 3. Import the Grafana dashboard JSON
curl -s -X POST http://grafana:3000/api/dashboards/import \
  -H 'Content-Type: application/json' \
  -u "$GRAFANA_USER:$GRAFANA_PASS" \
  -d @dashboards/flakiness-overview.json
```

After the first ingestion, the Grafana panel populates immediately for the
last 14 days of history that was just loaded. The trend alert begins
evaluating on the next 1-minute evaluation cycle.

## Limitations

- **Minimum history requirement:** the 14-day rolling window needs at least
  10 runs per test to produce a meaningful flake rate. New tests show no data
  until they accumulate runs.
- **JUnit XML retry markup is non-standard:** `<flakyFailure>` is a Jenkins
  JUnit plugin extension, not part of the base JUnit XML schema. Surefire and
  pytest-junit do not emit it. Treat `status = 'flaky'` as an enrichment step
  rather than a baseline guarantee.
- **Datadog `ci.test.flaky` metric availability:** the `ci.test.flaky` count
  metric requires the Datadog Agent test reporter or `datadog-ci junit upload`
  with the `--service` flag. Raw JUnit uploads via HTTP do not emit the metric
  automatically. Verify metric existence in Metrics Explorer before building
  the Timeboard widget.
- **Grafana datasource portability:** the `${DS_POSTGRES}` variable requires
  a matching datasource name (or UID override) in every Grafana instance
  where the JSON is imported.

## References

- [Playwright retries][pw-retries] - `flaky` status definition; source of the
  retried-passed run classification used in the flake-rate formula.
- [Playwright reporter API][pw-reporter] - `result.status` values including
  `'flaky'`; used for JSON ingestion in Step 2.
- [Grafana time-series panel][grafana-ts] - `fieldConfig.defaults.thresholds`
  structure and `unit` options; basis for the panel JSON in Step 3.
- [Grafana Dashboard HTTP API][grafana-dash-api] - import endpoint used in
  the worked example.
- [Grafana alert rules][grafana-alerts] - Reduce + Threshold expression
  pattern; pending period and recovery threshold; panel-linking annotation
  behavior used in Step 6.
- [Datadog flaky test docs][dd-flaky] - `is_flaky`, `is_new_flaky`,
  `is_known_flaky` tag definitions; 30-minute metric refresh cadence.
- [Datadog CI Visibility - Tests dashboard][dd-ci-dash] - built-in
  `Total Flaky Tests` widget; baseline for the Timeboard formula in Step 4.
- [Google Testing Blog - flaky tests][gtb-flaky] - industry-engineering
  source for the "flaky test" term used throughout this skill.
- [`flaky-test-quarantine`](../flaky-test-quarantine/SKILL.md) - downstream
  consumer of the quarantine-candidate query in Step 5.
- [`e2e-test-trend-reporter`](../../agents/e2e-test-trend-reporter.md) - the
  weekly narrative complement to this persistent dashboard.
- [`flake-pattern-reference`](../flake-pattern-reference/SKILL.md) - pattern
  catalog used to interpret spikes surfaced by this dashboard.
