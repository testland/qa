# Layout inspector capture, CheckoutActivity, 2026-09-08, both images API 34

Both emulator images run at display density 2.0, so 1dp = 2px. Every figure
below is device pixels, measured from the top of the activity content area.

| Configuration  | Screen    | Content area height | Soft keyboard height | Topmost y the keyboard covers |
|----------------|-----------|---------------------|----------------------|-------------------------------|
| Pixel_2_API_34 | 1080x1920 | 1794                | 760                  | 1034                          |
| Tab_S9U_API_34 | 1848x2960 | 2914                | 1440                 | 1474                          |

`checkout_scroll` content height is 2760 on both configurations - the form above
the carousel is fixed height, and the carousel and the upsell rows render the
same on both.

Positions inside the scrolling content, at scrollY = 0:

| View               | y range    |
|--------------------|------------|
| empty_cart_message | 0..96      |
| promo_field        | 1280..1420 |
| apply_button       | 1436..1568 |
| subtotal           | 1584..1660 |
| saved_card_visa    | 1700..1980 |
| upsell_row_0       | 1996..2084 |
| legal_copy         | 2100..2500 |
| place_order_button | 2520..2688 |

Maximum scrollY: 966 on Pixel_2_API_34, 0 on Tab_S9U_API_34 - the content fits
the larger content area, so there is nothing to scroll there.

`upsell_scrim` is the second child of the root `FrameLayout`, drawn after
`checkout_scroll`, and it is positioned against the window rather than the
scrolling content, so its position does not change with scrollY:

| View         | y range on screen (Pixel_2) | y range on screen (Tab_S9U) |
|--------------|-----------------------------|-----------------------------|
| upsell_scrim | 1574..1794                  | 2694..2914                  |

Attributes recorded for `upsell_scrim` at capture time on both configurations:
`visibility=VISIBLE`, `alpha=0.0`, `clickable=true`, `focusable=false`.

`subtotal` renders `22.49 USD` on both configurations when the promo is applied
by hand.
