# What CI printed on #812, run 2026-09-12

```
# A11y check - verdict: NO-GO
blockers=5 warnings=0 grandfathered=1 fixed=5
BLOCK axe color-contrast /checkout button.primary_1a2b3c
BLOCK axe color-contrast /checkout a.footer-legal_4d5e6f
BLOCK axe color-contrast /checkout span.tax-note_9f10a1
BLOCK axe link-name /checkout a.icon-cart_7b8c9d
BLOCK pa11y color-contrast /checkout html > body > main > table.summary > tbody > tr:nth-child(4) > td:nth-child(2)
FIXED axe::color-contrast::/checkout::button.primary
FIXED axe::color-contrast::/checkout::a.footer-legal
FIXED axe::link-name::/checkout::a.icon-cart
FIXED pa11y::WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail::/checkout::html > body > main > table.summary > tbody > tr:nth-child(3) > td:nth-child(2)
FIXED axe::color-contrast::/pricing::span.per-seat
```

## The diff, for reference

`#812` (Ravi):

- `/checkout` moves from global stylesheets to CSS modules. Every class on that
  page is now emitted with a content hash suffix by the bundler.
- The order summary table gains one row, "Estimated tax", inserted above the
  order total row. The table markup is server-rendered and is not part of the
  CSS-modules migration, so its classes are unchanged.
- No other page is in the diff.

`/pricing` was last touched on 2026-08-28 by d.osei, WEB-4188, "raise per-seat
label contrast to 4.6:1".
