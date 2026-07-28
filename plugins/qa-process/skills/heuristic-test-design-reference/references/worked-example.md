# Worked example - "test the new checkout flow, no spec"

Deep reference for the `heuristic-test-design-reference` SKILL.md. The four models applied end to end to a zero-documentation brief, in the sequence the spine prescribes: SFDPOT enumerates targets, Whittaker attacks each one, ISO 25010 cross-checks quality dimensions, and FEW HICCUPPS classifies the surprises.

Input: "We're shipping a new checkout next week. Test it." That's it.

**SFDPOT walk:**
- **S - Structure**: cart service, payment service, inventory service, idempotency layer. (5 minutes investigating staging deploys.)
- **F - Function**: add to cart, edit qty, apply coupon, choose shipping, choose payment method, place order, see confirmation, receive email.
- **D - Data**: SKU, qty, price, coupon code, address (with locale variants), card / wallet / bank transfer, order id.
- **P - Platform**: desktop Chrome / Safari / Firefox, mobile iOS / Android web, in-app webview (if any), screen reader.
- **O - Operations**: deploy / rollback, alerts on payment-service errors, support's ability to see a stuck order.
- **T - Time**: cart expiry (15 min default?), coupon expiry, payment-provider timeout (30s typical), idempotency-key TTL.

**Whittaker attacks** applied to each function:
- Input attack on coupon: empty, expired, wrong-case, leading whitespace, SQL injection, 256-char string, emoji.
- Stored-data attack on cart: manually set cart.qty to 99999 in DB, then proceed.
- UI attack: double-click "place order"; back-button after charge; refresh during payment redirect.
- Computation attack on price: cart total at the platform's max-amount boundary; currency conversion edge case.
- Configuration attack: payment provider's test key vs prod key; coupon-service unreachable.

**Quality cross-check** (ISO 25010):
- Performance: place-order latency under load; payment-provider timeout handling.
- Security: PCI-DSS scope; address / card data leakage in logs.
- Usability: error-message clarity; keyboard-only flow; screen-reader announcements.
- Reliability: idempotency under network retry; recovery after payment-provider 5xx.

**Oracle (FEW HICCUPPS) for ambiguous findings**:
- Cart shows $99.99 - order says $100.00. Statutes/standards: PCI / accounting (deviation between displayed and charged amount). Bug.
- Place-order button stays clickable while request is in flight. Comparable products: every other site disables. Product purpose: prevents double-charge. Bug.
- Coupon `SUMMER2026` works but `summer2026` doesn't. User expectations: case-insensitive coupons are the norm. Probably bug - file with the FEW HICCUPPS evidence and let product decide.

The output is the input to `test-case-from-live-feature` which turns the SFDPOT + Whittaker walk into a structured test-case matrix.
