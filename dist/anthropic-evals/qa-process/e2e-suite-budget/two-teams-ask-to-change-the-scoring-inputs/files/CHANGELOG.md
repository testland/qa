# Release notes - last six months

## 2026-08-12
- Admin console bulk import: column mapping and a dry-run preview added at
  `/admin/import`.

## 2026-08-05
- Test fixtures: every spec moved onto the shared checkout fixture helper. One
  PR per spec file, 24 PRs merged between 2026-08-03 and 2026-08-07.

## 2026-07-01
- Refunds: for accounts in the EU a refund returns to the original payment
  method. The store-credit option was removed from that path.

## 2026-06-18
- Reports: the 50k-row export moved to a background worker. The synchronous
  path is gone; the export now polls for completion.

## 2026-05-14
- Seasonal promo banner removed. `/promo/seasonal` returns 404 and the
  component was deleted.

## 2026-04-22
- Dashboard: toast notifications restyled. No behaviour change.
