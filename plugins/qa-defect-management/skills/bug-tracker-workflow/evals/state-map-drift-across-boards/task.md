# We re-sync the board map every night now and it still breaks

## Problem Description

One script moves defects along on four boards: a Jira project, a Linear team for
the mobile app, and two Azure DevOps projects (Payments was set up years ago on
the Agile template, Platform was created last spring on Scrum). Everything the
script needs to know about each board used to live in a file people pasted
values into, which is what broke in July when the mobile team renamed their
columns.

Piotr fixed that properly, or so we thought. A job now runs at 03:00, reads each
board's API, writes the map file, and commits it. His argument was that the July
failures were caused by values going stale, a nightly sync keeps them at most a
day old, and it costs one call per board per day instead of a call on every
transition - which matters, because the mobile board throttled us in June and
that is its own outage.

It is still breaking, and the failures are not all the same shape. Some come
back as errors. Two came back as a success and still did the wrong thing.
Attached are the map as the sync last wrote it and the run log since.

I need to know which values in that file the automation may keep and which of
them were never its to write down at any refresh rate, and what it asks each
board for instead. Piotr's throttling concern is real and has to be answered,
not waved away.

## Output Specification

Produce exactly two files:

1. `board-map-decision.md` - one section per entry in the map: whether it stays
   or goes, what goes wrong when it is wrong, and where the script gets the
   value instead. Then a section per line in the run log saying what produced
   it, including the two that returned 200. Then the answer to Piotr's call
   budget that does not involve a stored copy.
2. `board-map-fixes.csv` - columns `entry,verdict,replacement,how_obtained`.

Out of scope: rewriting the script, changing any board's configuration, and the
content of the defect reports themselves.

## Input Files

Extract the following files before beginning.

=============== FILE: automation/board-map.json ===============
{
  "_synced_at": "2026-08-22T03:00:11Z",
  "jira-eng": {
    "base": "https://acme.atlassian.net",
    "project": "ENG",
    "transitions": { "start": "21", "fixed": "31", "close": "41" },
    "description_format": "text"
  },
  "linear-mobile": {
    "team": "MOB",
    "states": { "start": "In Progress", "fixed": "In Review", "close": "Shipped" },
    "lookup_by": "name",
    "priority_for_urgent": 4
  },
  "ado-payments": {
    "org": "https://dev.azure.com/acme",
    "project": "Payments",
    "states": { "start": "Active", "fixed": "Resolved", "close": "Closed" },
    "severity_field": "Microsoft.VSTS.Common.Severity",
    "update_mode": "replace"
  },
  "ado-platform": {
    "org": "https://dev.azure.com/acme",
    "project": "Platform",
    "states": { "start": "Committed", "fixed": "Committed", "close": "Done" },
    "severity_field": "Microsoft.VSTS.Common.Severity",
    "update_mode": "replace"
  }
}

=============== FILE: logs/runs-since-sync.csv ===============
date_time,board,action,http_status,outcome
2026-08-18 09:14,jira-eng,transition,400,"Transition id 31 is not valid for issue ENG-6120 in its current status (sync ran clean at 03:00 the same morning)"
2026-08-19 11:02,linear-mobile,transition,200,"issueUpdate returned success:false - no workflow state matched the name 'Shipped'; the script used the first state returned instead and MOB-884 moved back to Backlog. The mobile team renamed the column at 10:40 the same morning"
2026-08-20 15:30,ado-payments,transition,200,"work item 7741 moved to Resolved; a priority change a triager saved 20 seconds earlier is no longer on the item"
2026-08-21 08:45,ado-platform,create,400,"The field 'Severity' does not exist on work item type 'Bug' in this project"
2026-08-22 16:20,linear-mobile,create,200,"MOB-902 created for a production outage and landed in the queue below routine work"

=============== FILE: automation/sync-notes.md ===============
# What the 03:00 sync reads, written by Piotr 2026-08-02

Per board, once a night:

- **jira-eng** - `GET /rest/api/3/project/ENG/statuses`, then the transitions
  the workflow scheme lists for the Bug issue type. Written into `transitions`.
- **linear-mobile** - the team's workflow states; the display names are written
  into `states` verbatim.
- **ado-payments / ado-platform** - the states the project's process template
  defines, written into `states`.

Not read by the sync, and still whatever was last pasted: `description_format`,
`lookup_by`, `priority_for_urgent`, `severity_field`, `update_mode`.

Known gap I have not got to: on 2026-08-18 the sync ran clean and the 09:14
transition still failed. I have not worked out why yet.
