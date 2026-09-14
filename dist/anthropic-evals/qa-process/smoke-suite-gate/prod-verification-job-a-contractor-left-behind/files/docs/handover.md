# Handover — verification checks, Priyanka, 2026-07-04

The file works. Two things I did not get to:

- The cleanup pattern is too broad. `LIKE 'smoke%'` should have been
  `LIKE 'smoke+%'` — the signup writes `smoke+<timestamp>@lumen-test.io` and no
  real customer address has a plus sign in that position. Half an hour of work
  and INC-3312 cannot happen again.
- The purchase check wants its own card so finance stop seeing it on the
  company statement. Ask Ray for a dedicated one and put the number in a secret
  instead of in the file.

Everything else I would leave exactly as it is. The signup check is the one
that found the broken sign-in in May, and it is the only thing in the file that
exercises a brand new account — which is the path a customer actually takes on
day one, and the one nothing else in the repo touches.
