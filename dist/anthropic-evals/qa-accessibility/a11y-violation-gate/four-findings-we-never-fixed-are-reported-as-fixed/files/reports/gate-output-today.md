# What CI printed on #812, run 2026-09-12

```
merged 8 findings
# A11y check - verdict: NO-GO
blockers=8 warnings=0 grandfathered=0 fixed=4
BLOCK axe color-contrast /checkout button.primary
BLOCK axe color-contrast /checkout a.footer-legal
BLOCK axe color-contrast /checkout span.tax-note
BLOCK axe link-name /checkout a.icon-cart
BLOCK axe color-contrast /pricing span.per-seat
BLOCK axe aria-required-attr /pricing div[role="dialog"]
BLOCK lighthouse video-caption /checkout undefined
BLOCK lighthouse focus-traps /checkout undefined
FIXED wave::contrast::/checkout::button.primary
FIXED wave::contrast::/checkout::a.footer-legal
FIXED wave::link_empty::/checkout::a.icon-cart
FIXED wave::contrast::/pricing::span.per-seat
```

PR #812 (Ravi): adds the estimated-tax line to the checkout summary and a
"compare plans" dialog to the pricing page. Nothing else on either page was
touched. The pricing page footer has not been edited since March.
