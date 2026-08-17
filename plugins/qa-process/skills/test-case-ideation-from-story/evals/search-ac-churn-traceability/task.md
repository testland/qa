# Nobody can tell which search cases to re-run when an AC changes

## Problem Description

SRCH-88 has been re-scoped twice. AC-4 was rewritten in both sprints, and both
times the same thing happened: the QA lead re-read all thirty-odd cases from
the previous list line by line, guessed which ones AC-4 touched, and re-ran a
superset to be safe. The second pass cost two days.

Product has told us AC-4 will probably move again once the pricing experiment
lands, and there is an open question on AC-6 that will change something.

So the list we build this time has to survive that. When any single line of
this story changes, the person holding it must be able to work out in one pass
over the document which rows are affected — without reading each row's steps
and reconstructing where they came from.

Note that not everything a tester needs is in the acceptance criteria. Some of
it is in the mockup caption, and some of it is not written down anywhere.

## Output Specification

1. Produce `docs/test-cases/SRCH-88.md` containing a single markdown table.
2. The document must support the re-run problem described above directly: a
   reviewer holding a changed line of the story should be able to identify the
   affected rows by reading the table, not by inference.
3. Out of scope: automated tests, the relevance ranking algorithm itself, and
   the analytics events the search box emits.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/SRCH-88.md ===============
# SRCH-88 — Catalogue search with filters

**Type:** Story
**Squad:** Discovery
**Revision:** 3 (AC-4 rewritten 2026-06-30 and 2026-07-21)

## Story

As a shopper, I want to search the catalogue and narrow the results down, so
that I can find a product without browsing categories.

## Acceptance criteria

- AC-1: A query of at least 2 characters returns matching products.
- AC-2: Matching is on product title, brand and SKU.
- AC-3: Results are paginated at 24 per page.
- AC-4: Filters are category, price range and availability. Filters combine
  with AND. Applying a filter returns to page 1.
- AC-5: The active filters are shown as removable chips above the results.
- AC-6: Results are ordered by relevance. *(Open: the team has not agreed what
  happens when two products score the same.)*
- AC-7: The query and the active filters are reflected in the URL so a result
  page can be shared.

## Mockup notes

Frame 4 caption: "No results — we show the empty state with the query echoed
back, the filter chips still active, and a 'clear filters' action. Clearing
filters re-runs the same query."

Frame 6 caption: "Long queries truncate in the chip but the full query stays in
the URL."
