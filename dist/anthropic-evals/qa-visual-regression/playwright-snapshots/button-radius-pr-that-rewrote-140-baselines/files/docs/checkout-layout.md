# Checkout page regions (from the design file, 1440 x 900 desktop)

| Region              | x range     | Contains                                                      |
|---------------------|-------------|---------------------------------------------------------------|
| Step rail           | 0 - 240     | step numbers, no controls                                     |
| Form column         | 240 - 856   | address / payment inputs, the primary "Continue" button       |
| Order summary panel | 872 - 1216  | line-item table, subtotal, tax, total, promo-code text field  |
| Gutter              | 1216 - 1440 | empty                                                         |

Note from @jsalas on the design file, 2026-08-30: the promo-code field on the
summary panel is a text input with an inline submit styled as a link, so nothing
in the summary panel consumes `--radius-button`. The panel's own corners use
`--radius-card`. The "Continue" button is in the form column.
