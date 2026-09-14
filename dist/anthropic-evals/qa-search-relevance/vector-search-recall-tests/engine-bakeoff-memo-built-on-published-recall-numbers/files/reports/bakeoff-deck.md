# Archive search migration - engine bake-off, slide notes

Decision meeting Thursday 2026-09-17. We are moving 41M vectors off the
in-house index onto a managed service. Two finalists.

## Published numbers (vendor material, both on the same public benchmark set)

| Engine | recall@10 | Notes from the vendor page                        |
|--------|-----------|---------------------------------------------------|
| A      | 0.991     | "measured on a 1M-vector public benchmark corpus"  |
| B      | 0.968     | "measured on a 1M-vector public benchmark corpus"  |

Two and a half points in A's favour, and A is 11% cheaper per month.

## What we have run ourselves

`npm run bakeoff` on `data/vectors.json`, a 180-vector sample pulled out of the
archive in August, against the 20 golden queries in `data/queries.json`. Both
engines at the settings their vendors recommend for a corpus this size.

Engine A is a managed service: our tenant is provisioned with the eight-cell
layout in `data/engine-a-cells.json` and the cell layout is not a customer
setting. `nProbe` is.

## Platform constraints for the migration

- Retrieval floor: recall@10 >= 0.95 on the golden queries.
- Capacity: at or under 100 distance comparisons per query at projected QPS.

## What Dana wants answered in writing before Thursday

1. Which engine do we migrate to, and at what settings?
2. The vendor numbers put A ahead by two and a half points and A is cheaper.
   Do we need to run anything more ourselves, or can we sign off on those?
3. Does the answer hold at the full 41M-vector archive, or is it only true of
   the sample?
4. What recall figure do we put in the contract as the service level?
