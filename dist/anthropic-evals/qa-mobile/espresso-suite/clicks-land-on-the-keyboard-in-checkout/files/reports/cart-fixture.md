# The seeded checkout cart the instrumentation job runs against

Twelve lines, always in this order, seeded before every run:

| # | Title                 | Price  |
|---|-----------------------|--------|
| 1 | Filter Papers x100    | £4.50  |
| 2 | Hand Grinder          | £38.00 |
| 3 | Scales                | £24.00 |
| 4 | Espresso Cups x2      | £16.00 |
| 5 | Tamper                | £12.00 |
| 6 | Cleaning Tablets      | £7.25  |
| 7 | Milk Jug              | £9.00  |
| 8 | Kettle Spout          | £14.50 |
| 9 | Cold Brew Carafe      | £21.00 |
|10 | Travel Mug            | £11.00 |
|11 | Storage Tin           | £6.75  |
|12 | Bean Scoop            | £3.20  |

The cart screen on the CI device shows four rows at a time; the rest are
reachable by scrolling. The subtotal label (`R.id.cart_subtotal`) and the line
counter (`R.id.cart_line_count`) sit in a fixed header above the list and are
attached for the whole life of the screen.

After a successful removal the server returns the new cart and the screen calls
`CartAdapter.refresh(...)`.
