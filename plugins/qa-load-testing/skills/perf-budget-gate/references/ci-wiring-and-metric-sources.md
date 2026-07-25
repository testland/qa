# Perf budget gate - runner sources, metric budgets, and CI wiring

Deep reference for `perf-budget-gate` SKILL.md. Consult when wiring the gate
into CI, mapping each runner's output artifact, or setting per-metric budgets.

## Runner sources and artifacts

Each runner writes a machine-readable artifact the gate flattens into the
unified metric record. Persist each as a CI build artifact (`if: always()`) so
the gate input is reproducible and triageable.

| Source | Artifact | Produce with | Yields |
|---|---|---|---|
| k6 | `summary.json` | `k6 run --summary-export summary.json` | Per-metric values + threshold pass/fail. |
| JMeter | `results.jtl` + `report/statistics.json` | `jmeter -n -t plan.jmx -l results.jtl -e -o report` | Per-sampler percentiles + counts. |
| Gatling | `js/stats.json` under `target/gatling/<sim>-<ts>/` | Gatling run (writes the HTML report bundle) | Per-request percentiles + assertion outcomes. |
| Locust | `<prefix>_stats.csv` | `locust --csv <prefix> --headless` | Per-endpoint percentiles. |
| Lighthouse CI | `.lighthouseci/lhr-*.json` | `lhci autorun` / `lhci collect` | Per-URL audit results including Web Vitals. |

## Per-metric budgets

Back-end latency budgets come from the team's NFRs; the Core Web Vitals "good"
thresholds are the canonical front-end defaults ([web-vitals][wv]).

[wv]: https://web.dev/articles/vitals

| Metric | Budget | Severity (typical) |
|---|---|---|
| `p95_latency_ms` | team NFR (e.g. 500) | blocker |
| `error_rate` | 0.01 | blocker |
| `lcp_ms` (Largest Contentful Paint) | 2500 | blocker |
| `inp_ms` (Interaction to Next Paint) | 200 | blocker |
| `cls` (Cumulative Layout Shift) | 0.1 | blocker |
| Lighthouse category score | advisory | warn |

Assert on individual Web Vitals, not the aggregate Lighthouse performance
score - the score conflates LCP / INP / CLS, so one bad vital tanks it
uninterpretably.

## CI wiring

Run each runner, upload its artifact, then run the gate as the final step. The
gate writes its markdown summary to `$GITHUB_STEP_SUMMARY` and exits non-zero
on a no-go verdict, which fails the job ([gha-summary][ghas]).

[ghas]: https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary

```yaml
# .github/workflows/perf-gate.yml
- name: k6
  run: k6 run --summary-export k6-summary.json load.js
- name: Lighthouse CI
  run: npx lhci autorun
- name: Upload perf artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: perf-artifacts
    path: |
      k6-summary.json
      .lighthouseci/
- name: Perf budget gate
  run: python scripts/run_perf_gate.py >> "$GITHUB_STEP_SUMMARY"
```

Store the last green main-branch record set as a baseline artifact uploaded on
every main-branch run, so per-PR deltas compare against a real baseline rather
than the previous PR.
