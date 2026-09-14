# What CI runs today, per area

| Area    | Job                     | Median wall-clock | Owner    |
|---------|-------------------------|-------------------|----------|
| web     | e2e, 4 shards           | 8 min             | web      |
| web     | unit (node --test)      | 40 s              | web      |
| android | instrumentation, 2 devices | 14 min         | android  |
| billing | api integration         | 6 min             | billing  |
| perf    | nightly load            | 9 min             | platform |

The Android instrumentation job runs on emulators in CI and on two physical
devices in the pre-release gate. It has not been quarantined or skipped in the
last 90 days.
