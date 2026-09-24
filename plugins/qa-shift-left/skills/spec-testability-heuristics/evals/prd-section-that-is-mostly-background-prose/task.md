# Four people have four opinions about section 3 and refinement is Thursday

## Problem Description

Priya wrote section 3 of the Saved Views PRD on Friday and it goes into
refinement with the platform squad on Thursday morning. Last quarter two
stories came back from that meeting a week later because nobody could agree
what "done" meant, and both times the argument was about a sentence in the PRD
rather than about the code.

I want a read of section 3 before Thursday and I only care about one question:
which of these sentences could an engineer build to and a tester write a check
against exactly as they stand, and which ones are going to start that argument
again.

The reason I am asking someone to go at it sentence by sentence is that I have
already had three reads of it and they do not agree. Ravi says the eleven-hour
ceiling on the prune job alone should stop it going in, and he is not wrong
that eleven hours looks mad for a nightly job. Dan skimmed it and said the
whole thing reads like a first draft and Priya should take another pass before
anyone sees it. Marta read it and said it was fine. I cannot walk into Thursday
with that.

The file is attached.

## Output Specification

Write `docs/refinement-notes.md`. It needs a top-line call on whether section 3
can go to the squad as written, a count of the sentences you assessed, and a
row for every sentence you have a problem with.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/prd-saved-views.md ===============
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
