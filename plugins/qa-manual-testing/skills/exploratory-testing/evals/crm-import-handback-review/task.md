# Fifteen minutes to decide what to do with these notes

## Problem Description

A contractor spent yesterday morning on the new CRM contact-import feature
and sent me the notes below at 17:58. His engagement ended at 18:00 - he is
not reachable and there is no way to ask him anything.

The feature goes to the customer-success team on Thursday. I have fifteen
minutes before standup to decide whether these notes are good enough to file
as our record of that testing, or whether the morning has to be repeated by
someone in-house. Re-running any of it myself today is not possible; I am
working purely from what he wrote.

Two things bother me. He reports "found 7 bugs" as if that settles it, and
one of my peers has started ranking contractors by exactly that number,
which I think is a bad habit. And whatever I decide, someone in-house is
picking this feature up on Wednesday and needs to know where to start.

Give me something I can paste into the ticket.

## Output Specification

Produce a single file: `docs/qa/reviews/imp-114-review.md`.

It must contain:

1. A per-part assessment of the notes: for each thing the write-up should
   have told me, whether it is complete, thin, or absent, with a one-line
   coaching note on the thin and absent ones.
2. A judgement on how his morning was spent, against what a healthy split
   would look like, and what the split implies about the environment or the
   scope he was given.
3. A one-line verdict: file these as our record, or repeat the work - with
   the single most important thing to fix first.
4. The assignment for whoever picks this up on Wednesday, stated as the area
   to work, what to work it with, and what we still need to learn.
5. An explicit position on the "7 bugs" framing and what I should tell my
   peer.

You have fifteen minutes of desk time, the notes below, and nothing else. Do
not propose re-testing anything today, do not invent findings the notes do
not contain, and do not contact the contractor.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/handbacks/imp-114-contractor-notes.md ===============
# CRM contact import - test run notes

Tester: external contractor (D.R.)
Date: Tuesday
Build: import-svc 2.9.0-rc3, staging

## What I did

Tested the CSV contact import. Found 7 bugs.

## Notes

- Uploaded the 50-row sample file. Worked.
- Uploaded a file with a duplicate email. It created two contacts. Probably
  wrong, the spec talks about merging.
- Tried a 60,000-row file. Upload page timed out after about 4 minutes.
  Tried twice, same both times.
- File with a UTF-8 BOM: first column header not recognised, all rows
  rejected.
- Semicolon-delimited file (European Excel export) is not detected. Rejected
  with "malformed".
- Empty file: 500 error page.
- File where the phone column has +44 numbers: leading + stripped on save.
- Column mapping screen: if you go back and forward the mapping resets.
- Ran out of time. Staging import queue was stuck for a while in the middle,
  had to ask someone to restart the worker, that took a chunk of the morning.

## Environment

Staging. Import worker restarted once by the platform team.

## Time

Started 09:15, finished 12:30.

=============== FILE: docs/import-feature-summary.md ===============
# Contact import - what it is meant to do

- Accepts CSV up to 100,000 rows, comma-delimited, UTF-8.
- Detects columns and offers a mapping screen; the mapping is remembered per
  user for the next import.
- Duplicate handling: a contact matching an existing record by email is
  merged, not duplicated, unless the user opts into "always create new".
- Phone numbers are normalised to E.164 on save.
- Imports run asynchronously on a worker; the user gets an email when the
  run finishes, with a row-level error report attached.
- Rollback: an entire import run can be reverted within 24 hours.

Not yet covered by anyone: the email report, the rollback path, the
per-user remembered mapping, and the "always create new" option.
