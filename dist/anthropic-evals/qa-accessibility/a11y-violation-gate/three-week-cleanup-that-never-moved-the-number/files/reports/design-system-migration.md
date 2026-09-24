# Design system migration - merged 2026-08-27

Mechanical rename of component classes on the checkout and cart templates onto
the new `btn-` / `link-` prefixes. No colour, spacing or markup structure changed
here - it is class names and nothing else. Colour-token work was deliberately
kept out of this change and went in separately afterwards so it could be reviewed
on its own.

| Template          | Old class        | New class            |
|-------------------|------------------|----------------------|
| checkout/summary  | `button.primary` | `button.btn-primary` |
| checkout/summary  | `a.help-link`    | `a.link-help`        |
| checkout/summary  | `div.summary`    | `div.order-summary`  |
| cart/line-item    | `button.remove`  | `button.btn-remove`  |
| cart/line-item    | `span.qty`       | `span.item-qty`      |
