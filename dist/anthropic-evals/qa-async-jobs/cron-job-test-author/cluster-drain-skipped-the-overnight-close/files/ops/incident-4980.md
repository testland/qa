# INC-4980 - orders partition left half rewritten

- 2026-03-19 04:12 UTC - a pool scale-down evicted `warehouse-compact` 47
  minutes into a pass.
- The pass rewrites the partitions it is given in place, file by file, from
  source. 9 of the 23 files in orders had been replaced when it went.
- 2026-03-19 .. 2026-03-21 - analytics read doubled rows out of orders and
  nobody connected it to the eviction. Cleared by running a full pass by hand.
- The job keeps no checkpoint. A pass that is interrupted has to start again
  from the beginning, and until it does the partitions are neither the old
  version nor the new one.
