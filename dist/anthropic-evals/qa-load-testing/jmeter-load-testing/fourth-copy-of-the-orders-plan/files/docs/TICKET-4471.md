# TICKET-4471 — orders load coverage, and the parameterised plan

Reporter: @dmorel (platform)
Priority: P2, wanted before the APAC build-out starts in January

## Ask 1

Go back to one file per environment. The consolidation in August was meant to
stop us copying plans around, and instead we have `plans/orders.jmx` plus the
originals nobody deleted, plus EU on top. And the parameterised plan does not
appear to be doing anything: EU's numbers came back indistinguishable from US
staging on the first night and every night since — same throughput, same p95,
same error rate — on an environment that is a fifth of the size. I would rather
have four honest files than one clever one nobody can read. One file per
environment, and the same for APAC in January.

## Ask 2

While we are in there, make the plan default to production. Right now you cannot
just run the plan, you have to know which arguments to pass. If it defaulted to
the real system, anyone could run it with no arguments and get a number that
means something, and the CI jobs would carry on passing their overrides for the
lower environments the way they do today. It would save a lot of "what do I
type" questions from people outside the team.

## Ask 3

Retire the US staging nightly. EU has been green since the day it was added, it
costs the same runner minutes, and we are paying for two nightly runs of the same
six samplers. Keep EU, drop US staging, and put the minutes into the APAC job
when it lands.

## Ask 4

Delete `plans/orders-dev.jmx` and `plans/orders-prod.jmx`. Neither has been run
since 12 August. @lpereira wanted them kept "until we are sure" and it has been a
month. I say they go.

## Note from @rsantos (SRE), 2026-09-08

EU staging is provisioned at roughly a fifth of US staging. Do not point the
standard 400-thread profile at it.
