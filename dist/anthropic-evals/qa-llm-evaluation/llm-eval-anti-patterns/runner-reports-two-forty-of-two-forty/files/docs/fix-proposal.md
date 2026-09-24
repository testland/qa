# What I think we should do first, Dan, 2026-09-12

Three changes, in the order I would make them. Tell me if any of these is
wrong, I would rather hear it now than after Friday.

**1. Drop the repeat loop.** `EVAL_REPEATS` defaults to 20 and the runner
multiplies the case file by it before it prints a total. We have twelve cases.
Calling that 240 is embarrassing, and if this number is going to gate a deploy
it should be a count of cases, not a count of case-executions. Set the repeats
to 1, report 12 / 12 honestly, and grow the case file when we have time.

**2. Stop exact-matching model output.** Most of the case file asserts
`equals:` or `contains:` on text a language model wrote. `cls-01` asserts the
output is literally the string `billing_question`. That is the most fragile
thing in this repo and it breaks the first time the model phrases anything
differently. Move all of them onto the judge with a rubric, the way `ref-02`,
`exp-01` and `tone-01` already are.

**3. Wire an API key into the CI runners.** This has been on the backlog since
March and it is the only reason we run this by hand before a deploy.

I would do 1 and 2 this week and 3 whenever infra gets to it.
