# Drill report field extraction and degradation signals

Reference tables for `chaos-results-reporter`. Step 1 uses the field-extraction
map to parse each drill report into a normalized row; Step 4 uses the
degradation-signals catalog to flag findings across runs.

## Field extraction map

For each completed drill report, extract these fields from the listed source
locations. If any required field is missing from a report, flag that report as
`INCOMPLETE` in the aggregate table and skip it from trend calculations - do not
guess or interpolate missing values.

| Field | Source location in drill report |
|---|---|
| `experiment_id` | Header: `Chaos drill report - <id>` |
| `date` | `Start:` timestamp, truncated to date |
| `experiment_type` | `Experiment:` field |
| `hypothesis` | Steady-state hypothesis from experiment YAML |
| `verdict` | `Verdict:` field: `PASSED`, `ABORTED`, `FAILED` |
| `blast_radius_observed` | `Peak error rate`, `Peak affected replicas`, `Peak latency p99` |
| `blast_radius_bound` | `Blast-radius bound:` field |
| `time_to_detect` | Time from injection start to first abort criterion breach (or "n/a" if not aborted) |
| `time_to_recover` | `Recovery time:` field |
| `abort_reason` | `Abort reason:` field (empty if verdict is `PASSED`) |

## Degradation signals catalog

Scan all experiments for these signals. Emit each match as a named finding;
each HIGH or MEDIUM finding becomes an action item in Step 5.

| Signal | Condition | Severity |
|---|---|---|
| Repeated blast-radius breach | Same experiment type aborted for the same abort reason in 2+ consecutive runs | HIGH |
| No TTR improvement after fix | ABORTED run was followed by a code change (per git log or team note), but TTR did not improve in the next run | HIGH |
| Widening blast radius | Blast-radius trend is `WIDENING` for any experiment type | MEDIUM |
| Declining held rate | Held rate dropped more than 20 percentage points between first and second half of run history | MEDIUM |
| Single data point | Any experiment type has only one run | LOW (informational) |
