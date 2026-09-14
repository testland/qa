# Incident postmortems - 2026 to date

## INC-2101 - 2026-04-02 - duplicate charge on stored cards
Severity 1. A token reuse bug double-charged 11 accounts in staging.
Caught before release: the e2e job went red on the release branch and the
failing test was `checkout.spec.ts > saved-card-purchase`.

## INC-2118 - 2026-04-19 - 3DS challenge iframe blocked for one issuer
Severity 1. A CSP change broke the challenge iframe for one card issuer.
Caught by `checkout.spec.ts > three-d-secure-challenge` on the release branch.

## INC-2126 - 2026-04-27 - data export produced an empty archive
Severity 2. A storage client upgrade silently returned zero objects.
Caught on main by `account.spec.ts > data-export-request` the morning after the
upgrade merged. Legal has asked that this path stay covered end to end.

## INC-2140 - 2026-05-08 - SSO redirect loop after an IdP metadata change
Severity 1. Two enterprise accounts affected in staging only.
The nightly run caught it - `auth.spec.ts > sso-redirect` failed 14 times in a
row, which is what prompted the investigation.

## INC-2152 - 2026-05-21 - stored card token not refreshed on expiry
Severity 2. Renewals failed for cards issued before 2024.
Caught in CI by `checkout.spec.ts > saved-card-purchase`.

## INC-2163 - 2026-06-04 - discount stacking allowed two percentage codes
Severity 2. Caught by `checkout.spec.ts > apply-discount-code`.

## INC-2170 - 2026-06-18 - audit log recorded no actor for role changes
Severity 2. Caught by `admin.spec.ts > user-role-change`.

## INC-2181 - 2026-07-02 - price rounding wrong for NOK
Severity 2. Reached production, customer-reported after four days. No
automated test covered per-currency rounding at any layer.

## INC-2195 - 2026-07-19 - search facet counts stale after a reindex
Severity 2. Reached production. No test covered facet counts.

## INC-2204 - 2026-08-05 - notification digest delivered twice
Severity 3. Reached production. No test covered digest scheduling.

## INC-2212 - 2026-08-23 - timezone change dropped the DST offset
Severity 2. Reached production. No test covered DST boundaries.
