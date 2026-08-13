# Heuristic walk - worked example

Deep reference for the `test-case-from-live-feature` SKILL.md, Step 2. The four heuristic models from [heuristics.md](heuristics.md) applied to the checkout observation log from Step 1, turning observations into candidate test-case rows. The spine keeps the four-substep method; this file shows the walk in full.

## 2a - SFDPOT coverage walk

Per HTSM ([James Bach](https://www.satisfice.com/download/heuristic-test-strategy-model)), enumerate cases per Product Element:

| Guideword | From the observation log |
|---|---|
| **S - Structure** | cart service, payment service, coupon service, idempotency layer (observed via network calls). |
| **F - Function** | add to cart, edit qty, apply coupon, choose shipping, choose payment, place order, see confirmation. |
| **D - Data** | SKU, qty, price, coupon code, address, payment method, order id, idempotency key. |
| **P - Platform** | desktop Chrome / Safari / Firefox; mobile iOS / Android web; observed responsive layout via DevTools. |
| **O - Operations** | feature flag `new_checkout_v2` (verbal, unverified); rollback path unknown. |
| **T - Time** | cart expiry (unknown - to probe), coupon expiry (422 on expired observed), payment timeout (unknown). |

Each non-empty cell becomes one or more test-case rows.

## 2b - Whittaker attack overlay

For each function, enumerate the attacks from the [Whittaker catalog](https://en.wikipedia.org/wiki/Exploratory_testing) (in [heuristics.md](heuristics.md)):

- **Input attack on coupon**: empty, 33+ chars (one over the observed UI limit), special characters, SQL-keyword string, leading whitespace, expired (already covered by 422), case mismatch.
- **UI attack on place-order**: double-click (button disable already observed - verify it actually prevents the second POST), browser-back after charge, refresh during payment redirect.
- **Stored-data attack on cart**: manually set qty in browser local storage; replay the POST with qty=100 to bypass client validation.
- **Computation attack on price**: cart total at platform max (Stripe USD max $999,999.99); currency-conversion edge case if multi-currency exists.
- **Configuration attack**: feature flag off - does the legacy checkout still work?
- **Output attack**: order-confirmation email rendering with very long order id, unicode in address.

## 2c - FEW HICCUPPS oracle pre-flight

For each observation that already looked wrong, pre-classify with [Bolton's FEW HICCUPPS](https://developsense.com/) so the test row carries a defensible verdict frame:

- "Place-order button disabled on submit." Comparable-products: every major site does this. User-expectations: prevents double-charge. **Consistency expected; bug if missing.**
- "Coupon field client-side uppercases input." Statutes/standards: case-sensitivity of coupon codes is a product choice, not a standard. **Verify the server matches: if server is case-sensitive and client uppercases, hidden mismatch.**
- "axe-core flags 3 a11y violations." Statutes / standards: WCAG 2.2 AA. **Defects, file per criterion.**

## 2d - ISO 25010 quality cross-check

Walk the eight (+2) [ISO/IEC 25010](https://en.wikipedia.org/wiki/ISO/IEC_25010) characteristics; add rows for the quality dimensions SFDPOT didn't surface:

- **Performance**: place-order latency under load; payment timeout handling.
- **Security**: PCI scope; address / card data leakage in logs; CSRF token on POST /payment.
- **Usability**: error-message clarity; keyboard-only flow; screen-reader announcements.
- **Reliability**: idempotency under network retry; recovery after payment-provider 5xx.
- **Maintainability / Portability**: out of scope at the test-design tier; flag for engineering review.
