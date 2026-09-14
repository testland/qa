# Dispatch CI - change log, August to September

Maintained by @platform. Most recent first.

- 2026-09-10  Artifact retention on all Dispatch jobs cut from 90 to 30 days.
- 2026-09-09  Runner pool rotated; two nodes drained mid-job during the
              rotation window. (T-4502)
- 2026-09-04  Node bumped 20.11 -> 20.17 on the runner image.
- 2026-09-01  Pilot job moved onto the new 8-vCPU runner image. `--workers=4`
              added to the pilot job's command line so the extra cores get
              used; it had been running single-worker until then. Job wall
              time dropped from ~3m40s to ~1m05s. (T-4471)
- 2026-08-26  Outbound proxy certificate rotated.
- 2026-08-20  Pilot job created. (T-4390)
