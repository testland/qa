---
name: locust-load-testing
description: Authors Locust load tests as Python classes — HttpUser with @task-decorated methods plus on_start hooks and between() wait_time — runs via `locust -f locustfile.py` headless mode (or distributed via `--master` / `--worker`), and exports CSV / JUnit reports for CI gating. Use when the project's primary stack is Python and the team wants load tests in the same language as the application.
rating: 25
d6: 4
archetype: S1
---

# locust-load-testing

## Overview

Locust is a Python-native load testing tool. Tests are
**Python classes** that inherit from `HttpUser`; each `@task`-
decorated method is an action a virtual user can take
([locust-quickstart][quickstart]).

[quickstart]: https://docs.locust.io/en/stable/quickstart.html

The integration shape: write `locustfile.py`, run `locust`, observe
the live dashboard or run headless for CI.

## When to use

- The project's primary stack is Python — load tests live in the
  same language as the application.
- The team wants programmatic test logic that's hard to express in
  declarative DSLs (e.g. branching based on response content,
  custom auth flows, Redis / queue interactions).
- Distributed load is a requirement — Locust's master / worker
  pattern is straightforward.

If the team isn't on Python and just needs HTTP perf testing,
[`k6-load-testing`](../k6-load-testing/SKILL.md) is lower-friction.
For JVM, prefer [`gatling-load-testing`](../gatling-load-testing/SKILL.md).

## Install

```bash
pip install locust
```

(Per [locust-quickstart][quickstart], current stable is the 2.x
series.)

For a per-project install (preferred for CI determinism):

```bash
pip install -r requirements-load.txt   # contains 'locust>=2.43'
```

## Authoring

### Minimal locustfile

```python
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)   # 1-3 seconds between tasks per user

    def on_start(self):
        # Runs once per virtual user when they start
        self.client.post("/login", json={"user": "test", "pass": "secret"})

    @task
    def index_page(self):
        self.client.get("/")

    @task(3)   # weighted — runs 3x as often as unweighted tasks
    def view_item(self):
        self.client.get("/items/42")
```

(Adapted from [locust-quickstart][quickstart].)

| Construct           | Purpose                                                         |
|---------------------|-----------------------------------------------------------------|
| `HttpUser`          | Base class; provides `self.client` (a Requests-style HTTP client). |
| `@task`             | Marks a method as a callable VU action.                          |
| `@task(N)`          | Weighted task — gets `N` "lottery tickets" vs. unweighted's 1.  |
| `wait_time = between(min, max)` | Random pause between tasks per VU.                  |
| `on_start(self)`    | Runs once per VU at startup (auth, session setup).               |
| `on_stop(self)`     | Runs once per VU before exit (cleanup).                          |
| `self.client.<verb>(...)` | Standard Requests-like methods that auto-track latency / errors. |

### Naming requests for clean stats

The default request name is the URL path; for parameterized URLs use
the `name=` kwarg to keep the stats grouped:

```python
@task
def view_item(self):
    item_id = random.randint(1, 1000)
    # Without name=, every URL like /items/42, /items/43 is its own row
    # With name=, all roll up under "/items/[id]"
    self.client.get(f"/items/{item_id}", name="/items/[id]")
```

Without `name=`, the stats table fragments into thousands of
near-duplicate rows.

## Running

### Interactive (Web UI)

```bash
locust -f locustfile.py
```

Open http://localhost:8089; configure VU count + spawn rate + host
in the browser; observe the live charts. The default mode for
authoring / tuning.

### Headless (CI)

Per [locust-quickstart][quickstart]:

```bash
locust --headless --users 10 --spawn-rate 1 -H http://your-server.com
```

| Flag                | Purpose                                                       |
|---------------------|---------------------------------------------------------------|
| `--headless`        | Run without the web UI (CI mode).                              |
| `--users <N>`       | Peak concurrent users.                                          |
| `--spawn-rate <N>`  | Users spawned per second until peak is reached.                |
| `--host <url>`      | Target host (override `host` attribute on the user class).     |
| `--run-time <dur>`  | Total run duration (e.g. `5m`, `30s`); auto-stops at expiry.   |
| `--csv <prefix>`    | Write `<prefix>_stats.csv`, `<prefix>_stats_history.csv`,      |
|                     | `<prefix>_failures.csv`, `<prefix>_exceptions.csv`.             |
| `--html <file>`     | Write a final HTML report.                                      |

A typical CI invocation:

```bash
locust -f locustfile.py \
  --headless \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --host https://staging.example.com \
  --csv results \
  --html report.html \
  --exit-code-on-error 1
```

