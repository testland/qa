# The bot has been deciding our unreproducible reports for us

## Problem Description

Rhea built us a tidy-up job six weeks ago. Every night it takes any ticket that
has sat in Needs Info for seven days with no reply from the reporter, posts a
comment saying so, and closes it with the resolution Cannot Reproduce.

Her numbers were good. She pulled a year of Needs Info tickets - 212 of them -
and found the median reporter replies in 1.2 days and 89% of the replies arrive
inside three days, so seven days is more than generous. The Needs Info column
went from 140 items to eleven and the developers stopped complaining about the
backlog.

Last week the finance team at one of our customers re-reported a double charge
that the bot had closed. Attached are the job, the tickets it has closed, and
the write-up of that escalation.

I need this settled properly. Tell me what the job may and may not do, and
what happens to the tickets it has already closed.

## Output Specification

Produce exactly two files:

1. `needs-info-decision.md` - the answer to Rhea. What the job must stop doing
   and what it may still do, quoting the exact line or lines of the job each
   change replaces. What her 89% figure is measured over and whether it can be
   used for this. Why the tickets the job selected are the ones they are. What
   happens to the closures already made.
2. `reversal-plan.csv` - one row per already-closed ticket that has to move,
   columns `id,current_resolution,target_state,information_source,who_acts_next`.
   `information_source` names where the missing information actually comes
   from, which is not always the reporter.

Out of scope: rewriting the report template, changing team process documents,
and any change to severity or priority values.

## Input Files

Extract the following files before beginning.

=============== FILE: automation/needs_info_bot.py ===============
import requests, os

BASE = os.environ["TRACKER_BASE"]
HEADERS = {"Authorization": os.environ["TRACKER_AUTH"]}
STALE_DAYS = 7


def comment(key, text):
    r = requests.post(f"{BASE}/rest/api/3/issue/{key}/comment",
                      json={"body": text}, headers=HEADERS)
    return r.status_code


def sweep(stale_tickets):
    for t in stale_tickets:
        comment(t["key"], f"No response in {STALE_DAYS} days. Closing as unreproducible.")
        requests.post(f"{BASE}/rest/api/3/issue/{t['key']}/transitions",
                      json={"transition": {"id": "41"},
                            "fields": {"resolution": {"name": "Cannot Reproduce"}}},
                      headers=HEADERS)

=============== FILE: exports/bot-closed.csv ===============
id,title,severity,reporter,reporter_kind,environment,build,attachments,dev_attempt_recorded
QA-2210,"App logs the user out at random",2 - High,support.desk,shared inbox,,,none,"tried for 40 minutes, no repeat"
QA-2214,"Camera permission dialog appears twice on first launch",3 - Medium,f.okafor,person,"iOS 18.1 / iPhone 13 / app 7.4.0",9912,"screen recording, device log","2 physical devices and 3 simulator images at builds 9912 and 9930, dialog appears once"
QA-2219,"Card charged twice when the payment sheet is dismissed",1 - Critical,support.desk,shared inbox,,,none,"none recorded"
QA-2223,"Report export is empty for some users",2 - High,l.fontaine,person,prod,,"video link expired 2026-07-30","no steps left to follow once the video went"
QA-2231,"Checkout suite failure: assert_total_matches",2 - High,ci.pipeline,automation account,,,"link to pipeline run 88214","could not repeat locally"
QA-2236,"Notifications stop after the app is backgrounded overnight",3 - Medium,f.okafor,person,"Android 14 / Pixel 7 / app 7.4.1",10044,"battery stats export","reproduced the setup, waited 8 hours, notifications delivered"
QA-2240,"Search box freezes",3 - Medium,alerts@statuspage,automation account,,,none,"nothing to go on"
QA-2244,"Payout webhook retried 9 times for one event",2 - High,ci.pipeline,automation account,,,"link to pipeline run 89970","could not repeat locally"

=============== FILE: docs/escalation-2219.md ===============
# Escalation review - QA-2219, written 2026-09-08

QA-2219 was filed by support.desk on 2026-07-09 from a customer call, moved to
Needs Info the same day when the developer asked which device and flow were
used, and closed by the job on 2026-07-16 as Cannot Reproduce. Nobody had
attempted a reproduction; the ticket records no attempt.

The customer's finance team re-reported it on 2026-09-03. Between the close and
the re-report, 41 duplicate charges across 9 customers, all refunded.

Two things came out of the review.

First, support.desk is a shared inbox. Nothing routes tracker comments to it and
no agent is assigned to watch it, so a question asked of support.desk is never
seen by a person. Of the 24 tickets the job has closed so far, 17 were filed by
support.desk, ci.pipeline or alerts@statuspage - accounts that cannot answer a
question at all.

Second, the comment the job posts has never appeared on any of the 24 tickets.
The tracker rejects the comment call with a 400 because the body is sent as
plain text where a structured document is required; the job does not look at
the status code and goes on to the transition. So the closures carry no
explanation, and the seven days the job waits are seven days in which nobody
was asked anything.

QA-2231 and QA-2244 are separate. Both were filed by the pipeline and both were
missing the environment and the build - which were sitting in pipeline runs
88214 and 89970 the whole time, along with the runner image and the failing job.
