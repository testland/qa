# Note from the tracker admin, 2026-09-13

The `environment` field on the growth board became **mandatory on new tickets
from Monday 2026-09-14**. Before that it was optional. Spot-checking the last
two months, roughly a third of bugs were filed without it, and there is no
backfill planned — nobody can reconstruct where those were found.

`type` has always been mandatory, so bug versus feature_request is reliable.
`environment=staging` is set by the CI bot when a failure is caught before a
release goes out, so where it is present it can be trusted.
