# "Cannot reproduce" is our second most common outcome

## Problem Description

A quarter of the tickets our developers finish end with "cannot reproduce",
and two of those came back last month as customer escalations. The head of
engineering thinks the developers are not trying; the developers think the
reports are unusable. Both may be right, and the export below is the evidence.

Some of these reports genuinely contain everything a developer needs and still
could not be made to fail - those are a fair outcome and I do not want them
disturbed, because reopening them to look diligent is how we burned the
team's patience last time.

Anything that is going back needs to go back with a specific ask, and it has to
go back on the ticket that already exists - we are not opening a second ticket
to chase the first one.

## Output Specification

Produce exactly two files:

1. `unreproducible-review.md` - per ticket: whether the outcome stands, and if
   it does not, precisely what the report is missing, who can supply it, and
   where the ticket should sit while we wait. Call out separately any ticket
   where the missing information is already recoverable by us rather than from
   the reporter. List the outcomes you are leaving as they are, with one line
   of reasoning each.
2. `information-requests.csv` - one row per ticket going back, columns
   `id,missing_fields,ask_of,target_state,note`.

Out of scope: rewriting the report template, changing team process documents,
and any change to severity or priority values.

## Input Files

Extract the following files before beginning.

=============== FILE: exports/unreproducible.csv ===============
id,title,state,resolution,severity,priority,reporter,environment,build,steps,attachments,dev_note
QA-2210,"App logs the user out at random",Closed,Cannot Reproduce,2 - High,P2,support.desk,,,"3 steps, no timing given",none,"tried for 40 minutes on my machine, no repeat"
QA-2214,"Camera permission dialog appears twice on first launch",Closed,Cannot Reproduce,3 - Medium,P3,f.okafor,"iOS 18.1 / iPhone 13 / app 7.4.0","9912","6 numbered steps incl. fresh install","screen recording, device log","attempted on 2 physical devices and 3 simulator images at build 9912 and 9930, dialog appears once"
QA-2219,"Card charged twice when the payment sheet is dismissed",Open,Cannot Reproduce,1 - Critical,P1,support.desk,,,"none - customer paraphrase only",none,"no way to try this without knowing the device or the flow used"
QA-2223,"Report export is empty for some users",Closed,Cannot Reproduce,2 - High,P2,l.fontaine,"prod",,"see video","video link expired 2026-07-30","no steps left to follow once the video went"
QA-2228,"Sorting by name puts lowercase after uppercase",Closed,Not a Bug,4 - Low,P4,f.okafor,"web 4.18.2 / Chrome 128 / prod","4.18.2","4 steps","screenshot","documented ordering, product confirmed as intended 2026-07-22 with link to spec"
QA-2231,"Checkout suite failure: assert_total_matches",Closed,Cannot Reproduce,2 - High,P2,ci.pipeline,,,"failing assertion and diff pasted from the run","link to pipeline run 88214","could not repeat locally"
QA-2236,"Notifications stop after the app is backgrounded overnight",Closed,Cannot Reproduce,3 - Medium,P3,f.okafor,"Android 14 / Pixel 7 / app 7.4.1","10044","5 steps incl. 8-hour wait","battery stats export","reproduced the setup, waited 8 hours, notifications delivered"
QA-2240,"Search box freezes",Closed,Cannot Reproduce,3 - Medium,P3,support.desk,,,"1 line: it freezes",none,"nothing to go on"
