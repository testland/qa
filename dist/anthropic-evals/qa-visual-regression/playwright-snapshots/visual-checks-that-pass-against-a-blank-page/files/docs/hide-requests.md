# Requests in #web-qa, 2026-08-20 to 2026-09-08

**R1 - @priya.** The chat bubble is in every baseline image and moves between
runs. Hide it everywhere, not just where somebody remembers to.

**R2 - @priya.** Same for the "last synced N minutes ago" line in the header.
It is a relative timestamp, it changes on its own, it is never what we are
checking.

**R3 - @sam.** The pricing page is the noisiest thing we own and I am tired of
re-running it. Put a mask over `main` on the pricing check. Whatever is moving
in there is inside `main`, so that ends it.

**R4 - @ola.** Hide `[data-testid="plan-price"]` on the pricing check. The
number under each plan is different between runs - I have seen 29, 24 and
2,400 on three consecutive runs of the same commit.

**R5 - @sam.** Do not spend any of this effort on `marketing hero`. That check
has not failed once since it was written on 2026-05-12, it is the most stable
thing in the suite, and touching it is how we break it.
