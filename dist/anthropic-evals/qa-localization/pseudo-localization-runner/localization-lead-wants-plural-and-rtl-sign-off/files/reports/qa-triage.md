# Accented-locale walkthrough, 2026-09-08 - 40 findings

Build `af31c02`, staging, accented locale selected in the environment switcher.
Rows 1-37 are the same shape and are collapsed here; the full list is in the
ticket.

| #     | Surface              | What QA wrote                                            |
|-------|----------------------|----------------------------------------------------------|
| 1-14  | cart, greeting row   | "the row shows a bracketed token where my name should be" |
| 15-29 | cart, summary row    | "quantity and amount both show tokens, not numbers"       |
| 30-37 | invite dialog        | "the address never appears, just the token"               |
| 38    | cart, summary row    | "the row is cut off before the amount"                    |
| 39    | invite dialog        | "the line is cut off"                                     |
| 40    | cart, remove control | "this control did not change at all in this locale"       |

Platform team's note on the ticket:

> 37 of these are the same thing and it is not a product bug, it is something
> the locale is doing to itself. Nobody is going to page an on-call for a locale
> QA turned on themselves. Rows 38 and 39 are the same 37 in a different costume
> - of course the row is cut off, it is twice as long as it should be. Row 40 is
> a real one and it is a five-minute fix.

QA's note on the ticket:

> We were told to walk the build and write down what we saw. We wrote down what
> we saw. If the run is not supposed to produce this we would like to know what
> it is supposed to produce, because we have no way to tell one of these apart
> from a real defect.
