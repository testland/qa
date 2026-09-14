From: @buildeng (Priya)
Subject: PriceCalculator:35 again

Ran the numbers you asked for. PIT run 4412 on Monday reported
PriceCalculator:35 as KILLED. Run 4418 on Tuesday reports it SURVIVED. The two
runs are on the same commit - a3f7c21 both times, I checked the job metadata
twice, and nothing under src/ changed between them.

Other thing you should know: `PriceCalculatorTest.feeForTenItems` is on our flake
board. It has failed 27 of the last 430 runs on main (6.3%) with no pattern by
agent or time of day. It shares a static TierTable instance with
`TierCacheTest`, and we run the suite with `-Dparallel=classes`. Ticket is
BLD-1180, unowned since August.

I do not know what any of that means for your mutation numbers. You asked for
the run history, so there it is.
