# Roster generator - four incidents, one proposed patch

Raised by: T. Abara (operations)

## Incidents

| Night of | Site | What happened |
|---|---|---|
| 2026-10-31 | nyc-1 | crew released 05:30 local; day crew due 06:30; one hour uncovered |
| 2026-03-28 | ldn-2 | crew held to 07:30 local; day crew already on the floor for an hour |
| 2026-10-03 | lhi-4 | crew held 30 minutes past the handover |
| 2026-04-04 | lhi-4 | crew released 30 minutes before the handover |
| never | blr-3 | nothing, ever |

Raw generator output pulled for the incident nights:

```
nightShifts('nyc-1','2026-10-31',1) -> startsAt 2026-11-01T02:30:00.000Z  endsAt 2026-11-01T10:30:00.000Z  paidHours 8
nightShifts('ldn-2','2026-03-28',1) -> startsAt 2026-03-28T22:30:00.000Z  endsAt 2026-03-29T06:30:00.000Z  paidHours 8
nightShifts('lhi-4','2026-10-03',1) -> startsAt 2026-10-03T12:00:00.000Z  endsAt 2026-10-03T20:00:00.000Z  paidHours 8
nightShifts('lhi-4','2026-04-04',1) -> startsAt 2026-04-04T11:30:00.000Z  endsAt 2026-04-04T19:30:00.000Z  paidHours 8
nightShifts('blr-3','2026-06-15',1) -> startsAt 2026-06-15T17:00:00.000Z  endsAt 2026-06-16T01:00:00.000Z  paidHours 8
```

## Proposed patch

Anchor the end of the shift to the site's handover time, the same way the start
is anchored to the site's start time:

```diff
-      endsAt: new Date(startsAt.getTime() + SHIFT_HOURS * 3600000),
+      endsAt: localToInstant(addDays(date, 1) + 'T' + site.handover + ':00', site.zone),
       paidHours: SHIFT_HOURS,
```

Two lines. I have run it over the four incident nights and every one of them
comes out with the crew released at 06:30 local, which is the whole complaint.
`paidHours` I have left alone deliberately - eight hours is what a night shift
is, it is in the agreement, and if that column starts varying then payroll have
to re-cut every export they have ever produced.

## Alternative if you would rather not touch the end of the shift

We know which nights these are. Add an hour to `endsAt` on the night the clocks
go back and take an hour off on the night they go forward, keyed on the date.
Four dates a year, one line, and nothing else in the file moves.

## Appendix - note from payroll (S. Whitcombe)

For the avoidance of doubt, the export takes the `paidHours` column off the
generated shift verbatim and pays on it. Under clause 14.3 of the enterprise
agreement night crews are paid for time on the floor between the two handovers,
so whatever ends up in that column is what we are asserting they worked.
