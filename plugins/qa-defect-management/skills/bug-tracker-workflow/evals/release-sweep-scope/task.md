# Someone wants to clear 15 tickets in one pass before the retro

## Problem Description

The 2026.06.15 release shipped and our delivery lead wants the board cleaned
up before Thursday's retro. We have a runbook from the last release that
someone wrote in a hurry; it was already re-run twice this year and the second
run put four tickets from the following release into a finished state, which
took an afternoon to undo by hand.

The lead has run the query from that runbook and pasted the matches below.
Some of them clearly should not be finished, and one is in a different
project whose board is set up differently from ours.

I want the scope settled on paper before anybody points the runbook at the
tracker. Nothing gets touched this week without the lead being able to check
the list against what the run would actually do.

## Output Specification

Produce exactly three files:

1. `sweep-plan.md` - the tickets the run should finish and the tickets it must
   leave alone, each with a reason a reviewer can check against the export.
   State the count on each side, and the check the lead performs against those
   counts before allowing the run to proceed. Include what has to change about
   the runbook itself before it is safe to point at the tracker again, covering
   the different project on the list.
2. `sweep-scope.csv` - one row per matched ticket, columns
   `key,decision,reason`, with `decision` being finish or exclude.
3. `runbook-changes.md` - the specific changes to the existing runbook, quoting
   the line each one replaces.

Out of scope: performing any transition, and changing anything about the
tickets other than finishing them. Do not rewrite the release process.

## Input Files

Extract the following files before beginning.

=============== FILE: exports/sweep-matches.csv ===============
key,summary,project,status,fix_version,labels,verified_by,last_updated
ENG-5001,"Retry banner shows stale timestamp",ENG,Verified,2026.06.15,"release-2026.06.15",q.alvarez,2026-06-14
ENG-5002,"Saved filters lost on sign-out",ENG,Verified,2026.06.15,"release-2026.06.15",q.alvarez,2026-06-14
ENG-5003,"Rate limit header missing on 429",ENG,Verified,2026.06.15,"release-2026.06.15",t.brandt,2026-06-15
ENG-5004,"Import preview truncates unicode names",ENG,Verified,2026.06.15,"release-2026.06.15",q.alvarez,2026-06-15
ENG-5005,"Empty state flashes before data loads",ENG,Verified,2026.06.15,"release-2026.06.15",t.brandt,2026-06-15
ENG-5006,"Webhook secret shown in plain text in settings",ENG,Verified,2026.06.15,"release-2026.06.15",q.alvarez,2026-06-16
ENG-5007,"Sort order ignored on the second page",ENG,Verified,2026.06.15,"release-2026.06.15",t.brandt,2026-06-16
ENG-5008,"Invite email links to the wrong workspace",ENG,Verified,2026.06.15,"release-2026.06.15",q.alvarez,2026-06-16
ENG-5009,"Usage chart off by one day in UTC-negative zones",ENG,Verified,2026.06.15,"release-2026.06.15",t.brandt,2026-06-17
ENG-5012,"Bulk delete leaves orphaned attachments",ENG,Fixed,2026.06.15,"release-2026.06.15",,2026-06-13
ENG-5015,"Token refresh races on slow networks",ENG,Fixed,2026.06.15,"release-2026.06.15",,2026-06-17
ENG-5020,"Search index lags behind writes",ENG,Verified,2026.07.01,"release-2026.07.01",q.alvarez,2026-07-02
ENG-5023,"Legacy CSV importer unsupported past 2027",ENG,Deferred,,"release-2026.06.15,deferred-review",,2026-05-29
ENG-5028,"Avatar cache not busted on upload",ENG,Closed,2026.06.15,"release-2026.06.15",t.brandt,2026-06-18
OPS-2210,"Alert routing drops the on-call override",OPS,Verified,2026.06.15,"release-2026.06.15",t.brandt,2026-06-16

=============== FILE: runbook/release-close-out.md ===============
# Release close-out (run right after the release call)

Query used to collect the tickets:

    project in (ENG, OPS) AND (fixVersion >= "2026.06.15" OR labels = "release-2026.06.15")

Then, for every key the query returned:

    POST /rest/api/3/issue/{key}/transitions
    body: {"transition": {"id": "31"}}

Notes from last time:
- id 31 is "Close Issue" on the ENG board, someone confirmed it in March
- if a key 400s, skip it and carry on so the run finishes
- takes about two minutes for the whole board
