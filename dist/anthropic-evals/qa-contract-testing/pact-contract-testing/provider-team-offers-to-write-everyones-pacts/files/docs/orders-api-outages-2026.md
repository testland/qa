# orders-api — the two response-change outages Pavel refers to

## 2026-02-19, 2h10m

`customerTier` was renamed to `tier`. billing-reconciler read it and started
banding every customer as untiered. Found by a finance report the next morning.

## 2026-06-04, 40m

`lines[].pickBin` was moved under a new `fulfilment` object. warehouse-sync read
it and dropped every pick instruction for four hours. Found by a warehouse
supervisor phoning the on-call.

Both changes were reviewed and both were shipped by people who had no way of
knowing which downstream service read the field.
