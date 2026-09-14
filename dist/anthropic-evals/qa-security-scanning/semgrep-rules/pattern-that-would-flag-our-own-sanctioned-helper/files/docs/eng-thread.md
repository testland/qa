# #eng-sec — LED-2291 AI-2, 2026-09-08

**m.oyelaran** — Simplest thing that works: match any call to exec or execSync
anywhere, full stop. That is 214 hits across the tree. We put a suppression
comment on lib/shell.js and on the release scripts, which are the only
legitimate ones, and then the rule is absolute and nobody argues about it at
review time. Suppression comments are two seconds each and we only pay it once.

**s.trewin** — Do we even need our own pattern? Switch the config over to
registry auto-detection and it will pull in whatever command-injection rules
exist for our stack. Less for us to maintain, and it is one flag.

**m.oyelaran** — Auto did not flag render.js line 18 when I tried it on my
branch on Friday, for whatever that is worth.

**b.ferreira** — 214 hits is 211 people finding out their perfectly fine code is
now a security finding. That is how the dependency check died here in 2024.
