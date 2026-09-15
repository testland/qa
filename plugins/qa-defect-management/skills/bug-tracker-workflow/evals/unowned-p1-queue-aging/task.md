# Time to owner went from six days to four hours and I do not believe it

## Problem Description

Our agreement with engineering is that anything newly reported gets a decision
within one business day: accepted as a real defect with a named owner who has
picked it up, or turned down with a reason. Three weeks ago Dana, who runs
delivery, shipped a rule to enforce it. At 09:00 the rule takes every item in
the incoming queue with an empty assignee and an age over one business day, and
assigns it round-robin to whoever is on the support rota.

Her numbers are what she is presenting on Thursday. Median time to owner has
gone from six days to four hours, and the "past the window with no owner" line
on the queue report has read zero every morning since. She wants to run the same
pass over the forty older items still in the backlog, in one go, before the
steering group meets.

I was pulled into a merchant escalation on Friday for a ticket that has had an
owner for nine days and has never been looked at. Attached are the agreement as
written, this morning's queue, and what actually happened to the items the rule
assigned.

Today is Monday 2026-08-17. `age_business_days` is already computed against it.

## Output Specification

Produce exactly two files:

1. `triage-rule-decision.md` - the answer to Dana. Whether the rule stays and in
   what form, what "time to owner" is now measuring, what the queue report has
   to count instead so that a breach cannot be hidden by a populated field, and
   what to do about the retroactive pass she wants to run over the forty
   backlog items. Then every item in this morning's queue that is past the
   decision window, how far past, what decision is owed and who owes it -
   stating separately, one line each, the items that need nothing.
2. `queue-decisions.csv` - one row per item needing action, columns
   `id,days_over,decision_owed,owner,note`.

Out of scope: writing fixes, estimating effort, and changing any classification
value on items that already have them.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/triage-agreement.md ===============
# Incoming defect agreement - QA and engineering, signed 2026-02-04

> Within one business day of a defect being reported, one of two things is
> recorded on it: it is **accepted**, with a named engineer who has acknowledged
> that they are picking it up, or it is **turned down**, with a stated reason.
> A defect with neither recorded after one business day is a breach and is
> reported as one.

The queue report counts breaches as items whose assignee field is empty and
whose age exceeds one business day.

=============== FILE: exports/incoming-queue.csv ===============
id,title,state,severity,priority,assignee,assignee_source,acknowledged,age_business_days,decision_recorded,customer_impact
BUG-771,"Payments dashboard shows zero balance for all merchant accounts",New,1 - Critical,P1,d.novak,rota rule,no,9,,"reported by 2 merchants via support"
BUG-774,"Refund fails when the original charge was in GBP",Assigned,2 - High,P1,s.park,manual,yes,6,accepted 2026-08-08,"1 merchant"
BUG-780,"Timezone label wrong on the settlement report header",New,3 - Medium,P2,,,no,1,,""
BUG-782,"CSV export column order changes between runs",New,3 - Medium,P3,m.oyelaran,rota rule,no,9,,""
BUG-786,"Bulk payout screen unusable above 2000 rows",Deferred,1 - Critical,P4,p.iyer,manual,yes,34,"deferred 2026-07-01, product sign-off, review at next planning","internal ops team only"
BUG-790,"Webhook signature check rejects valid payloads after key rotation",New,1 - Critical,P1,l.fontaine,rota rule,no,5,,"3 integrators blocked"
BUG-796,"Tooltip truncated on the fee breakdown",New,4 - Low,P4,,,no,1,,""
BUG-799,"Something wrong with the payout schedule",New,,,f.okafor,rota rule,no,10,,"reporter unreachable since filing"
BUG-802,"Settlement report double-counts partial refunds",Assigned,2 - High,P2,m.oyelaran,manual,yes,3,accepted 2026-08-12,""

=============== FILE: exports/rota-assignments.csv ===============
id,assigned_at,assigned_to,acknowledged,what_happened_since
BUG-771,2026-08-06,d.novak,no,"d.novak's leave started 2026-08-06 and runs to 2026-08-24; no activity on the item"
BUG-782,2026-08-06,m.oyelaran,no,"no activity"
BUG-790,2026-08-11,l.fontaine,no,"unassigned by l.fontaine 2026-08-12, reassigned by the rule 2026-08-13, no comment either time"
BUG-799,2026-08-05,f.okafor,no,"reassigned by the rule three times; no comment on any of them"

=============== FILE: docs/rota-rule-outcomes.md ===============
# Three weeks of the rota rule - notes for Thursday, written 2026-08-17

The rule has assigned 31 items since 2026-07-27.

- 19 were unassigned or reassigned within 48 hours. None of the 19 carries a
  comment saying why, on either the item or the rota channel.
- 7 still carry the name the rule wrote and have had no activity since.
- 5 were picked up and worked.

None of the 31 has an acknowledgement recorded. The rule writes the assignee
field; it does not ask anybody anything and nothing replies.

BUG-771 is the merchant escalation. It has carried d.novak's name since 6
August, the day his leave started. Because the assignee field is populated it
has not appeared on the "past the window with no owner" line once in nine days,
and no decision has ever been recorded on it.
