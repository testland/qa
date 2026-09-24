# Importance-rating changelog

Baseline is `value-tiers-q3.json`, set by the owning teams on 2026-07-01. Every
later edit to `value-tiers-current.json` is logged here by whoever made it.

| Changed    | Test                                          | From | To | By    | Reason given |
|------------|-----------------------------------------------|-----:|---:|-------|--------------|
| 2026-07-09 | `settings.spec.ts > timezone-change`           |   2  | 1  | marek | Picker moved to the profile service; the storefront page is read-only now. |
| 2026-08-21 | `pricing.spec.ts > tax-line-rendering`         |   3  | 5  | marek | Per-country VAT display becomes a legal requirement on 2026-10-01. |
| 2026-09-04 | `checkout.spec.ts > three-d-secure-challenge`  |   5  | 2  | marek | 2.7 min at 11% flake. Nothing that expensive can hold a 5 while we are ten minutes over. |
| 2026-09-04 | `account.spec.ts > data-export-request`        |   4  | 1  | marek | Second-slowest spec in the account file. Re-rating it is the cleanest way to release that runtime. |
| 2026-09-04 | `auth.spec.ts > sso-redirect`                  |   5  | 2  | marek | 2.4 min in the blocking job is more than a 5 buys us this quarter. |