`--exit-code-on-error 1` tells Locust to exit non-zero if any
request failed during the run — the canonical CI gate.

### Distributed mode

Per [locust-quickstart][quickstart]:

```bash
# On the master node
locust -f locustfile.py --master --headless --users 1000 --spawn-rate 50 --host https://staging.example.com

# On each worker node
locust -f locustfile.py --worker --master-host master.internal
```

The master coordinates; workers generate the actual load. Use this
when a single machine can't generate enough VUs (typically beyond
~1000 VUs depending on the target's response time and the worker's
CPU).

## Reports

Locust outputs three CSVs on `--csv <prefix>`:

| File                          | Content                                                 |
|-------------------------------|---------------------------------------------------------|
| `<prefix>_stats.csv`          | Aggregate per-request stats: count, avg, p50, p90, p95, p99. |
| `<prefix>_stats_history.csv`  | Per-second time-series of the same metrics.            |
| `<prefix>_failures.csv`       | Per-failure rows: name, reason, count.                  |
| `<prefix>_exceptions.csv`     | Python exception stacks (if any task raised).           |

The HTML report (`--html`) renders charts from the same data — for
human review.

## CI integration

```yaml
# .github/workflows/locust.yml
name: load-test

on:
  pull_request:
    paths: ['tests/load/**']
  schedule:
    - cron: '0 4 * * *'

jobs:
  locust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - run: pip install locust

      - name: Run Locust headless
        env:
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: |
          locust -f tests/load/locustfile.py \
            --headless \
            --users 50 \
            --spawn-rate 5 \
            --run-time 3m \
            --host https://staging.example.com \
            --csv results \
            --html report.html \
            --exit-code-on-error 1

      - name: Custom threshold gate
        run: |
          # Fail if p95 > 500ms on any endpoint
          python - <<'PY'
          import csv, sys
          with open('results_stats.csv') as f:
              for row in csv.DictReader(f):
                  if row['Name'] == 'Aggregated':
                      continue
                  p95 = float(row['95%'])
                  if p95 > 500:
                      print(f"::error::p95 {p95}ms on {row['Name']} (>500 budget)")
                      sys.exit(1)
          PY

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: locust-reports
          path: |
            results_stats.csv
            results_stats_history.csv
            results_failures.csv
            report.html
          retention-days: 14
```

The custom Python gate parses `results_stats.csv` — Locust's
`--exit-code-on-error` only fails on errors; latency budgets need
the post-run check.

## Anti-patterns

| Anti-pattern                                                    | Why it fails                                                       | Fix |
|-----------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Hardcoded URLs in the locustfile                                  | Tests bind to one environment.                                     | Read `host` from `os.environ` or pass via `-H`. |
| Missing `name=` on parameterized URLs                              | Stats fragment into 1000s of rows; reports unreadable.             | Always specify `name=` for variable URL segments. |
| Low `wait_time` to "stress more"                                  | Hammering at full rate doesn't model real users; client CPU saturates. | Use `between(1, 3)` or longer; if the goal is a target RPS, use `--users` × `wait_time` to compute. |
| Running interactive (Web UI) in CI                                 | Locust waits for the user to click "Start swarming"; CI hangs.     | Always `--headless` with `--users` / `--spawn-rate` / `--run-time`. |
| Skipping `--exit-code-on-error`                                   | Locust exits 0 even with failures; CI sees green.                  | Always include the flag. |
| Single-master 1000+ VUs from one machine                          | CPU saturates the load generator before the target.                | Distribute via `--master` / `--worker`. |

## Limitations

- **Per-process VU limits.** ~500-2000 VUs per worker depending on
  task complexity; beyond that, distribute.
- **Synchronous-by-default.** `self.client` is sync. For
  high-concurrency-per-VU patterns, use `FastHttpUser` (async) —
  faster per request but slightly different semantics.
- **No native browser execution.** Locust is HTTP-only; for Web Vitals
  perf testing use [`lighthouse-perf`](../lighthouse-perf/SKILL.md).
- **Python-only authoring.** Same constraint applies as for
  [`tavern-testing`](../../qa-api-testing/skills/tavern-testing/SKILL.md):
  Python team or bust.

## References

- [locust-quickstart][quickstart] — canonical install, locustfile
  structure, headless flags, distributed mode.
- [`k6-load-testing`](../k6-load-testing/SKILL.md),
  [`jmeter-load-testing`](../jmeter-load-testing/SKILL.md),
  [`gatling-load-testing`](../gatling-load-testing/SKILL.md) —
  alternatives by stack.
- [`perf-budget-gate`](../perf-budget-gate/SKILL.md) — downstream
  gate that consumes Locust's CSV output for unified verdicts.
