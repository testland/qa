# Saved Views — PRD section 3

## Background

Support tickets about losing filter state have tripled since Q1. Three of our
five largest accounts (Northwind, Acme Freight, Belltower) asked for this by
name and two of them raised it on their renewal call. We are doing it now
rather than after the reporting rewrite because the rewrite touches the same
filter serialiser and doing both at once is cheaper than doing them apart.

Not in this release: the iOS and Android apps.

## Behaviour

A user can save the current filter set on `/reports` as a named view. The name
must be 1-40 caracters, must be unique per user, and saving a name that is
already taken returns `409` from `POST /api/views`.

Nobody is realistically going to keep more than twenty of these lying around,
so the limit is 20 saved views per user and the 21st `POST /api/views` returns
`422`.

Applying a saved view sets every filter control on `/reports` to the values
stored with the view and puts `?view=<id>` in the address bar.

A user can share a saved view with a teammate from the view's overflow menu,
and the teammate sees it in their own view list.

The export button on a saved view produces a CSV of the same rows the view is
showing.

The nightly job that prunes views not opened in 18 months must finish within 11
hours.

## Constraints

The filter serialiser keeps its current output format: a filter set serialised
by the build before this change deserialises to the same values after it.

For users with no saved views, `/reports` behaves exactly as it does today.

## Open questions

Open question: do saved views need to be shareable across a whole org, or is
person-to-person enough for v1? Ravi is checking with Legal before Thursday.
