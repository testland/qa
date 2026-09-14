# Roster generator - two incidents, one proposed patch

Raised by: T. Abara (operations)

## Incidents

| Night of | Site | What happened |
|---|---|---|
| 2026-10-31 | nyc-1 | crew released 05:30 local; day crew due 06:30; one hour uncovered |
| 2026-03-28 | ldn-2 | crew held to 07:30 local; day crew already on the floor for an hour |

Raw generator output for the two nights, with an ordinary night beside them:

```
nightShifts('nyc-1','2026-10-31',1) -> startsAt 2026-11-01T02:30:00.000Z  endsAt 2026-11-01T10:30:00.000Z  paidHours 8
nightShifts('ldn-2','2026-03-28',1) -> startsAt 2026-03-28T22:30:00.000Z  endsAt 2026-03-29T06:30:00.000Z  paidHours 8
nightShifts('blr-3','2026-06-15',1) -> startsAt 2026-06-15T17:00:00.000Z  endsAt 2026-06-16T01:00:00.000Z  paidHours 8
```

## Proposed patch

Anchor the end of the shift to the site's handover time, the same way the start
is already anchored to the site's start time:

```diff
-      endsAt: new Date(startsAt.getTime() + SHIFT_HOURS * 3600000),
+      endsAt: localToInstant(addDays(date, 1) + 'T' + site.handover + ':00', site.zone),
```

One line. Both reported nights come out with the crew released at 06:30 local,
which is the entire complaint. I have deliberately kept the diff to the line
that produces the release instant - the rest of the shift object is
contract-stable, four downstream jobs read it, and I am not widening the blast
radius two days before a roster goes out.

## Alternative, if you would rather not touch the end of the shift

We know which nights these are. Add an hour to `endsAt` on the night the clocks
go back and take an hour off on the night they go forward, keyed on the date.
Four dates a year, one line, and nothing else in the file moves.
