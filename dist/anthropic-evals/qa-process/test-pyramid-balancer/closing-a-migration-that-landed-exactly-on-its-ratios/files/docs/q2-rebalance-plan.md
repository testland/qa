# harbor - test suite migration, approved 2026-04-06

**Baseline, 2026-03-31:** 246 unit / 12 integration / 143 end-to-end.
401 cases. 61.3% / 3.0% / 35.7%.

**Change shape, 90 days to 2026-03-28:** service-layer 69% of commits,
pure-logic 22%, data-heavy 6%, ui-heavy 3%. Target split 70 / 25 / 5.

## What we are doing

The end-to-end suite has absorbed a decade of assertions with no user-visible
component at all: fee arithmetic, permission matrix evaluation, statement
periods, export column ordering. Those belong below the top layer, and they are
the bulk of the 38 minutes the end-to-end stage takes.

**This is a rewrite, not a deletion.** An end-to-end case comes out when the
assertion it carries is carried somewhere cheaper. If nothing cheaper carries
it, the case stays until something does.

## Targets

| Layer       | Now  | Target | Change    |
|-------------|-----:|-------:|-----------|
| Unit        |  246 |   ~252 | +6        |
| Integration |   12 |    ~90 | **+78**   |
| End-to-end  |  143 |    ~19 | **-124**  |
| Total       |  401 |   ~361 | -40       |

## Done means

The middle layer is carrying the assertions the top layer used to carry, and
the pipeline is green.
