# delivery-eta on-call, relevant extract

- One nightly job from Airflow: `monitoring.nightly_drift` at 02:45 UTC.
  Notifications go to #eta-oncall.
- Pages in eighteen months: 2025-11-04 (courier app broke `distance_km`),
  2026-02-19 (warehouse cutover), 2026-04-30 (bad deploy, rolled back).
- The job compares last night against `eta_v6_normal`, the snapshot cut when
  eta-v6 was promoted in week 14. The jobs read it; they do not write it.
- `monitoring/out/` is retained for 90 days. Anyone can open last night's HTML;
  nobody does unless something pages.
- Retrains are manual and require a written promotion note. The last promotion
  note is eta-v6, week 14 2026.
