# Closing out the launch escapes

Now that the vendor has delivered I would rather measure real strings than
invented ones. Two things:

**1. Widen the two surfaces that clipped.** `billing.confirm` to 34 and
`invoice.export` to 30. Both measured straight off the German file with two or
three characters of headroom, and both containers can grow that far without
touching the grid.

**2. Retire `test/readiness.test.js`.** It has never failed in six months, and
we now have a better input than made-up padding: the vendor's own file. When
French lands on 2026-09-30 we measure that the same way and widen whatever it
breaks. One fewer moving part, and no more arguing about how much padding is the
right amount of padding. - H
