# Merchandising spot check - 2026-09-11

Twelve saved queries, run against production this morning. "First result" is
what the customer sees at the top of page one.

| Query                                    | First result                |
|------------------------------------------|-----------------------------|
| waterproof running shoe for wet trails   | Verge stability shoe        |
| lightweight racing shoe                  | Verge stability shoe        |
| cushioned trainer for daily miles        | Fellrunner GTX              |
| day pack for hiking                      | Ledger tote                 |
| laptop backpack for commuting            | Ledger tote                 |
| hydration vest for long runs             | Ledger tote                 |
| packable rain jacket                     | Thicket quilted overshirt   |
| warm down jacket for winter              | Thicket quilted overshirt   |
| fleece midlayer                          | Thicket quilted overshirt   |
| gps watch for running                    | Tessera smart band          |
| dive watch with a rotating bezel         | Plumb barometer watch       |
| sleep tracking band                      | Tessera smart band          |

Merch's note: "six products between twelve queries. Some of these are not
even the right sort of thing - Ledger tote is a shopping bag and it wins
'hydration vest for long runs'. We have 48 products and customers see about
six of them."

## What changed in that window

- 2026-08-28 - the catalogue API replaced the nightly feed as the source for
  part of the catalogue. Product copy, ids and categories are unchanged; the
  ingest path, the index config and the query path were all untouched.
- 2026-09-02 - centroid re-fit considered and skipped; cell assignment is
  direction-only so it was judged unnecessary.

## PR #2291 - "sharpen query separation"

    -const QUERY_BOOST = 1.0;
    +const QUERY_BOOST = 1.35;

Author's note on the PR:

> Tuned on the twelve spot-check queries. It sharpens the separation between
> close matches so the best one pulls ahead. Ran `npm run recall` before and
> after: 0.908 both times, so no regression. Safe to ship.

## Merch's alternative

> If search cannot do this, pin the eight products we actually want on page one
> and we will maintain the list by hand.
