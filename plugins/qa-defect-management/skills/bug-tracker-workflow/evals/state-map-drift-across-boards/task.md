# One automation, five boards, and a config file full of pasted-in values

## Problem Description

We run one script that moves defects along on five boards: two Jira projects,
a Linear team for the mobile app, and two Azure DevOps projects (Payments was
set up years ago on the Agile template, Platform was created last spring on
Scrum). Everything the script needs to know about each board lives in a config
file that people have added to by pasting values out of the browser.

Since the mobile team reorganised their columns in late July the script has
been failing on and off, and the failures are not all the same shape. Some come
back as errors, one came back as a success and moved a ticket backwards, and
the Payments team says one of their triagers had a change overwritten by the
script with no error at all.

Attached is the config and the run log from the last three weeks. I need to
know which values in that file can stay and which of them were never safe to
write down, and what the script should be asking each board for instead.

## Output Specification

Produce exactly two files:

1. `board-config-review.md` - one section per config entry: whether it stays or
   goes, what goes wrong when it is wrong, and where the script gets the value
   instead. Then a section per line in the run log, saying which config entry
   (or which missing behaviour) produced it - including the entries that
   produced a success and still did the wrong thing.
2. `board-config-fixes.csv` - columns `config_entry,problem,replacement,how_obtained`.

Out of scope: rewriting the script, changing any board's configuration, and
the content of the defect reports themselves.

## Input Files

Extract the following files before beginning.

=============== FILE: config/boards.json ===============
{
  "jira-eng": {
    "base": "https://acme.atlassian.net",
    "project": "ENG",
    "transitions": { "start": "21", "fixed": "31", "close": "41" },
    "description_format": "text"
  },
  "jira-ops": {
    "base": "https://acme.atlassian.net",
    "project": "OPS",
    "transitions": { "start": "21", "fixed": "31", "close": "41" },
    "description_format": "text"
  },
  "linear-mobile": {
    "team": "MOB",
    "states": { "start": "In Progress", "fixed": "In Review", "close": "Done" },
    "lookup_by": "name",
    "priority_for_urgent": 4
  },
  "ado-payments": {
    "org": "https://dev.azure.com/acme",
    "project": "Payments",
    "states": { "start": "Active", "fixed": "Resolved", "close": "Closed" },
    "severity_field": "Microsoft.VSTS.Common.Severity",
    "content_type": "application/json"
  },
  "ado-platform": {
    "org": "https://dev.azure.com/acme",
    "project": "Platform",
    "states": { "start": "Active", "fixed": "Resolved", "close": "Closed" },
    "severity_field": "Microsoft.VSTS.Common.Severity",
    "content_type": "application/json-patch+json"
  },
  "github-web": {
    "repo": "acme/web",
    "close_call": "PATCH /issues/{n} {\"state\": \"closed\"}"
  }
}

=============== FILE: logs/runs.csv ===============
date,board,action,http_status,outcome
2026-07-29,jira-eng,transition,400,"Transition id 31 is not valid for issue ENG-6120 in its current status"
2026-07-30,linear-mobile,transition,200,"issueUpdate reported success:false - no workflow state matched the name 'Done'; the script used the first state returned instead and MOB-884 moved back to Backlog"
2026-08-01,jira-ops,create,400,"description: Operation value must be an Atlassian Document"
2026-08-03,ado-platform,transition,400,"TF401320: The field 'State' contains the value 'Active' which is not in the list of supported values"
2026-08-04,ado-platform,create,400,"The field 'Severity' does not exist on work item type 'Bug' in this project"
2026-08-05,ado-payments,transition,415,"Unsupported Media Type"
2026-08-07,ado-payments,transition,200,"work item 7741 moved to Resolved; a priority change a triager saved 20 seconds earlier is no longer on the item"
2026-08-10,linear-mobile,create,200,"MOB-902 created for a production outage and landed in the queue below routine work"
2026-08-12,github-web,close,200,"issue #3312 closed by the duplicate handler; the closed ticket reads as finished work and the person who reported it asked which release the fix is in"
