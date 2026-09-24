# Tomas left us seven badge-in checks for the reader swap and then left

## Problem Description

Site security is swapping the badge reader on the lab door on the 14th. Tomas,
who ran security here for nine years, wrote the acceptance checks before he went
and they are the only thing anybody has: seven badge-in attempts, one per
sentence of section 4 of the site policy, expected result for each. He worked
that door every day and his list reads like someone who did.

The installer will run whatever we hand him and then the door is signed off. The
auditor has already asked me one question I could not answer - whether an
escorted person is always written to the review log - and I would rather find
the rest of those questions this week than in the audit.

Tell me whether Tomas's list can go to the installer as it is. If it cannot, I
need to know what is missing and be able to defend the answer to the security
lead, who will ask why seven attempts became more than seven.

Section 4, Tomas's handover list, the exported rule set from the outgoing unit
and last month's door log are attached.

## Output Specification

1. Write `docs/reader-swap-review.md`: whether the handover list goes to the
   installer as it stands, and what it misses.
2. Give the installer the badge-in attempts to perform, each with what it is
   checking and the expected result at the door.
3. Write down anything section 4 does not settle, as a question for the security
   lead rather than an answer you supplied.

Out of scope: badge issuance, the fire-alarm override, and the reader's network
setup.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/lab-access-policy.md ===============
# Lab door access (site policy extract, section 4)

A permanent employee who holds lab clearance may badge into the lab at any hour.

A contractor who holds lab clearance may badge in during core hours, which are
07:00 to 19:00.

A person who does not hold lab clearance may enter only when accompanied by an
escort, and only during core hours.

Every escorted entry is written to the review log. Entries that are not escorted
are not logged separately.

Any entry made outside core hours raises an out-of-hours notification to the site
manager, whoever makes it.

Anyone refused at the door is shown "contact your site manager" on the reader
display.

Escorts are themselves badge holders and badge in on their own credentials; the
reader treats an escorted entry as two entries, and only the escorted person's
entry is subject to this section.

=============== FILE: docs/tomas-handover-list.md ===============
# Badge-in checks for the reader swap

One attempt per sentence of section 4. Seven attempts, one morning at the door.

| # | who | when | expected |
|---|---|---|---|
| 1 | permanent employee with lab clearance | 10:00 | entry |
| 2 | contractor with lab clearance | 10:00 | entry |
| 3 | contractor with lab clearance | 20:30 | refused |
| 4 | unescorted contractor without clearance | 10:00 | refused |
| 5 | escorted contractor without clearance | 10:00 | entry, review log line |
| 6 | escorted permanent employee without clearance | 10:00 | entry, review log line |
| 7 | any refused attempt | 10:00 | display reads "contact your site manager" |

The hour is not a variable for permanent employees - section 4 says they may
badge in at any hour, so attempt 1 at 10:00 covers them however late they come
in. I have kept the list to the kinds of person the policy describes, because
that is how the security lead and the installer will walk the door.

- Tomas

=============== FILE: docs/reader-rule-export.txt ===============
Reader 4-NORTH-LAB - exported rule set (outgoing unit, firmware 2.11)

The unit evaluates four attributes and nothing else. It has no notion of a kind
of person; "contractor with clearance" is not a value it can hold.

  badge.employmentType    PERMANENT | CONTRACTOR
  badge.labClearance      true | false
  clock.coreHours         true between 07:00 and 19:00 local
  door.escortPresent      true when a second valid badge is presented within 20s

Outputs raised per decision:

  door.grant              true | false
  display.message         set to "contact your site manager" when grant = false
  log.reviewEntry         written when grant = true and door.escortPresent = true
  notify.siteManager      raised when grant = true and clock.coreHours = false

The replacement unit takes the same four attributes and raises the same four
outputs. The rule expressions themselves were keyed in by hand in 2019 by a
contractor who has left and are not recoverable from this export, which is why
the policy text is the only specification we have.

=============== FILE: docs/door-log-extract.md ===============
# Door events, 4-NORTH-LAB, August

| when | badge | type | clearance | escort | result | review log | notification |
|---|---|---|---|---|---|---|---|
| 08-04 09:12 | B-2214 | permanent | yes | no | entry | - | - |
| 08-07 23:05 | B-2214 | permanent | yes | no | entry | - | raised |
| 08-11 14:30 | B-7781 | contractor | no | yes | entry | written | - |
| 08-19 21:37 | B-6602 | contractor | yes | yes | entry | written | raised |
| 08-22 20:02 | B-6602 | contractor | yes | no | refused | - | - |
| 08-26 19:44 | B-3390 | permanent | no | yes | refused | - | - |

B-6602 is a maintenance contractor with lab clearance who is called out at night.
The 08-19 entry is the one the site manager queried at the time and nobody could
point at the sentence that authorised it.
