# delivery-eta on-call, relevant extract

- Two nightly jobs, both from Airflow: `monitoring.nightly_drift` at 02:15 UTC
  and `monitoring.quality_check` at 02:45 UTC. Notifications from either go to
  #eta-oncall.
- Pages in eighteen months, all from the input job: 2025-11-04 (courier app
  broke `distance_km`), 2026-02-19 (warehouse cutover), 2026-04-30 (bad deploy,
  rolled back). The accuracy job has never notified.
- `monitoring/out/` is retained for 90 days. Anyone can open last night's HTML;
  nobody does unless something pages.
- `monitoring/baselines/` is not in version control and is not backed up.
- Retrains are manual and require a written promotion note. The last promotion
  note is eta-v6, week 14 2026.
