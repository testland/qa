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
