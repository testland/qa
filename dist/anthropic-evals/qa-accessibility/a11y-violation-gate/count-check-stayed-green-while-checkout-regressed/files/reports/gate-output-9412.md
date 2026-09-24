# What CI printed for scan 9412, 2026-09-11

```
# A11y check - verdict: NO-GO
blockers=2 warnings=0 grandfathered=6 fixed=13
BLOCK color-contrast /checkout button.express-pay
BLOCK aria-required-attr /account div[role="dialog"]
FIXED axe::link-name::/checkout::a.icon-cart
FIXED axe::color-contrast::/pricing::span.per-seat
FIXED axe::color-contrast::/legacy-orders::span.muted
FIXED axe::color-contrast::/legacy-orders::td.order-date
FIXED axe::color-contrast::/legacy-orders::a.reorder
FIXED axe::image-alt::/legacy-orders::img.logo-print
FIXED axe::link-name::/legacy-orders::a.invoice
FIXED axe::color-contrast::/docs/api::code.inline
FIXED axe::heading-order::/docs/api::h4.api-note
FIXED axe::link-name::/docs/api::a.edit-page
FIXED axe::color-contrast::/blog/spring-notes::p.lede
FIXED axe::region::/blog/spring-notes::body
FIXED axe::link-name::/careers::a.apply
```

Branch `feat/express-checkout` (#4471) adds the Express Pay button to the
checkout summary and a saved-address dialog to /account. It also swapped the
mini-cart icon link for a labelled button on the way past. /pricing was last
edited 2026-08-14 by d.osei on WEB-4188, "raise plan-table label contrast to
4.6:1". /legacy-orders, /docs/api, /blog/spring-notes and /careers have had no
commits since June.
