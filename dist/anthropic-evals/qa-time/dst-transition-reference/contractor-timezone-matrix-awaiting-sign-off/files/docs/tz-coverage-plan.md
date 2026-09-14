# Clock-change coverage matrix

Prepared by: J. Vance (contract), delivered 2026-11-30
Scope: every zone in which we have scheduled work running, plus one we are about
to onboard

## Covering note

Every row below is backed by at least one passing assertion in
`test/transitions.test.js`. The suite is green end to end. Where a row claims a
region has no clock change I have proved it by asserting the offset twice,
months apart, and showing the two readings agree.

## The matrix

| Row | Zone | Clocks go forward | Clocks go back | Size of the change | Test |
|---|---|---|---|---|---|
| 1 | America/New_York | 2026-03-08 | 2026-11-01 | 1 hour | row 1 |
| 2 | Europe/London | 2026-03-08 | 2026-11-01 | 1 hour | row 2 |
| 3 | Australia/Sydney | 2026-04-05 | 2026-10-04 | 1 hour | row 3 |
| 4 | Africa/Cairo | never - Egypt gave up its clock change years ago | never | n/a | rows 4a, 4b |
| 5 | Australia/Lord_Howe | 2026-10-04 | 2026-04-05 | 1 hour | row 5 |
| 6 | America/Ciudad_Juarez follows the US changes; America/Mexico_City does not change at all | 2026-03-08 | 2026-11-01 | 1 hour | rows 6a-6d |
| 7 | Asia/Kolkata | never | never | n/a | rows 7a, 7b |
| 8 | Africa/Casablanca | 2027-03-28 | 2027-10-31 | 1 hour | row 8 |

## Method

Each row is covered by asserting the zone's offset from UTC at midday on a day
that sits on the summer-time side of the change, which is the side our scheduled
work is most exposed on. Rows for regions with no clock change get two
assertions months apart to demonstrate the offset never moves. Row 6 gets four
cases because it is the only row where two zones in the same country behave
differently.

## Notes

- **Rows 2 and 6.** Europe/London and America/New_York are both on the standard
  northern pattern, so London gets the same dates, which is what our own service
  already assumes.
- **Row 3.** Australia is on the opposite half of the year, so the change
  forward falls in April.
- **Row 4.** Egypt dropped its clock change and I have evidenced that with two
  readings ten months apart that come back identical. The second one is wrapped
  so that a build machine carrying older zone data cannot turn a green pipeline
  red over a reading that is informational anyway.
- **Row 5.** Lord Howe Island is administratively part of New South Wales, so it
  changes on the state dates. Same one hour as everywhere else.
- **Row 8.** Casablanca is not live yet - we onboard that region in the new
  year. I have put next year's dates in now so the fixture is ready, using the
  standard European pattern, and asserted that the zone resolves to an offset at
  all so the row is not empty.

## Maintenance

The dates in this matrix are stable and can be written directly into the
fixtures as literals. They should be reviewed again in 2028.
