# PR 4471 — quiet the 03:40 payments pager

Merged 2026-06-11. Author @ingest-oncall. Approved @dpetrov.

The payments staging assertions have been waking the ingest rotation every night
since the Stripe migration started. This is a config-only change in
`models/staging/schema.yml` — no SQL is touched, no assertion is deleted, and
every one of them still runs every night and still shows up in the artifact.

@dpetrov: approved. Revisit after the October cutover. The assertions are all
still there, which was the thing I cared about.
