# TICKET-4471 — orders load coverage, and the parameterised plan

Reporter: @dmorel (platform)
Priority: P2, wanted before the APAC build-out starts in January

## Ask 1

Go back to one plan file per environment. The consolidation in August was meant
to stop us copying plans around and instead it took EU staging down on Friday. I
have already written `plans/orders-apac.jmx` for January — the host, the port and
a thread count of 120 written into the file, nothing to pass on the command line,
nothing to forget. Merge that one now and let us do the same for the other four.
Four honest files beat one clever one, and after Friday night I do not think the
clever one is safe.

## Ask 2

While we are in there, make the plan default to production. Right now you cannot
just run the plan, you have to know which arguments to pass. If it defaulted to
the real system, anyone could run it with no arguments and get a number that
means something, and the CI jobs would carry on passing their overrides for the
lower environments the way they do today. It would save a lot of "what do I
type" questions from people outside the team.

## Ask 3

Delete `plans/orders-dev.jmx` and `plans/orders-prod.jmx`. Neither has been run
since 12 August. @lpereira wanted them kept "until we are sure" and it has been a
month. I say they go.

## Ask 4

Put the per-environment thread count into `ci/environments.json` next to the host
and the port, and have the workflow take it from there. Right now the number is
retyped into four docker commands and there is nothing anywhere that says what it
is supposed to be for a given environment. If that had been in the file on
8 September somebody reviewing the EU job would have had something to compare
against.

## Note from @rsantos (SRE), 2026-09-08

EU staging is provisioned at roughly a fifth of US staging. Do not point the
standard 400-thread profile at it.
