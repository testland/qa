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
