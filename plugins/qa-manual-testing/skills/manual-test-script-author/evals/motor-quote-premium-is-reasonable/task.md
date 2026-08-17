# "Check the premium is reasonable" is not a pass criterion

## Problem Description

`scripts/TC-33-quote.md` is run against the quoting journey before every pricing
release. Its last step asks the tester to check that the premium is reasonable.
In the last four releases, two testers passed a quote that we later found was
eleven per cent out, and one raised a defect against a premium that turned out to
be correct.

The case also does not say what to type. The driver's date of birth in our data
note is written in a form that two people on the team read two different ways,
and the two readings do not price the same. Nobody has ever recorded which
reading they used.

Two further things are unsettled and we do not want them guessed. The expected
premium in the data note was produced under a specific pricing table, and the UAT
environment was moved onto a refreshed table last Tuesday without the release
note saying which one. Until that is confirmed, an exact expected figure is a
number we cannot stand behind.

Finally, the case cannot be run many times in a day against the same vehicle, and
testers who hit that keep raising it as a defect.

## Output Specification

Produce one markdown document at exactly `scripts/TC-33-motor-quote.md`
containing:

1. A rewritten quoting case in which two testers get the same premium and agree
   on whether it passed.
2. Everything that must be true before the first step and every value the tester
   types, taken from the attached files and written so that no field can be
   entered two different ways.
3. For each step, the single thing observed that decides pass or fail, including
   what the tester compares the final premium against.
4. Whatever is needed so the case can be run again the same day.
5. A place to record failures.
6. A short list of what could not be settled from the attached files, each as a
   question for a named owner. Do not close any of them by choosing the more
   likely answer.

Out of scope: automating the case, checking the pricing maths itself, and the
renewal journey.

## Input Files

Extract the following files before beginning.

=============== FILE: scripts/TC-33-quote.md ===============
# TC-33 - Motor quote

1. Open the quote journey.
2. Enter the customer's date of birth.
3. Enter the vehicle registration.
4. Answer the remaining questions.
5. Get a quote.
6. Check the premium is reasonable.

=============== FILE: data/rating-notes.md ===============
# Motor quoting - UAT notes

Journey: https://uat.quote.harrowmutual.example/motor
No login required; the journey is anonymous until the quote is saved.

## Standard test driver

| Field                  | Value                                  |
|------------------------|----------------------------------------|
| Date of birth          | 03/04/1988                             |
| Licence held since     | 2006-08-15                             |
| Licence type           | Full UK                                |
| Occupation             | Graphic designer                       |
| Postcode               | LS6 2AN                                |
| Annual mileage         | 8,000                                  |
| Claims in last 5 years | none                                   |
| Cover                  | Comprehensive, 250 GBP voluntary excess|

The date-of-birth field on the desktop journey is a free-text field; the
mobile journey uses a picker. The note above was copied from a spreadsheet
and no one now remembers which order the two leading numbers were in. Both
readings give a driver aged 38 at today's date, so the age display does not
settle it, and the two readings do not price identically.

## Standard test vehicles

| Registration | Vehicle                  |
|--------------|--------------------------|
| YE19 KLT     | Vauxhall Corsa 1.2 SE    |
| YE19 KLU     | Vauxhall Corsa 1.2 SE    |
| YE19 KLV     | Vauxhall Corsa 1.2 SE    |
| YE19 KLW     | Vauxhall Corsa 1.2 SE    |

A registration may be quoted at most five times in a rolling 24 hours. The
sixth attempt returns "We can't quote online right now" - this is throttling,
not a pricing defect.

## Expected premium

Finance's expected annual premium for the standard driver on YE19 KLT is
742.18 GBP. That figure was produced under pricing table RT-2026-03.

UAT was moved onto a refreshed pricing table on Tuesday. The release note
says only "rate table refresh". The pricing owner is Ravi S. in Actuarial;
he has not yet confirmed which table UAT is now serving, and Finance have
not reissued expected figures.

## Saving a quote

A completed quote gets a reference in the form `HM-Q-XXXXXX`, shown on the
final screen and emailed if an address is supplied. Saved quotes persist for
30 days and are visible to the next tester.
