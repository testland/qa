# Production incidents, 2026 to date

## INC-2181 - VAT rounding, Norway - 2026-07-09
Norwegian orders rounded the tax line to the wrong minor unit on any basket
whose pre-tax total landed exactly on a half. Live for six days; found by a
customer, not by us. Root cause was the per-country rounding mode table in
`src/pricing/vat.js`. The check written afterwards was
`pricing.spec.ts > vat-rounding-by-country`, which walks the storefront once
per country in the table. The table has been edited twice since: 2026-07-28
(Denmark) and 2026-08-19 (Poland).

## INC-2174 - saved-card tokens returned to the wrong session - 2026-06-02
Reported to us by the payments provider. Fixed the same day. No test was
written; the feature was behind a flag and is what PR #1207 is now shipping.

## INC-2160 - report export timed out above 30k rows - 2026-05-11
Fixed by moving the export onto a background worker on 2026-06-18. The worker
path has had an integration test in the API repo since that release.
