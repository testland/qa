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
