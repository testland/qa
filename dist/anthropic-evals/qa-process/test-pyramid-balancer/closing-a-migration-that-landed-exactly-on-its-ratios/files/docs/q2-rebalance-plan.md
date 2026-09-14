# harbor - test suite migration, approved 2026-04-06

**Baseline, 2026-03-31:** 840 unit / 98 integration / 485 end-to-end.
1423 cases. 59.0% / 6.9% / 34.1%.

**Change shape, 90 days to 2026-03-28:** service-layer 69% of commits,
pure-logic 22%, data-heavy 6%, ui-heavy 3%. Target split 70 / 25 / 5.

## What we are doing

The end-to-end suite has absorbed a decade of tests that assert things with no
user-visible component at all: fee arithmetic, date windows, permission matrix
evaluation, statement formatting. Those assertions belong at the unit layer and
they are the bulk of the 41 minutes the end-to-end stage takes.

**This is a rewrite, not a deletion.** An end-to-end case comes out when the
assertion it carries exists somewhere cheaper. If nothing cheaper carries it,
the case stays until something does.

## Targets

| Layer       | Now  | Target | Change    |
|-------------|-----:|-------:|-----------|
| Unit        |  840 |  ~1100 | **+260**  |
| Integration |   98 |   ~290 | **+192**  |
| End-to-end  |  485 |    ~75 | **-410**  |
| Total       | 1423 |  ~1465 | +42       |

Note the total goes **up**, not down. We are moving assertions down the stack,
so the case count grows as one broad case becomes several narrow ones.

## Done means

Ratios inside their target bands, and every retired end-to-end case accounted
for: either its assertion exists at a lower layer, or the feature it covered is
gone from the product.
