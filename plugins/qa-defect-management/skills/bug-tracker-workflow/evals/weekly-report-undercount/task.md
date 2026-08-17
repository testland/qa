# The weekly defect report says the board is clean and the board is not

## Problem Description

Every Monday a scheduled job posts a defect summary to the leadership channel.
Last week it reported fifty open bugs and zero of the top urgency band, and on
that basis the release was signed off. On Wednesday a customer escalation
turned out to be one of six top-band tickets that were open the whole time.

I pulled the board by hand on the same morning the job ran; those counts are
in the export below alongside the report the job produced and the script that
produces it. The job has never errored - it posts a clean report every week
and the person who wrote it has left.

I need to know how every wrong number in that report was produced, and I need
it ordered by how badly each one misled the sign-off, because we have to tell
the leadership channel something specific on Monday.

## Output Specification

Produce exactly two files:

1. `report-audit.md` - each incorrect figure in the posted report, what the
   real figure is, the specific mechanism in the script that produced the wrong
   one, and how badly it misled the reader - ordered worst first. Include any
   defect in the script that has not yet produced a visibly wrong number but
   will. State plainly whether last week's report could have been trusted.
2. `query-fixes.csv` - columns `figure,mechanism,fix,verification`, where
   `verification` is the check that proves the figure is now complete.

Out of scope: redesigning the report format, changing what the leadership
channel receives, and triaging any of the tickets themselves.

## Input Files

Extract the following files before beginning.

=============== FILE: reports/2026-08-10-weekly.md ===============
# Defect summary - week of 2026-08-10

- Open bugs: 50
- Top urgency (P1) open: 0
- Untriaged over 1 business day: 4
- Closed this week: 18

No top-urgency defects outstanding. Release sign-off recommended.

=============== FILE: exports/manual-board-count-2026-08-10.csv ===============
figure,value,note
open_bugs,137,"counted from the board on 2026-08-10 09:15"
p1_open,6,"work items 8821, 8834, 8902, 8915, 8930, 8944"
untriaged_over_1_day,41,""
closed_this_week,18,"matches the report"
area_path_used_by_the_job,"Payments' EU","area path was renamed on 2026-07-20; the apostrophe is part of the name"

=============== FILE: automation/triage_report.py ===============
import requests, os, base64

PAT = os.environ["ADO_PAT"]
AUTH = base64.b64encode(f":{PAT}".encode()).decode()
BASE = "https://dev.azure.com/acme/Payments"
H = {"Authorization": f"Basic {AUTH}", "Content-Type": "application/json"}
AREA = "Payments' EU"


def wiql(query, top=50):
    r = requests.post(f"{BASE}/_apis/wit/wiql?$top={top}&api-version=7.1",
                      json={"query": query}, headers=H)
    if r.status_code != 200:
        return []
    return r.json().get("workItems", [])


def open_bugs():
    return wiql("SELECT [System.Id] FROM WorkItems "
                "WHERE [System.WorkItemType] = 'Bug' "
                "AND [System.State] NOT IN ('Resolved', 'Closed') "
                f"AND [System.AreaPath] = '{AREA}'")


def p1_open():
    return [i for i in open_bugs() if field(i["id"], "Microsoft.VSTS.Common.Priority") == 1]


def field(work_item_id, name):
    r = requests.get(f"https://dev.azure.com/acme/_apis/wit/workitems/{work_item_id}"
                     f"?$expand=all&api-version=7.1", headers=H)
    if r.status_code != 200:
        return None
    return r.json()["fields"].get(name)


if __name__ == "__main__":
    opened = open_bugs()
    print(f"- Open bugs: {len(opened)}")
    print(f"- Top urgency (P1) open: {len(p1_open())}")
