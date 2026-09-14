# How the checkout and cart pages are put together

Written up after the 2026-09-04 red run, since two people asked.

Both pages render their action buttons immediately, in the disabled state, and
enable them from JavaScript once the relevant request comes back:

```html
<!-- /checkout, first paint -->
<button id="place-order" class="btn primary" disabled>Place order</button>
```

- `#place-order` is enabled when `POST /api/cart/totals` resolves. On my machine
  that is 60-120 ms. It is not lazy-rendered and it is not hidden; it is in the
  DOM and on screen from first paint, greyed out.
- `#apply-promo` on `/cart` behaves the same way: present and visible from first
  paint, enabled when `GET /api/cart` resolves.
- Clicking either one while it is still disabled does nothing at all. No
  navigation, no request, no console error — the browser does not dispatch the
  click to a disabled control.
- The confirmation heading `#confirmation` only exists after the order posts.

Nothing here changed in July. The totals endpoint has been the slowest thing on
the page since we shipped it in February.
