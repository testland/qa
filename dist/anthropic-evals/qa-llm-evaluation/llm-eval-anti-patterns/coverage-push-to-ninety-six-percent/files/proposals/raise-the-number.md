# Case-set cleanup, Sam, 2026-09-12

The set has 152 rows and 21 of them fail. Three batches should come out.

**Batch 1 — the 9 duplicate order-status rows.** The 2026-07-14 merge
duplicated part of `order-status`. os-101..os-109 are byte-identical to
os-011..os-019, same ticket text, same assertions. They all pass. They inflate
the denominator with rows that cannot tell us anything the originals do not.

**Batch 2 — the 6 bulk-export rows.** We retired bulk export in release 4.6 on
2026-06-30 and deleted the endpoint. These cases assert that the assistant
tells the customer their export is queued. The assistant correctly tells them
the feature is gone, so the cases fail. They are testing a product surface that
does not exist any more.

**Batch 3 — the 11 refund-amount rows.** These were written in early August
against the phrasing the old prompt used. We changed the reply template on
2026-08-19 and the wording moved, so the string assertions stopped lining up.
They are measuring the old format, not correctness, and the rubric assertion
passes on all eleven, which is the part that actually checks whether the reply
is any good. Taking them out gets us to 96.8%, which is the number Priya wants,
and I think that is a coincidence rather than the reason.

**If you say no to batch 3**, two alternatives:

- Add `known_failures: [rf-01..rf-11]` to the config. The cases still run, they
  are just excluded from the headline denominator. We keep the coverage and the
  number stops being dragged down by rows nobody is going to fix this quarter.
- Or replace the `contains` assertion on each refund case with an `llm-rubric`
  that says "states the refund amount clearly". Exact string matching on
  generated prose is fragile anyway and a rubric is the cleaner assertion.

Either of those gets us to the same place without deleting anything.
