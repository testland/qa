# Saved Views PRD goes into refinement Thursday and I want the sentences checked first

## Problem Description

Priya wrote section 3 of the Saved Views PRD on Friday and it goes into
refinement with the platform squad on Thursday morning. Last quarter we had two
stories come back from that meeting a week later because nobody could agree
what "done" meant, and both times the argument was about a sentence in the PRD
rather than about the code.

I want a read of section 3 before Thursday. The only question I care about is
which sentences an engineer could actually build to and a tester could actually
write a check against, and which ones are going to produce the same argument
again. Priya is fast at fixing these when someone tells her exactly what to put
instead, and very slow when someone tells her a sentence is "vague".

Two things I do not want from this. Priya is a product manager, not a writer,
and I am not sending her a list of tone edits. And section 3 is deliberately
narrow — it is one slice of a much bigger feature — so it is not the place to
argue about what else Saved Views ought to do.

The file is attached.

## Output Specification

1. Write `docs/refinement-notes.md`. It needs a top-line call on whether
   section 3 can go to the squad as written, a count of the sentences you
   assessed, and a row for every sentence you have a problem with.
2. Leave `docs/prd-saved-views.md` exactly as it is. Priya owns that file and
   makes her own edits.

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

Users can share a saved view with a teammate.

The export button on a saved view returns the same rows the view is showing.

The nightly job that prunes views not opened in 18 months must finish within 11
hours.

## Open questions

Open question: do saved views need to be shareable across a whole org, or is
person-to-person enough for v1? Ravi is checking with Legal before Thursday.
