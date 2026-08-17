# The same defects keep coming back and our weekly numbers say we're improving

## Problem Description

We report a "new defects this week" figure to the steering group every Monday.
Last week it read 9, which nobody believed, because at least three of those
nine were things we had already fixed once. Meanwhile the board shows several
tickets that came back and then drifted - one of them is open with nobody on
it while the change that was supposed to fix it is still running in
production.

The export below is every ticket that has been through a fix at least once,
plus two that were filed fresh in the last fortnight. There is also a short
note file with what the engineers said on each.

The steering group meets Monday morning, so the outcome has to say what happens
to each ticket and what this week's figure should actually be.

## Output Specification

Produce exactly two files:

1. `recurrence-audit.md` - per ticket: what state it should be in, who picks it
   up next, and for anything whose fix already shipped, what has to happen to
   the shipped change itself. State which of these tickets belong in the "new
   defects this week" figure and which do not, with the corrected figure.
   Identify any ticket whose history suggests the fix approach itself is the
   problem rather than the individual attempt. Say which tickets need nothing.
2. `recurrence-actions.csv` - one row per ticket needing action, columns
   `key,current_state,target_state,owner,action`.

Out of scope: writing or reviewing the code changes themselves, and any change
to severity or priority.

## Input Files

Extract the following files before beginning.

=============== FILE: exports/recurring.csv ===============
key,summary,state,reopen_count,last_reopened,fix_pr,fix_merged,fix_reverted,assignee,severity,priority,first_reported
APP-3011,"Scheduled reports stop sending after a daylight-saving change",Reopened,1,2026-08-04,#4412,2026-07-28,no,,1 - Critical,P1,2026-07-19
APP-3020,"Attachment upload fails over 25 MB",In Progress,4,2026-08-12,"#4180, #4302, #4390, #4455",2026-08-11,no,d.novak,2 - High,P2,2026-05-06
APP-3025,"Scheduled reports never arrive since the clocks changed",New,0,,,,,,2 - High,P2,2026-08-05
APP-3031,"Duplicate rows in the nightly sync",Closed,0,,#4361,2026-07-22,no,s.park,2 - High,P2,2026-07-15
APP-3040,"Filter chips lose state on back navigation",Verified,2,2026-07-30,#4407,2026-07-29,no,l.fontaine,3 - Medium,P3,2026-06-24
APP-3044,"Two-factor prompt skipped for SSO users",New,1,2026-08-06,#4433,2026-08-01,no,,1 - Critical,P1,2026-07-25
APP-3050,"Avatar upload rejects PNGs over 2 MB",Closed,0,,#4290,2026-07-09,no,m.oyelaran,4 - Low,P4,2026-07-02
APP-3055,"Session table grows without bound",Fixed,0,,#4470,2026-08-13,no,m.oyelaran,2 - High,P2,2026-08-06

=============== FILE: exports/engineer-notes.csv ===============
key,note
APP-3011,"came back on 4.18.3 the day after release; the change from #4412 is still on main and its feature flag is still enabled in production; original assignee moved teams 2026-08-01"
APP-3020,"fourth attempt; each fix handles one more upload path; nobody has looked at why the size check lives in four places"
APP-3025,"filed by support after a merchant complained; wording differs but the symptom, the release and the affected schedule are the same as APP-3011"
APP-3031,"customer comment 2026-08-09: 'still seeing duplicates on 4.18.3'; no state change since the close on 2026-07-22"
APP-3040,"both earlier failures were the shared test bed pointing at a stale build; confirmed twice on 4.18.3 since, waiting on the release close"
APP-3044,"was moved back to the top of the incoming queue by the board sweep on 2026-08-08; the sweep clears the assignee field"
APP-3055,"merged Thursday, waiting on someone to confirm it"
