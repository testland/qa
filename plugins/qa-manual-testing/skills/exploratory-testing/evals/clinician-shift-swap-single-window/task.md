# One 90-minute window on shift swaps, and we cannot touch live data

## Problem Description

The shift-swap feature in our hospital rostering product is due to be
enabled for the two pilot wards on Monday morning. It lets a nurse offer a
shift and lets a colleague claim it, subject to skill-mix and rest-period
rules that the roster engine enforces.

The ward managers' one fear is a swap that leaves a shift without a
qualified nurse, or that double-books someone who is already rostered
elsewhere. That is a patient-safety issue, not an inconvenience, and it is
the thing that would force us to roll the pilot back.

I have exactly one 90-minute window on Friday with our clinical-domain
tester, Marek, and no second attempt. He is the only person who understands
the skill-mix rules well enough to spot a wrong roster at a glance.

Two hard rules. The staging environment holds a copy of real patient
assignment data, so Marek works only in the synthetic ward W-TEST and never
opens a record outside it. And the mobile app is not part of this pilot -
web only.

I do not want a step-by-step script. Marek is faster than any script I could
write and he will find things I would not have thought to list. What I need
is a bounded assignment he can work from and a write-up I can put in front
of the ward managers on Monday.

## Output Specification

Produce a single file: `docs/qa/shift-swap-friday-window.md`.

It must contain:

1. One stated assignment for the 90-minute window: the area to work, what
   he uses to work it, and what we need to know by the end.
2. The parts of the swap flow in scope, and the parts explicitly excluded
   with a reason.
3. Concrete starting ideas he can pick up and abandon freely - seeds, not
   ordered steps.
4. The structure he records against during the window, arranged so a reader
   can tell apart confirmed-good behaviour, defects, and process problems
   that blocked him.
5. The write-up produced at the end, covering what got covered, what was
   found, what was left untouched, what got in the way, and his own read on
   whether the pilot should go ahead.
6. Who reads that write-up, and by when.

Time available: a single uninterrupted 90-minute window, one tester, no
repeat. Out of scope: the mobile app, any ward other than W-TEST, and the
payroll export that consumes the roster.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/shift-swap-pilot.md ===============
# Shift swap - pilot brief

**Pilot wards:** W-04 (medical), W-09 (surgical). Enabled Monday 06:00.
**Synthetic ward for testing:** W-TEST (mirrors W-04 staffing shape)

## Flow

1. Nurse A opens a rostered shift and marks it "offered".
2. The shift appears in the swap board for colleagues whose profile passes
   the eligibility filter.
3. Nurse B claims it. The roster engine re-validates and either commits the
   swap or rejects it with a reason code.
4. Both nurses and the ward manager get a notification. The manager can
   reverse a committed swap within 12 hours.

## Rules the engine enforces at claim time

- Skill mix: each shift needs at least one nurse with the ward's required
  competency band (W-04 requires band 5+ on every shift).
- Rest period: minimum 11 hours between the end of one shift and the start
  of the next for the same person.
- Weekly hours: a swap must not push anyone above 48 contracted hours in
  the rolling week.
- A shift within 4 hours of its start cannot be offered or claimed.

## Known weak points

- The eligibility filter that builds the swap board runs against a cached
  profile snapshot refreshed every 15 minutes; the claim-time re-validation
  runs against live profiles. The two can disagree.
- Reversal by the manager restores the original assignment but does not
  re-check rest periods.
- Night shifts cross midnight; the rolling-week calculation uses the shift
  start date.
- Two nurses claiming the same offered shift within the same second was
  reported once in a load test and never reproduced.

## Environment

- Staging carries a copy of production assignment data for wards W-01
  through W-12. Only W-TEST is safe to touch.
- W-TEST is seeded with 14 synthetic nurses across bands 3 to 7 and a
  two-week roster.
- Notifications in staging go to a catch-all mailbox, not to devices.
