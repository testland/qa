# A token-leak ticket has been sitting in the cosmetic pile for five weeks

## Problem Description

While preparing for a customer security questionnaire I went through the
open backlog and found a ticket about password-reset tokens ending up in
third-party analytics filed under our cosmetic bucket, priority Low, tagged
as a UI issue. It has been open 37 days.

That prompted a wider look. Our tracker has a built-in Priority field and a
separate Severity field, and the board is a mess: some tickets have one filled
and not the other, at least one has both stuffed into the title, and there is a
long-running argument on the team that the two fields should always agree,
which I do not think is right - we deliberately do not drop everything for a
crash that affects two percent of one platform.

I need a classification pass I can defend to the security reviewer and to the
engineers whose tickets I am about to change.

## Output Specification

Produce exactly two files:

1. `classification-review.md` - per ticket that needs a change: what is wrong
   with its current classification, what it should be, and the basis for each
   value separately. Address the "the two fields should always agree" argument
   directly, using tickets from this export as evidence. List the tickets whose
   current values are correct as they stand, including any where the two fields
   deliberately diverge, and say why they must not be adjusted.
2. `reclassification.csv` - one row per field being changed, columns
   `id,field,current_value,proposed_value,basis`. A ticket with two fields
   changing produces two rows.

Out of scope: assignment, scheduling, remediation design, and any state
transition. Do not propose closing anything.

## Input Files

Extract the following files before beginning.

=============== FILE: exports/open-backlog.csv ===============
id,title,labels,priority_field,severity_field,state,assignee,age_days,evidence
WEB-512,"Password reset link is placed in the page URL and forwarded in the Referer header","ui,cosmetic",Low,5 - Cosmetic,Open,,37,"reset tokens found in the analytics vendor's export; tokens valid 30 minutes; any vendor staff with report access can complete a reset"
WEB-519,"Session cookie loses the Secure attribute on the staging-to-prod redirect","backend",High,,Open,d.novak,12,"cookie observed over plain http on the redirect hop; reproduced on 4.18.2"
WEB-523,"Settings page shows 'Sav e' instead of 'Save'","ui,cosmetic",Low,5 - Cosmetic,Open,,20,"screenshot; text only, no functional effect"
WEB-528,"Data export returns rows belonging to other tenants when the filter is cleared","backend,data",Highest,,Assigned,s.park,4,"confirmed on staging with two seeded tenants; 1,400 rows from tenant B in tenant A's export"
WEB-531,"Checkout unavailable for all users in the EU region during peak hours","backend",Low,1 - Critical,Open,m.oyelaran,6,"90 minutes of total outage on the eu cluster 2026-08-11; downgraded to Low because it was reported by an internal user rather than a customer"
WEB-535,"App crashes on launch for Android 9 devices","mobile",Medium,1 - Critical,Assigned,f.okafor,15,"hard crash, no workaround, affects 2.1% of installs; Android 9 is 1.4% of revenue and drops off the support matrix in November"
WEB-540,"[P1][CRITICAL] Audit log missing entries for permission changes","backend",,,Open,,9,"3 permission changes on 2026-08-06 absent from the log; required for the SOC 2 evidence pack"
WEB-546,"Tooltip arrow misaligned by 2px on the billing page","ui,cosmetic",Low,5 - Cosmetic,Open,,44,"screenshot"
