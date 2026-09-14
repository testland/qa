# Manual checkout regression - August release, findings

Two defects reached customers in 2026-08 and both were caught here first, after
the instrumentation job had already gone green on the same build:

- **NW-2244** - an expired promotional code was accepted at checkout and applied
  a discount. Reproduced on build 4571. The screen did show the red error strip
  underneath the promo field at the same time; the discount was applied anyway.
  Fixed in 4588.
- **NW-2251** - the delivery estimate did not appear for postcodes outside
  London. Not covered by any automated test.

Time cost of the pass: 40 minutes, one person, once per release candidate.
