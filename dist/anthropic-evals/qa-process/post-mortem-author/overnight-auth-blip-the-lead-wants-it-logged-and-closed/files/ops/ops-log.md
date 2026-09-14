# Ops log - platform team

One line per operational event. Closed means no further work is expected.

| Date       | Event                                                  | Duration | Status  | Notes |
|------------|--------------------------------------------------------|----------|---------|-------|
| 2026-07-30 | auth-service pods restarted, users logged out          | 2m       | closed  | recovered on its own, nothing changed |
| 2026-08-05 | image registry slow, deploys queued                    | 41m      | closed  | vendor incident, nothing to do our end |
| 2026-08-19 | auth-service pods restarted during the morning spike   | 3m       | closed  | bumped replicas 2 -> 3, seemed to help |
| 2026-08-27 | search index rebuild ran long, stale results           | 1h 10m   | closed  | expected, index doubled in size |
| 2026-09-08 | auth-service pods restarted, users logged out          | 4m       | OPEN    | needs closing |
| 2026-09-09 | staging node pool upgrade overran                      | 6h 20m   | OPEN    | needs closing |
