# Bugs are coming back after we close them

## Problem Description

Two defects we closed last sprint were reported again by customers within
eight days. The engineering manager wants to know how many of the tickets we
closed in the last six weeks were actually confirmed by anyone before they
were closed, and which ones have to go back.

The export below is every bug our team closed since 2026-07-01, with the
sequence of states each one passed through and who signed off. Some of these
closures are fine and I do not want them disturbed - the team is already
sensitive about tickets being reopened for bookkeeping reasons.

Whatever we do next touches a lot of tickets at once, so the manager wants to
see the list and the count before anyone runs anything against the tracker.

## Output Specification

Produce exactly two files:

1. `verification-gate-audit.md` - for every closed ticket in the export,
   whether its closure holds up, and for the ones that do not, exactly what is
   missing and what state it should be sitting in instead. Say explicitly which
   closures you are leaving alone and why, so nobody re-litigates them. Include
   the count of tickets your plan would move and the check the manager should
   run against that count before anything is applied.
2. `reopen-plan.csv` - one row per ticket to be moved, columns
   `key,current_state,target_state,who_acts_next,reason`.

Out of scope: severity and priority, sprint planning, and the CI filing job.
Do not propose changes to the workflow configuration itself.

## Input Files

Extract the following files before beginning.

=============== FILE: exports/closed-bugs.csv ===============
key,summary,status,resolution,severity,priority,assignee,verified_by,verified_at,fix_version,transition_history,closed_at
ENG-4101,"Session drops when switching workspaces",Closed,Done,2 - High,P2,d.novak,,,"2026.07.02","New|Open|Assigned|In Progress|Fixed|Closed",2026-07-08
ENG-4108,"Invoice PDF missing tax line for VAT-exempt accounts",Closed,Done,2 - High,P2,s.park,q.alvarez,2026-07-14,"2026.07.16","New|Open|Assigned|In Progress|Fixed|Verified|Closed",2026-07-16
ENG-4112,"Search returns results from deleted projects",Closed,Won't Do,3 - Medium,P3,,,,"","New|Closed",2026-07-11
ENG-4115,"Bulk import silently drops rows over 10k",Closed,Done,1 - Critical,P1,m.oyelaran,,,"","New|Open|Assigned|Closed",2026-07-19
ENG-4120,"Webhook retries fire twice after a 502",Closed,Done,2 - High,P2,d.novak,d.novak,2026-07-23,"2026.07.23","New|Open|Assigned|In Progress|Fixed|Verified|Closed",2026-07-23
ENG-4122,"Timezone offset wrong on the audit log export",Closed,Done,3 - Medium,P3,l.fontaine,q.alvarez,2026-07-27,"2026.07.30","New|Open|Assigned|In Progress|Fixed|Verified|Closed",2026-07-30
ENG-4130,"SSO login loops for users in two directories",Closed,Done,1 - Critical,P1,s.park,ci-bot,2026-08-03,"2026.08.06","New|Open|Assigned|In Progress|Fixed|Verified|Closed",2026-08-03
ENG-4133,"Keyboard shortcut conflicts with browser find",Closed,Won't Do,4 - Low,P4,,,,"","New|Open|Deferred|Closed",2026-08-04
ENG-4136,"Export job times out over 500k rows",Closed,Done,2 - High,P2,m.oyelaran,q.alvarez,2026-08-07,"2026.08.10","New|Open|Assigned|In Progress|Fixed|Verified|Closed",2026-08-10
ENG-4140,"Password reset accepts an expired token",Closed,Done,1 - Critical,P1,s.park,,,"2026.08.11","New|Open|Assigned|In Progress|Fixed|Closed",2026-08-11
ENG-4144,"Column sort resets after inline edit",Closed,Done,4 - Low,P4,l.fontaine,q.alvarez,2026-08-12,"2026.08.13","New|Open|Assigned|In Progress|Fixed|Verified|Closed",2026-08-13

=============== FILE: exports/verification-notes.csv ===============
key,note
ENG-4101,"closed by the assignee with the comment 'merged, should be fine'"
ENG-4112,"one comment from the reporter, no triage comment, closed the same hour it was filed"
ENG-4115,"no PR linked; assignee comment reads 'lost track of this, closing for now'"
ENG-4120,"verification comment written by the same engineer who wrote the fix"
ENG-4130,"verified_at is 3 minutes after the Fixed transition; ci-bot posts 'deploy succeeded' and the automation moves the ticket on"
ENG-4133,"product manager comment 2026-08-01 accepting the behaviour for this release, review at next planning"
ENG-4140,"customer-reported; reset flow retested by nobody; the fix PR touched the token TTL only"
